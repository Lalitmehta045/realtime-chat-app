const express = require('express');
const {
  sendMessageValidation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
  forwardMessage,
} = require('../controllers/messageController');
const { verifyToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

const router = express.Router();

// All message routes are protected
router.use(verifyToken);

// POST /api/messages
router.post('/', upload, sendMessageValidation, sendMessage);

// POST /api/messages/forward
// NOTE: keep before any /:id param routes
router.post('/forward', verifyToken, forwardMessage);

// PUT /api/messages/:id
router.put('/:id', editMessage);

// DELETE /api/messages/:id
router.delete('/:id', deleteMessage);

// POST /api/messages/:id/react
router.post('/:id/react', reactToMessage);

// GET /api/messages/search?conversationId=&q=
router.get('/search', searchMessages);

// GET /api/messages/:conversationId?page=
router.get('/:conversationId', getMessages);

module.exports = router;
