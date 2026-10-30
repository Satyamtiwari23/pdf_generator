const express = require('express');

// ============================================================
// MIDDLEWARE
// ============================================================

const allowedOrigins = [
  'https://satyamtiwari23.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
];

require('dotenv').config();

const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));

// ============================================================
// PUBLIC GOOGLE CONFIGURATION
// ============================================================

app.get('/api/config', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId) {
    return res.status(500).json({
      message: 'GOOGLE_CLIENT_ID is not configured on the server'
    });
  }

  res.set('Cache-Control', 'no-store');

  return res.json({
    googleClientId: clientId
  });
});

app.use(express.json({
  limit: '200kb'
}));

// ============================================================
// GOOGLE OAUTH CLIENTS
// ============================================================

// Legacy Google Identity Services token verification
const googleLoginClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// Redirect-based Google OAuth client
const googleRedirectClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_LOGIN_REDIRECT_URI
);

// ============================================================
// MONGODB CONNECTION
// ============================================================

let isMongoConnected = false;

async function connectDB() {
  if (isMongoConnected && mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  isMongoConnected = true;

  console.log('MongoDB Atlas Connected');
}

// ============================================================
// AUTH RATE LIMITER
// ============================================================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// ============================================================
// USER MODEL
// ============================================================

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    profilePicture: {
      type: String,
      default: null
    },

    lastLoginAt: {
      type: Date,
      default: null
    },

    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);

// ============================================================
// GOOGLE OAUTH STATE AND TICKET MODELS
// ============================================================

const oauthStateSchema = new mongoose.Schema({
  stateHash: {
    type: String,
    required: true,
    unique: true
  },

  mode: {
    type: String,
    enum: ['login', 'signup'],
    required: true
  },

  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  }

}, {
  timestamps: true
});

const OAuthState = mongoose.model(
  'OAuthState',
  oauthStateSchema
);

const oauthTicketSchema = new mongoose.Schema({
  ticketHash: {
    type: String,
    required: true,
    unique: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  expiresAt: {
    type: Date,
    required: true,
    expires: 0
  }

}, {
  timestamps: true
});

const OAuthTicket = mongoose.model(
  'OAuthTicket',
  oauthTicketSchema
);

// ============================================================
// OAUTH HELPERS
// ============================================================

function sha256(value) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

function getFrontendAuthUrl(mode) {
  const configuredUrl = mode === 'signup'
    ? process.env.FRONTEND_SIGNUP_URL
    : process.env.FRONTEND_LOGIN_URL;

  if (!configuredUrl) {
    throw new Error(
      `FRONTEND_${mode.toUpperCase()}_URL is not configured`
    );
  }

  return configuredUrl;
}

// ============================================================
// GMAIL API
// ============================================================

const googleOAuth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

googleOAuth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN
});

const gmail = google.gmail({
  version: 'v1',
  auth: googleOAuth2Client
});

googleOAuth2Client.getAccessToken()
  .then(() => {
    console.log('GMAIL OAUTH INITIALIZED SUCCESSFULLY');
  })
  .catch((error) => {
    console.error('GMAIL OAUTH INITIALIZATION FAILED:');
    console.error(error.message);
  });

// ============================================================
// JWT AUTHENTICATION MIDDLEWARE
// ============================================================

function authenticateToken(req, res, next) {
  const authHeader = req.header('Authorization');

  if (!authHeader) {
    return res.status(401).json({
      message: 'No token, authorization denied'
    });
  }

  try {
    const token = authHeader.replace('Bearer ', '');

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Token is not valid'
    });
  }
}

// ============================================================
// SIGNUP
// ============================================================

app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    await connectDB();

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    const passwordValid =
      typeof password === 'string' &&
      password.length >= 8 &&
      password.length <= 64 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9\s]/.test(password);

    if (!passwordValid) {
      return res.status(400).json({
        message:
          'Password must be 8-64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    res.status(201).json({
      token,

      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profilePicture: newUser.profilePicture || null
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// ============================================================
// LOGIN
// ============================================================

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    await connectDB();

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    res.json({
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || null
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// ============================================================
// LEGACY GOOGLE LOGIN / SIGNUP
// ============================================================

app.post('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        message: 'Google credential is required'
      });
    }

    let payload;

    try {
      const ticket = await googleLoginClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      payload = ticket.getPayload();

    } catch (error) {
      return res.status(401).json({
        message: 'Google authentication failed'
      });
    }

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return res.status(401).json({
        message: 'Google account could not be verified'
      });
    }

    await connectDB();

    const email = payload.email.toLowerCase().trim();

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto
        .randomBytes(32)
        .toString('hex');

      const hashedPassword = await bcrypt.hash(
        randomPassword,
        10
      );

      user = new User({
        name: payload.name || email.split('@')[0],
        email,
        password: hashedPassword,
        profilePicture: payload.picture || null,
        lastLoginAt: new Date()
      });

      await user.save();

    } else {
      user.lastLoginAt = new Date();

      if (!user.profilePicture && payload.picture) {
        user.profilePicture = payload.picture;
      }

      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    return res.json({
      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture || null
      }
    });

  } catch (error) {
    console.error('Google authentication error:', error);

    return res.status(500).json({
      message: 'Server error during Google authentication'
    });
  }
});

