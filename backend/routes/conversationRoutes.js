const express = require('express');
const {
  createGroupValidation,
  getConversations,
  createConversation,
  createGroup,
  updateConversation,
  leaveConversation,
} = require('../controllers/conversationController');
const { verifyToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All conversation routes are protected
router.use(verifyToken);

// GET /api/conversations
router.get('/', getConversations);

// POST /api/conversations (create DM)
router.post('/', createConversation);

// POST /api/conversations/group
router.post('/group', upload, createGroupValidation, createGroup);

// PUT /api/conversations/:id (update group)
router.put('/:id', upload, updateConversation);

// DELETE /api/conversations/:id/leave
router.delete('/:id/leave', leaveConversation);

module.exports = router;
