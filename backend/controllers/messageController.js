const { validationResult, body } = require("express-validator");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const { uploadToCloudinary } = require("../middleware/uploadMiddleware");

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

const sendMessageValidation = [
  body("conversationId").notEmpty().withMessage("Conversation ID is required"),
  body("text").optional().trim().notEmpty().withMessage("Text cannot be empty"),
];

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this conversation" });
    }

    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
    })
      .populate("senderId", "username profilePicture")
      .populate("reactions.userId", "username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMessages = await Message.countDocuments({
      conversationId,
      deletedFor: { $ne: userId },
    });

    const hasMore = skip + messages.length < totalMessages;

    res.json({
      messages: messages.reverse(),
      hasMore,
      page,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let { conversationId, text, replyTo } = req.body;
    const userId = req.user._id;

    if (typeof replyTo === "string") {
      try {
        replyTo = JSON.parse(replyTo);
      } catch {
        return res.status(400).json({ message: "Invalid replyTo payload" });
      }
    }

    if (replyTo) {
      const hasRequiredFields =
        replyTo.messageId && replyTo.senderId && replyTo.senderName;

      if (!hasRequiredFields) {
        return res.status(400).json({
          message:
            "replyTo.messageId, replyTo.senderId, and replyTo.senderName are required",
        });
      }
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res
        .status(403)
        .json({ message: "Not authorized to send messages here" });
    }

    let imageUrl = null;
    let messageType = "text";

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.buffer, "chat/messages");
      messageType = text ? "mixed" : "image";
    }

    if (!text && !imageUrl) {
      return res
        .status(400)
        .json({ message: "Message must contain text or image" });
    }

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
          messageType: replyTo.messageType || "text",
        }
        : null,
    });

    const otherParticipants = conversation.participants.filter(
      (participantId) => participantId.toString() !== userId.toString(),
    );

    const unreadIncrement = {};
    otherParticipants.forEach((participantId) => {
      unreadIncrement[`unreadCount.${participantId}`] = 1;
    });

    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      updatedAt: new Date(),
      $set: { [`unreadCount.${userId}`]: 0 },
      ...(Object.keys(unreadIncrement).length ? { $inc: unreadIncrement } : {}),
    });

    const populatedMessage = await populateMessageForClient(message._id);
    const io = req.app.get("io");

    io.to(conversationId).emit("new_message", populatedMessage);

    res.status(201).json({ message: populatedMessage });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res
        .status(403)
        .json({ message: "Can only edit your own messages" });
    }

    if (message.isDeleted) {
      return res.status(400).json({ message: "Cannot edit deleted message" });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (message.createdAt < fiveMinutesAgo) {
      return res
        .status(400)
        .json({ message: "Edit window expired (5 minutes)" });
    }

    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    const populatedMessage = await populateMessageForClient(id);
    const io = req.app.get("io");

    io.to(message.conversationId.toString()).emit("message_edited", populatedMessage);

    res.json({ message: populatedMessage });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteFor } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const isSender = message.senderId.toString() === userId.toString();
    const io = req.app.get("io");

    if (deleteFor === "everyone") {
      if (!isSender) {
        return res
          .status(403)
          .json({ message: "Only sender can delete for everyone" });
      }

      message.isDeleted = true;
      message.text = null;
      message.image = null;
      message.deletedAt = new Date();
      await message.save();

      io.to(message.conversationId.toString()).emit("message_deleted", {
        messageId: id,
        deleteFor: "everyone",
      });
    } else {
      if (!message.deletedFor.includes(userId)) {
        message.deletedFor.push(userId);
        await message.save();
      }

      const userSocket = Array.from(io.sockets.sockets.values()).find(
        (socket) => socket.userId === userId.toString(),
      );

      if (userSocket) {
        userSocket.emit("message_deleted", {
          messageId: id,
          deleteFor: "me",
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res.status(403).json({ message: "Not authorized" });
    }

    applyReactionChange(message, userId, emoji);
    await message.save();

    const updatedMessage = await populateMessageForClient(id);
    const io = req.app.get("io");

    io.to(message.conversationId.toString()).emit("reaction_updated", updatedMessage);

    res.json({
      message: updatedMessage,
      reactions: updatedMessage.reactions,
    });
  } catch (error) {
    console.error("React to message error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const searchMessages = async (req, res) => {
  try {
    const { conversationId, q } = req.query;
    const userId = req.user._id;

    if (!conversationId || !q) {
      return res
        .status(400)
        .json({ message: "Conversation ID and search query required" });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: userId,
    });

    if (!conversation) {
      return res
        .status(403)
        .json({ message: "Not authorized to search this conversation" });
    }

    const messages = await Message.find({
      conversationId,
      $text: { $search: q },
      deletedFor: { $ne: userId },
    })
      .populate("senderId", "username profilePicture")
      .populate("reactions.userId", "username profilePicture")
      .sort({ score: { $meta: "textScore" } })
      .limit(20);

    res.json({ messages });
  } catch (error) {
    console.error("Search messages error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const forwardMessage = async (req, res) => {
  try {
    const { messageId, conversationIds } = req.body;
    const senderId = req.user._id;

    if (!messageId || !conversationIds?.length) {
      return res
        .status(400)
        .json({ error: "messageId and conversationIds required" });
    }

    if (conversationIds.length > 5) {
      return res
        .status(400)
        .json({ error: "Cannot forward to more than 5 conversations" });
    }

    const original = await Message.findById(messageId);
    if (!original) {
      return res.status(404).json({ error: "Original message not found" });
    }

    if (original.isDeleted) {
      return res
        .status(400)
        .json({ error: "Cannot forward a deleted message" });
    }

    const sourceConversation = await Conversation.findOne({
      _id: original.conversationId,
      participants: senderId,
    });

    if (!sourceConversation) {
      return res
        .status(403)
        .json({ error: "Not a participant of source conversation" });
    }

    const targetConversations = await Conversation.find({
      _id: { $in: conversationIds },
      participants: senderId,
    });

    if (targetConversations.length !== conversationIds.length) {
      return res.status(403).json({
        error: "Not a participant in one or more target conversations",
      });
    }

    const io = req.app.get("io");
    const createdMessages = [];

    for (const conversation of targetConversations) {
      const forwardedMessage = await Message.create({
        conversationId: conversation._id,
        senderId,
        text: original.text || null,
        image: original.image || null,
        messageType: original.messageType,
        isForwarded: true,
        forwardedFrom: original._id,
      });

      const otherParticipants = conversation.participants.filter(
        (participantId) => participantId.toString() !== senderId.toString(),
      );

      const unreadIncrement = {};
      otherParticipants.forEach((participantId) => {
        unreadIncrement[`unreadCount.${participantId}`] = 1;
      });

      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: forwardedMessage._id,
        updatedAt: new Date(),
        $set: { [`unreadCount.${senderId}`]: 0 },
        ...(Object.keys(unreadIncrement).length ? { $inc: unreadIncrement } : {}),
      });

      const populatedMessage = await populateMessageForClient(forwardedMessage._id);

      io.to(conversation._id.toString()).emit("new_message", populatedMessage);
      createdMessages.push(populatedMessage);
    }

    return res.status(201).json({
      success: true,
      forwardedCount: createdMessages.length,
      messages: createdMessages,
    });
  } catch (error) {
    console.error("forwardMessage error:", error);
    return res.status(500).json({ error: "Internal server error" });
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