// ============================================================
// GOOGLE OAUTH REDIRECT FLOW
// ============================================================

// Start Google OAuth
app.get('/api/auth/google', authLimiter, async (req, res) => {
  try {
    const mode = req.query.mode === 'signup'
      ? 'signup'
      : 'login';

    if (
      !process.env.GOOGLE_CLIENT_ID ||
      !process.env.GOOGLE_CLIENT_SECRET ||
      !process.env.GOOGLE_LOGIN_REDIRECT_URI
    ) {
      return res.status(503).send(
        'Google OAuth is not fully configured on the server.'
      );
    }

    await connectDB();

    const rawState = crypto
      .randomBytes(32)
      .toString('hex');

    await OAuthState.create({
      stateHash: sha256(rawState),
      mode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    const authorizationUrl =
      googleRedirectClient.generateAuthUrl({
        access_type: 'online',
        prompt: 'select_account',
        scope: ['openid', 'email', 'profile'],
        state: rawState
      });

    return res.redirect(302, authorizationUrl);

  } catch (error) {
    console.error('Google OAuth start error:', error);

    return res.status(500).send(
      'Unable to start Google authentication. Please try again.'
    );
  }
});

// ============================================================
// GOOGLE OAUTH CALLBACK
// ============================================================

app.get('/api/auth/google/callback', async (req, res) => {
  let frontendUrl =
    process.env.FRONTEND_LOGIN_URL ||
    'https://satyamtiwari23.github.io/pdf_generator/login.html';

  try {
    const rawState =
      typeof req.query.state === 'string'
        ? req.query.state
        : '';

    if (!rawState) {
      throw new Error('Missing OAuth state');
    }

    await connectDB();

    const stateRecord = await OAuthState.findOneAndDelete({
      stateHash: sha256(rawState),
      expiresAt: {
        $gt: new Date()
      }
    });

    if (!stateRecord) {
      throw new Error('OAuth state is invalid or expired');
    }

    frontendUrl = getFrontendAuthUrl(stateRecord.mode);

    if (req.query.error) {
      const deniedUrl = new URL(frontendUrl);

      deniedUrl.searchParams.set(
        'google_error',
        'access_denied'
      );

      return res.redirect(302, deniedUrl.toString());
    }

    const code =
      typeof req.query.code === 'string'
        ? req.query.code
        : '';

    if (!code) {
      throw new Error(
        'Google did not return an authorization code'
      );
    }

    const { tokens } = await googleRedirectClient.getToken(code);

    if (!tokens.id_token) {
      throw new Error('Google did not return an ID token');
    }

    const ticket = await googleLoginClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      throw new Error('Google account could not be verified');
    }

    const email = payload.email.toLowerCase().trim();

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto
        .randomBytes(32)
        .toString('hex');

      const hashedPassword = await bcrypt.hash(
        randomPassword,
        10
      );

      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        password: hashedPassword,
        profilePicture: payload.picture || null,
        lastLoginAt: new Date()
      });

    } else {
      user.lastLoginAt = new Date();

      if (!user.profilePicture && payload.picture) {
        user.profilePicture = payload.picture;
      }

      await user.save();
    }

    // Generate short-lived one-time ticket
    const rawTicket = crypto
      .randomBytes(32)
      .toString('hex');

    await OAuthTicket.create({
      ticketHash: sha256(rawTicket),
      userId: user._id,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000)
    });

    const successUrl = new URL(frontendUrl);

    successUrl.searchParams.set(
      'google_ticket',
      rawTicket
    );

    return res.redirect(302, successUrl.toString());

  } catch (error) {
    console.error('Google OAuth callback error:', error);

    try {
      const failureUrl = new URL(frontendUrl);

      failureUrl.searchParams.set(
        'google_error',
        'authentication_failed'
      );

      return res.redirect(302, failureUrl.toString());

    } catch (_) {
      return res.status(500).send(
        'Google authentication failed. Please return to PDFnest and try again.'
      );
    }
  }
});

// ============================================================
// GOOGLE TICKET EXCHANGE
// ============================================================

