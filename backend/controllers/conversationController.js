const { validationResult, body } = require('express-validator');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Message = require('../models/Message');
const { uploadToCloudinary } = require('../middleware/uploadMiddleware');

// Validation rules
const createGroupValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required'),
  // Note: participants is sent as JSON string via FormData, parsed in controller
];

// Get all conversations for current user
const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const conversations = await Conversation.find({
      participants: userId,
    })
      .populate('participants', 'username profilePicture isOnline')
      .populate({
        path: 'lastMessage',
        select: 'text image createdAt senderId',
        populate: {
          path: 'senderId',
          select: 'username profilePicture'
        }
      })
      .populate('admin', 'username')
      .sort({ updatedAt: -1 });

    // Add unreadCount for current user to each conversation
    const conversationsWithUnread = conversations.map((conv) => {
      const convObj = conv.toObject();
      convObj.unreadCount = conv.unreadCount?.get?.(userId.toString()) || 0;
      return convObj;
    });

    res.json({ conversations: conversationsWithUnread });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create or get existing DM conversation
const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const currentUserId = req.user._id;

    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }

    // Check if user exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if DM already exists between these two users
    const existingConversation = await Conversation.findOne({
      isGroup: false,
      participants: {
        $all: [currentUserId, participantId],
        $size: 2,
      },
    })
      .populate('participants', 'username profilePicture isOnline')
      .populate('lastMessage', 'text image createdAt');

    if (existingConversation) {
      const convObj = existingConversation.toObject();
      convObj.unreadCount = existingConversation.unreadCount?.get?.(currentUserId.toString()) || 0;
      return res.json({ conversation: convObj });
    }

    // Create new conversation
    const conversation = await Conversation.create({
      isGroup: false,
      participants: [currentUserId, participantId],
      unreadCount: new Map(),
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username profilePicture isOnline')
      .populate('lastMessage', 'text image createdAt');

    const convObj = populatedConversation.toObject();
    convObj.unreadCount = 0;

    res.status(201).json({ conversation: convObj });
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create group conversation
const createGroup = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name } = req.body;
    const currentUserId = req.user._id;

    // Parse participants from JSON string (FormData sends as string)
    let participants = req.body.participants;
    if (typeof participants === 'string') {
      try {
        participants = JSON.parse(participants);
      } catch (e) {
        return res.status(400).json({ message: 'Invalid participants format' });
      }
    }

    // Include current user in participants if not already included
    const allParticipants = [...new Set([...participants, currentUserId.toString()])];

    // Validate minimum participants (need at least 3 total including creator for a group)
    if (allParticipants.length < 2) {
      return res.status(400).json({ message: 'At least one other participant is required' });
    }

    // Validate all participant IDs exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      return res.status(400).json({ message: 'Some participants were not found' });
    }

    let groupImage = null;
    if (req.file) {
      groupImage = await uploadToCloudinary(req.file.buffer, 'chat/groups');
    }

    const conversation = await Conversation.create({
      isGroup: true,
      name,
      groupImage,
      admin: currentUserId,
      participants: allParticipants,
      unreadCount: new Map(),
    });

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('participants', 'username profilePicture isOnline')
      .populate('admin', 'username');

    res.status(201).json({ conversation: populatedConversation });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update group conversation (admin only)
const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, addUsers, removeUsers } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (!conversation.isGroup) {
      return res.status(400).json({ message: 'Cannot update non-group conversation' });
    }

    // Check if user is admin
    if (conversation.admin.toString() !== currentUserId.toString()) {
      return res.status(403).json({ message: 'Only admin can update group' });
    }

    const updateData = {};

    // Update name
    if (name !== undefined) {
      updateData.name = name;
    }

    // Update group image
    if (req.file) {
      updateData.groupImage = await uploadToCloudinary(req.file.buffer, 'chat/groups');
    }

    // Add users
    if (addUsers && addUsers.length > 0) {
      const newParticipants = [...conversation.participants.map(p => p.toString()), ...addUsers];
      updateData.participants = [...new Set(newParticipants)];
    }

    // Remove users
    if (removeUsers && removeUsers.length > 0) {
      const updatedParticipants = conversation.participants.filter(
        p => !removeUsers.includes(p.toString())
      );
      updateData.participants = updatedParticipants;
    }

    const updatedConversation = await Conversation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('participants', 'username profilePicture isOnline')
      .populate('admin', 'username')
      .populate('lastMessage', 'text image createdAt');

    res.json({ conversation: updatedConversation });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave conversation
const leaveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a participant
    if (!conversation.participants.includes(currentUserId)) {
      return res.status(403).json({ message: 'Not a participant in this conversation' });
    }

    // Remove user from participants
    conversation.participants = conversation.participants.filter(
      p => p.toString() !== currentUserId.toString()
    );

    // If no participants left, delete conversation and its messages
    if (conversation.participants.length === 0) {
      await Message.deleteMany({ conversationId: id });
      await Conversation.findByIdAndDelete(id);
      return res.json({ message: 'Left and deleted conversation' });
    }

    // If admin leaves, assign new admin (first remaining participant)
    if (conversation.isGroup && conversation.admin.toString() === currentUserId.toString()) {
      conversation.admin = conversation.participants[0];
    }

    await conversation.save();

    const updatedConversation = await Conversation.findById(id)
      .populate('participants', 'username profilePicture isOnline')
      .populate('admin', 'username');

    res.json({ conversation: updatedConversation });
  } catch (error) {
    console.error('Leave conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGroupValidation,
  getConversations,
  createConversation,
  createGroup,
  updateConversation,
  leaveConversation,
};
