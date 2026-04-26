const express = require('express');
const {
  updateProfileValidation,
  searchUsers,
  getUserProfile,
  updateProfile,
  updateAvatar,
  updatePassword,
} = require('../controllers/userController');
const { verifyToken } = require('../middleware/authMiddleware');
const { upload, uploadAvatar } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All user routes are protected
router.use(verifyToken);

// GET /api/users/search?q=
router.get('/search', searchUsers);

// GET /api/users/:id
router.get('/:id', getUserProfile);

// PUT /api/users/profile
router.put('/profile', uploadAvatar, updateProfileValidation, updateProfile);

// PUT /api/users/avatar
router.put('/avatar', upload, updateAvatar);

// PUT /api/users/password
router.put('/password', updatePassword);

module.exports = router;