app.post(
  '/api/auth/google/exchange',
  authLimiter,
  async (req, res) => {
    try {
      const { ticket } = req.body || {};

      if (
        typeof ticket !== 'string' ||
        !/^[a-f0-9]{64}$/.test(ticket)
      ) {
        return res.status(400).json({
          message: 'A valid Google login ticket is required.'
        });
      }

      await connectDB();

      const ticketRecord = await OAuthTicket.findOneAndDelete({
        ticketHash: sha256(ticket),
        expiresAt: {
          $gt: new Date()
        }
      });

      if (!ticketRecord) {
        return res.status(401).json({
          message:
            'Google login ticket is invalid, expired, or already used. Please try again.'
        });
      }

      const user = await User.findById(ticketRecord.userId);

      if (!user) {
        return res.status(401).json({
          message: 'The Google account no longer exists.'
        });
      }

      const token = jwt.sign(
        {
          id: user._id
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '1d'
        }
      );

      return res.json({
        token,

        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePicture: user.profilePicture || null
        }
      });

    } catch (error) {
      console.error('Google ticket exchange error:', error);

      return res.status(500).json({
        message: 'Unable to complete Google authentication.'
      });
    }
  }
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    await connectDB();

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail
    });

    if (!user) {
      return res.json({
        message:
          'If an account exists with this email, a password reset link has been sent.'
      });
    }

    const resetToken = crypto
      .randomBytes(32)
      .toString('hex');

    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;

    user.resetPasswordExpires =
      new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    const resetLink =
      `https://satyamtiwari23.github.io/pdf_generator/reset-password.html?token=${resetToken}`;

    const emailContent = [
      `From: PDFnest <${process.env.GMAIL_USER}>`,
      `To: ${user.email}`,
      `Subject: Reset your PDFnest password`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      `
  <div style="
    font-family: Arial, sans-serif;
    max-width: 600px;
    margin: auto;
    padding: 30px;
    color: #222;
  ">

    <h2 style="margin-bottom: 10px;">
      Reset your PDFnest password
    </h2>

    <p>
      Hi ${user.name},
    </p>

    <p>
      We received a request to reset your PDFnest password.
    </p>

    <p>
      Click the button below to create a new password.
    </p>

    <p>
      <a
        href="${resetLink}"
        style="
          display: inline-block;
          padding: 12px 22px;
          background: linear-gradient(90deg, #6d3df5, #9b35e8);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
        "
      >
        Reset Password
      </a>
    </p>

    <p style="margin-top: 25px;">
      This link will expire in <strong>15 minutes</strong>.
    </p>

    <p>
      If you did not request a password reset, you can safely ignore this email.
    </p>

    <hr style="margin-top: 30px;">

    <p style="font-size: 12px; color: #777;">
      PDFnest — All-in-one PDF toolkit
    </p>

  </div>
  `
    ].join('\r\n');

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    console.log(
      'Gmail reset email sent successfully:',
      result.data.id
    );

    res.json({
      message:
        'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error) {
    console.error('Forgot password error:', error);

    res.status(500).json({
      message: 'Unable to process password reset request'
    });
  }
});

// ============================================================
// RESET PASSWORD
// ============================================================

app.post(
  '/api/auth/reset-password',
  authLimiter,
  async (req, res) => {
    try {
      await connectDB();

      const {
        token,
        password
      } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          message: 'Token and password are required'
        });
      }

      const passwordValid =
        typeof password === 'string' &&
        password.length >= 8 &&
        password.length <= 64 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9\s]/.test(password);

      if (!passwordValid) {
        return res.status(400).json({
          message:
            'Password must be 8-64 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
        });
      }

      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          $gt: new Date()
        }
      });

      if (!user) {
        return res.status(400).json({
          message:
            'Password reset link is invalid or has expired'
        });
      }

      const salt = await bcrypt.genSalt(10);

      user.password = await bcrypt.hash(
        password,
        salt
      );

      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      await user.save();

      res.json({
        message:
          'Password reset successfully. You can now log in.'
      });

    } catch (error) {
      console.error('Reset password error:', error);

      res.status(500).json({
        message: 'Unable to reset password'
      });
    }
  }
);

// ============================================================
// VERIFY LOGGED-IN USER
// ============================================================

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    await connectDB();

    const user = await User
      .findById(req.user.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json({
      user
    });

  } catch (error) {
    console.error('Auth verification error:', error);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

// ============================================================
// UPDATE PROFILE PICTURE
// ============================================================

app.put(
  '/api/auth/profile-picture',
  authenticateToken,
  async (req, res) => {
    try {
      await connectDB();

      const { profilePicture } = req.body;

      if (profilePicture === null || profilePicture === '') {
        const user = await User.findByIdAndUpdate(
          req.user.id,
          {
            profilePicture: null
          },
          {
            new: true
          }
        ).select('-password');

        return res.json({
          message: 'Profile picture removed',
          user
        });
      }

      if (
        typeof profilePicture !== 'string' ||
        !profilePicture.startsWith('data:image/webp;base64,')
      ) {
        return res.status(400).json({
          message: 'Invalid profile picture format'
        });
      }

      if (profilePicture.length > 100000) {
        return res.status(400).json({
          message: 'Profile picture is too large'
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        {
          profilePicture
        },
        {
          new: true
        }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          message: 'User not found'
        });
      }

      res.json({
        message: 'Profile picture updated successfully',
        user
      });

    } catch (error) {
      console.error('Profile picture update error:', error);

      res.status(500).json({
        message: 'Unable to update profile picture'
      });
    }
  }
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'PDFnest backend server is running'
  });
});

// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 5050;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;