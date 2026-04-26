const { validationResult, body } = require('express-validator');
const User = require('../models/User');
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');

// Validation rules
const updateProfileValidation = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 150 })
    .withMessage('Bio cannot exceed 150 characters'),
];

// Search users by username
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }

    // Case-insensitive regex search
    const searchRegex = new RegExp(q.trim(), 'i');

    const users = await User.find({
      username: searchRegex,
      _id: { $ne: currentUserId }, // Exclude current user
    })
      .select('username profilePicture isOnline')
      .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile by ID
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -refreshToken');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, bio } = req.body;
    const userId = req.user._id;

    // Check if username is already taken (if changing username)
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (bio !== undefined) updateData.bio = bio;

    // Handle avatar upload if file provided
    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.buffer, 'chat/avatars');
      updateData.profilePicture = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error.message);
    console.error('Stack:', error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

// Upload/update avatar
const updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image provided' });
    }

    const userId = req.user._id;

    // Upload to Cloudinary
    const imageUrl = await uploadToCloudinary(req.file.buffer, 'chat/avatars');

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { profilePicture: imageUrl },
      { new: true }
    ).select('-password -refreshToken');

    res.json({ user });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update password
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    // Get user with password field
    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  updateProfileValidation,
  searchUsers,
  getUserProfile,
  updateProfile,
  updateAvatar,
  updatePassword,
};
