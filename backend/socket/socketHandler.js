const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

// Map to track online users: userId -> socketId
const onlineUsers = new Map();

module.exports = function (io) {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    try {
      // Set user online status
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      // Add to online users map
      onlineUsers.set(userId, socket.id);

      // Broadcast user online status to all clients
      socket.broadcast.emit('user_online', userId);

      // Send list of online users to the connected user
      socket.emit('online_users', Array.from(onlineUsers.keys()));

      // Handle join conversation
      socket.on('join_conversation', async (conversationId) => {
        try {
          // Verify user is a participant
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
          });

          if (conversation) {
            socket.join(conversationId);
            console.log(`User ${userId} joined conversation ${conversationId}`);
          }
        } catch (error) {
          console.error('Join conversation error:', error);
        }
      });

      // Handle leave conversation
      socket.on('leave_conversation', (conversationId) => {
        socket.leave(conversationId);
        console.log(`User ${userId} left conversation ${conversationId}`);
      });

      // Handle typing start
      socket.on('typing_start', ({ conversationId }) => {
        socket.to(conversationId).emit('user_typing', {
          userId,
          conversationId,
        });
      });

      // Handle typing stop
      socket.on('typing_stop', ({ conversationId }) => {
        socket.to(conversationId).emit('user_stop_typing', {
          userId,
          conversationId,
        });
      });

      // Handle message read
      socket.on('message_read', async ({ messageId, conversationId }) => {
        try {
          // Update message
          await Message.findByIdAndUpdate(messageId, {
            $addToSet: { readBy: userId },
            isRead: true,
          });

          // Broadcast to conversation room
          socket.to(conversationId).emit('message_seen', {
            messageId,
            userId,
          });

          // Reset unread count for this user in conversation
          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${userId}`]: 0 },
          });
        } catch (error) {
          console.error('Message read error:', error);
        }
      });

      // Handle add reaction
      socket.on('add_reaction', async ({ messageId, emoji }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          // Verify user is a participant
          const conversation = await Conversation.findOne({
            _id: message.conversationId,
            participants: userId,
          });
          if (!conversation) return;

          // Check if user already reacted with this emoji
          const existingReactionIndex = message.reactions.findIndex(
            r => r.userId.toString() === userId.toString() && r.emoji === emoji
          );

          if (existingReactionIndex !== -1) {
            // Remove reaction (toggle off)
            message.reactions.splice(existingReactionIndex, 1);
          } else {
            // Remove any existing reaction from this user
            const userReactionIndex = message.reactions.findIndex(
              r => r.userId.toString() === userId.toString()
            );
            if (userReactionIndex !== -1) {
              message.reactions.splice(userReactionIndex, 1);
            }
            // Add new reaction
            message.reactions.push({ userId, emoji });
          }

          await message.save();

          // Populate reactions for response
          const populatedMessage = await Message.findById(messageId)
            .populate('reactions.userId', 'username profilePicture');

          // Broadcast to conversation room
          io.to(message.conversationId.toString()).emit('reaction_updated', {
            messageId,
            reactions: populatedMessage.reactions,
          });
        } catch (error) {
          console.error('Add reaction error:', error);
        }
      });

      // Handle disconnect
      socket.on('disconnect', async () => {
        console.log(`User disconnected: ${userId}`);

        // Remove from online users map
        onlineUsers.delete(userId);

        // Update user offline status
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        // Broadcast user offline status
        socket.broadcast.emit('user_offline', userId);
      });
    } catch (error) {
      console.error('Socket connection error:', error);
    }
  });

  // Store io instance for use in controllers
  return io;
};
