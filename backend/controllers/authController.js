const { validationResult, body } = require('express-validator');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  setRefreshCookie,
} = require('../utils/generateTokens');

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Register new user
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    // Check for duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check for duplicate username
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
    });

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Hash and save refresh token
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Set refresh cookie
    setRefreshCookie(res, refreshToken);

    res.status(201).json({
      user,
      accessToken,
    });
  } catch (error) {
    console.error('Register error:', error.message);
    console.error('Stack:', error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    console.log('Login attempt:', { email, passwordLength: password?.length });

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('User found:', { id: user._id, hasPassword: !!user.password, passwordLength: user.password?.length });

    // Check password
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Hash and save refresh token
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Set refresh cookie
    setRefreshCookie(res, refreshToken);

    // Return user without sensitive fields
    const userResponse = await User.findById(user._id);

    res.json({
      user: userResponse,
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Find user by hashed refresh token and clear it
      const hashedToken = hashToken(refreshToken);
      const user = await User.findOne({ refreshToken: hashedToken });
      
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    // Clear cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Refresh tokens
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    // Verify refresh token
    const decoded = require('jsonwebtoken').verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    // Find user and check hashed token
    const hashedToken = hashToken(refreshToken);
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: hashedToken,
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Generate new tokens (token rotation)
    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    // Hash and save new refresh token
    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    // Set new refresh cookie
    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    console.error('Refresh error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user
const me = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerValidation,
  loginValidation,
  register,
  login,
  logout,
  refresh,
  me,
};
