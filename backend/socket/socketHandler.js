const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");

const onlineUsers = new Map();

const populateMessageForClient = (messageId) =>
  Message.findById(messageId)
    .populate("senderId", "username profilePicture")
    .populate("reactions.userId", "username profilePicture");

const applyReactionChange = (message, userId, emoji) => {
  const normalizedUserId = userId.toString();
  const existingReactionIndex = message.reactions.findIndex(
    (reaction) => reaction.userId.toString() === normalizedUserId,
  );

  if (existingReactionIndex === -1) {
    message.reactions.push({ userId, emoji });
    return;
  }

  const existingReaction = message.reactions[existingReactionIndex];
  if (existingReaction.emoji === emoji) {
    message.reactions.splice(existingReactionIndex, 1);
    return;
  }

  existingReaction.emoji = emoji;
};

module.exports = function socketHandler(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      next();
    } catch {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    try {
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
      });

      onlineUsers.set(userId, socket.id);

      socket.broadcast.emit("user_online", userId);
      socket.emit("online_users", Array.from(onlineUsers.keys()));

      socket.on("join_conversation", async (conversationId) => {
        try {
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
          });

          if (!conversation) return;

          socket.join(conversationId);
          console.log(`User ${userId} joined conversation ${conversationId}`);
        } catch (error) {
          console.error("Join conversation error:", error);
        }
      });

      socket.on("leave_conversation", (conversationId) => {
        socket.leave(conversationId);
        console.log(`User ${userId} left conversation ${conversationId}`);
      });

      socket.on("typing_start", ({ conversationId }) => {
        socket.to(conversationId).emit("user_typing", {
          userId,
          conversationId,
        });
      });

      socket.on("typing_stop", ({ conversationId }) => {
        socket.to(conversationId).emit("user_stop_typing", {
          userId,
          conversationId,
        });
      });

      socket.on("message_read", async ({ messageId, conversationId }) => {
        try {
          const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
          });

          if (!conversation) return;

          const updatedMessage = await Message.findOneAndUpdate(
            {
              _id: messageId,
              conversationId,
            },
            {
              $addToSet: { readBy: userId },
              $set: { isRead: true },
            },
            { new: true },
          );

          if (!updatedMessage) return;

          io.to(conversationId).emit("message_seen", {
            messageId,
            conversationId,
            readBy: updatedMessage.readBy,
            isRead: updatedMessage.isRead,
          });

          await Conversation.findByIdAndUpdate(conversationId, {
            $set: { [`unreadCount.${userId}`]: 0 },
          });
        } catch (error) {
          console.error("Message read error:", error);
        }
      });

      socket.on("add_reaction", async ({ messageId, emoji }, callback = () => {}) => {
        try {
          const message = await Message.findById(messageId);

          if (!message) {
            callback({ success: false, message: "Message not found" });
            return;
          }

          const conversation = await Conversation.findOne({
            _id: message.conversationId,
            participants: userId,
          });

          if (!conversation) {
            callback({ success: false, message: "Not authorized" });
            return;
          }

          applyReactionChange(message, userId, emoji);
          await message.save();

          const updatedMessage = await populateMessageForClient(messageId);
          const conversationId = message.conversationId.toString();

          io.to(conversationId).emit("reaction_updated", updatedMessage);
          callback({ success: true, message: updatedMessage });
        } catch (error) {
          console.error("Add reaction error:", error);
          callback({ success: false, message: "Failed to update reaction" });
        }
      });

      socket.on("disconnect", async () => {
        console.log(`User disconnected: ${userId}`);

        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.broadcast.emit("user_offline", userId);
      });
    } catch (error) {
      console.error("Socket connection error:", error);
    }
  });

  return io;
};
