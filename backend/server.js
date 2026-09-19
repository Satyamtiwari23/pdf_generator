const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

require('dotenv').config();

const app = express();

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
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json());


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

    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
);

const User = mongoose.model('User', userSchema);

// ============================================================
// PASSWORD RESET EMAIL
// ============================================================

const mailTransporter = nodemailer.createTransport({
  service: 'gmail',

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD
  }
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

app.post('/api/auth/signup', async (req, res) => {

  try {
    await connectDB();

    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        message: 'User already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(
      password,
      salt
    );

    // Create user
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    await newUser.save();

    // Generate JWT
    const token = jwt.sign(
      {
        id: newUser._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    // Send response
    res.status(201).json({

      token,

      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email
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

app.post('/api/auth/login', async (req, res) => {

  try {

    await connectDB();

    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({
      email: email.toLowerCase()
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1d'
      }
    );

    // Send response
    res.json({

      token,

      user: {
        id: user._id,
        name: user.name,
        email: user.email
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
// FORGOT PASSWORD
// ============================================================

app.post('/api/auth/forgot-password', async (req, res) => {

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

    // Do not reveal whether an account exists
    if (!user) {
      return res.json({
        message:
          'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // Store HASH of token in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;

    // Token expires in 15 minutes
    user.resetPasswordExpires =
      new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    // Your GitHub Pages frontend
    const resetLink =
      `https://satyamtiwari23.github.io/pdf_generator/reset-password.html?token=${resetToken}`;

    await mailTransporter.sendMail({

      from: `"PDFnest" <${process.env.EMAIL_USER}>`,

      to: user.email,

      subject: 'Reset your PDFnest password',

      html: `
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

          <p style="margin-top: 25px;">
            This link will expire in <strong>15 minutes</strong>.
          </p>

          <p>
            If you did not request a password reset, you can safely
            ignore this email.
          </p>

          <hr style="margin-top: 30px;">

          <p style="font-size: 12px; color: #777;">
            PDFnest — All-in-one PDF toolkit
          </p>

        </div>
      `
    });

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

app.post('/api/auth/reset-password', async (req, res) => {

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

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    // Hash token received from email
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

    // Hash new password
    const salt = await bcrypt.genSalt(10);

    user.password = await bcrypt.hash(
      password,
      salt
    );

    // Invalidate reset token
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

});


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


app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'PDFnest backend server is running'
  });
});

module.exports = app;


