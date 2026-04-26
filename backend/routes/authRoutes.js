const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  registerValidation,
  loginValidation,
  register,
  login,
  logout,
  refresh,
  me,
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiter for auth routes - more lenient in development
const isDev = process.env.NODE_ENV === 'development';
const authLimiter = rateLimit({
  windowMs: isDev ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in dev, 15 min in prod
  max: isDev ? 100 : 15, // 100 requests per minute in dev, 15 per 15 min in prod
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDev && req.method === 'GET', // Skip GET requests in dev
});

// Apply rate limiting to all auth routes
router.use(authLimiter);

// POST /api/auth/register
router.post('/register', registerValidation, register);

// POST /api/auth/login
router.post('/login', loginValidation, login);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// GET /api/auth/me (protected)
router.get('/me', verifyToken, me);

module.exports = router;
