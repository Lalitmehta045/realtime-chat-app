const { validationResult, body, query } = require('express-validator');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');

// Validation rules
const sendMessageValidation = [
  body('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required'),
  body('text')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Text cannot be empty'),
];

// Get messages for a conversation
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized to view this conversation' });
    }

    // Get messages, excluding ones deleted for this user
    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
    })
      .populate('senderId', 'username profilePicture')
      .populate('reactions.userId', 'username profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const totalMessages = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: userId },
    });

    const hasMore = skip + messages.length < totalMessages;

    // Return in ascending order (oldest first) for display
    res.json({
      messages: messages.reverse(),
      hasMore,
      page,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send new message
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { conversationId, text, replyTo } = req.body;
    const userId = req.user._id;

    if (typeof replyTo === 'string') {
      try {
        replyTo = JSON.parse(replyTo);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid replyTo payload' });
      }
    }

    if (replyTo) {
      const hasRequired =
        replyTo.messageId &&
        replyTo.senderId &&
        replyTo.senderName;

      if (!hasRequired) {
        return res.status(400).json({
          message: 'replyTo.messageId, replyTo.senderId, and replyTo.senderName are required',
        });
      }
    }

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized to send messages here' });
    }

    let imageUrl = null;
    let messageType = 'text';

    // Handle image upload
    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, 'chat/messages');
      messageType = text ? 'mixed' : 'image';
    }

    // At least one of text or image required
    if (!text && !imageUrl) {
      return res.status(400).json({ message: 'Message must contain text or image' });
    }

    // Create message
    const message = await Message.create({
      conversationId,
      senderId: userId,
      text: text || null,
      image: imageUrl,
      messageType,
      replyTo: replyTo
        ? {
            messageId: replyTo.messageId,
            senderId: replyTo.senderId,
            senderName: replyTo.senderName,
            text: replyTo.text || null,
            image: replyTo.image || null,
            messageType: replyTo.messageType || 'text',
          }
        : null,
    });

    // Update conversation lastMessage and timestamp
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
    });

    // Reset unread for sender, increment for others
    const otherParticipants = conversation.participants.filter(
      p => p.toString() !== userId.toString()
    );

    const unreadUpdate = {};
    unreadUpdate[`unreadCount.${userId}`] = 0;
    otherParticipants.forEach(p => {
      unreadUpdate[`unreadCount.${p}`] = (conversation.unreadCount?.get?.(p.toString()) || 0) + 1;
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      $set: unreadUpdate,
    });

    // Populate and emit
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'username profilePicture');

    // Emit to conversation room via Socket.io
    const io = req.app.get('io');
    io.to(conversationId).emit('new_message', populatedMessage);

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Can only edit your own messages' });
    }

    // Check if deleted
    if (message.isDeleted) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }

    // Check edit window (5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      return res.status(400).json({ message: 'Edit window expired (5 minutes)' });
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await Message.findById(id)
      .populate('senderId', 'username profilePicture');

    // Emit via socket
    const io = req.app.get('io');
    io.to(message.conversationId.toString()).emit('message_edited', populatedMessage);

    res.json({ message: populatedMessage });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFor } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is a participant in the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if user is sender for 'everyone' delete
    const isSender = message.senderId.toString() === userId.toString();

    if (deleteFor === 'everyone') {
      if (!isSender) {
        return res.status(403).json({ message: 'Only sender can delete for everyone' });
      }

      // Soft delete
      message.isDeleted = true;
      message.text = null;
      message.image = null;
      message.deletedAt = new Date();
      await message.save();

      // Emit via socket
      const io = req.app.get('io');
      io.to(message.conversationId.toString()).emit('message_deleted', {
        messageId: id,
        deleteFor: 'everyone',
      });
    } else {
      // Delete for me only - add to deletedFor array
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }

      // Emit via socket (only to the user who deleted)
      const io = req.app.get('io');
      const userSocket = Array.from(io.sockets.sockets.values()).find(
        s => s.userId === userId.toString()
      );
      if (userSocket) {
        userSocket.emit('message_deleted', {
          messageId: id,
          deleteFor: 'me',
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add/remove reaction
const reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if user already reacted with this emoji
    const existingReactionIndex = message.reactions.findIndex(
      r => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex !== -1) {
      const existingReaction = message.reactions[existingReactionIndex];
      
      if (existingReaction.emoji === emoji) {
        // Remove reaction (toggle off)
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Replace with new emoji
        existingReaction.emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Emit via socket
    const io = req.app.get('io');
    io.to(message.conversationId.toString()).emit('reaction_updated', {
      messageId: id,
      reactions: message.reactions,
    });

    res.json({ reactions: message.reactions });
  } catch (error) {
    console.error('React to message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Search messages
const searchMessages = async (req, res) => {
  try {
    const { conversationId, q } = req.query;
    const userId = req.user._id;

    if (!conversationId || !q) {
      return res.status(400).json({ message: 'Conversation ID and search query required' });
    }

    // Verify user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: 'Not authorized to search this conversation' });
    }

    // Text search using MongoDB text index
    const messages = await Message.find({
      conversationId,
      $text: { $search: q },
      deletedFor: { $ne: userId },
    })
      .populate('senderId', 'username profilePicture')
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);

    res.json({ messages });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forward a message to up to 5 conversations
const forwardMessage = async (req, res) => {
  try {
    const { messageId, conversationIds } = req.body;
    const senderId = req.user._id;

    // ── Validation ──────────────────────────────
    if (!messageId || !conversationIds?.length) {
      return res.status(400).json({
        error: 'messageId and conversationIds required',
      });
    }

    if (conversationIds.length > 5) {
      return res.status(400).json({
        error: 'Cannot forward to more than 5 conversations',
      });
    }

    // ── Find original message ────────────────────
    const original = await Message.findById(messageId);
    if (!original) {
      return res.status(404).json({
        error: 'Original message not found',
      });
    }
    if (original.isDeleted) {
      return res.status(400).json({
        error: 'Cannot forward a deleted message',
      });
    }

    // ── Verify sender is participant of source ───
    const sourceConv = await Conversation.findOne({
      _id: original.conversationId,
      participants: senderId,
    });
    if (!sourceConv) {
      return res.status(403).json({
        error: 'Not a participant of source conversation',
      });
    }

    // ── Verify sender is participant of each target
    const targetConvs = await Conversation.find({
      _id: { $in: conversationIds },
      participants: senderId,
    });

    if (targetConvs.length !== conversationIds.length) {
      return res.status(403).json({
        error: 'Not a participant in one or more target conversations',
      });
    }

    // ── Create forwarded copies ──────────────────
    const io = req.app.get('io');
    const createdMessages = [];

    for (const conv of targetConvs) {
      const forwarded = await Message.create({
        conversationId: conv._id,
        senderId,
        text: original.text || null,
        image: original.image || null,
        messageType: original.messageType,
        isForwarded: true,
        forwardedFrom: original._id,
      });

      // Update conversation lastMessage + updatedAt
      await Conversation.findByIdAndUpdate(conv._id, {
        lastMessage: forwarded._id,
        updatedAt: new Date(),
      });

      // Increment unreadCount for all participants except the sender
      const others = conv.participants.filter(
        p => p.toString() !== senderId.toString()
      );

      const inc = {};
      others.forEach(participantId => {
        inc[`unreadCount.${participantId}`] = 1;
      });

      await Conversation.findByIdAndUpdate(conv._id, {
        $set: { [`unreadCount.${senderId}`]: 0 },
        ...(Object.keys(inc).length ? { $inc: inc } : {}),
      });

      // Populate senderId before emitting
      const populated = await Message.findById(forwarded._id).populate(
        'senderId',
        'username profilePicture'
      );

      // Emit to conversation room via Socket.io
      io.to(conv._id.toString()).emit('new_message', populated);

      createdMessages.push(populated);
    }

    return res.status(201).json({
      success: true,
      forwardedCount: createdMessages.length,
      messages: createdMessages,
    });
  } catch (err) {
    console.error('forwardMessage error:', err);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};

module.exports = {
  sendMessageValidation,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  reactToMessage,
  searchMessages,
  forwardMessage,
};
