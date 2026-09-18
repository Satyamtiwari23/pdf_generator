const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();


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
    }
  },
  {
    timestamps: true
  }
);

const User = mongoose.model('User', userSchema);


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
// VERIFY LOGGED-IN USER
// ============================================================

app.get('/api/auth/me', authenticateToken, async (req, res) => {

  try {

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
// SERVE FRONTEND
// ============================================================

app.use(
  express.static(
    path.join(__dirname, '../frontend')
  )
);


// ============================================================
// ROOT ROUTE
// ============================================================

app.get('/', (req, res) => {

  res.sendFile(
    path.join(__dirname, '../frontend/index.html')
  );

});


// ============================================================
// MONGODB ATLAS CONNECTION
// ============================================================

mongoose.connect(process.env.MONGO_URI)

  .then(() => {
    console.log('MongoDB Atlas Connected');
  })

  .catch((error) => {

    console.error(
      'MongoDB connection error:',
      error.message
    );

  });


module.exports = app;