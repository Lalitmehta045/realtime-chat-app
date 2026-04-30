# Chat Application - Complete Project Documentation

## Project Overview

Ye ek **Real-time Chat Application** hai jo MERN Stack pe bana hai (MongoDB, Express, React, Node.js). Ismein private messaging, group chats, real-time updates, aur modern WhatsApp-like UI hai.

**Tech Stack:**
- **Frontend:** React 19, Tailwind CSS 4, Vite, Socket.io-client, Zustand
- **Backend:** Node.js, Express 5, Socket.io, MongoDB (Mongoose)
- **Authentication:** JWT (Access + Refresh Tokens)
- **File Uploads:** Cloudinary (images), Multer
- **Real-time:** Socket.io (WebSocket + Polling fallback)

---

## Folder Structure

```
chat-application/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js          # Cloudinary image upload config
│   │   └── db.js                  # MongoDB connection setup
│   ├── controllers/
│   │   ├── authController.js      # Login, register, logout, refresh
│   │   ├── conversationController.js # Conversations & groups CRUD
│   │   ├── messageController.js   # Messages CRUD, reactions, search
│   │   └── userController.js    # User profile, search, password
│   ├── middleware/
│   │   ├── authMiddleware.js      # JWT token verification
│   │   └── uploadMiddleware.js    # Multer + Cloudinary upload
│   ├── models/
│   │   ├── Conversation.js        # Chat/DM conversation schema
│   │   ├── Message.js             # Message schema with reactions
│   │   └── User.js                # User schema with auth fields
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth/* endpoints
│   │   ├── conversationRoutes.js  # /api/conversations/* endpoints
│   │   ├── messageRoutes.js       # /api/messages/* endpoints
│   │   └── userRoutes.js          # /api/users/* endpoints
│   ├── socket/
│   │   └── socketHandler.js       # Socket.io event handlers
│   ├── utils/
│   │   └── generateTokens.js      # JWT token generation helpers
│   ├── server.js                  # Main server entry point
│   ├── package.json
│   └── .env                       # Environment variables
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── auth/
    │   │   │   ├── LoginForm.jsx
    │   │   │   └── RegisterForm.jsx
    │   │   ├── chat/
    │   │   │   ├── ChatHeader.jsx       # Chat window header
    │   │   │   ├── ChatWindow.jsx       # Main chat container
    │   │   │   ├── ForwardModal.jsx     # Forward message modal
    │   │   │   ├── ForwardedLabel.jsx   # Forward indicator
    │   │   │   ├── ImageLightbox.jsx    # Image preview modal
    │   │   │   ├── MessageBubble.jsx    # Individual message display
    │   │   │   ├── MessageInput.jsx     # Message input area
    │   │   │   ├── MessageList.jsx      # Messages scroll container
    │   │   │   ├── QuotedMessage.jsx    # Reply message preview
    │   │   │   ├── ReactionPicker.jsx   # Emoji reactions
    │   │   │   ├── ReplyPreviewBar.jsx  # Reply UI component
    │   │   │   └── TypingIndicator.jsx  # "User is typing..."
    │   │   ├── shared/
    │   │   │   ├── Avatar.jsx           # User avatar component
    │   │   │   ├── Loader.jsx           # Loading spinner
    │   │   │   ├── Modal.jsx            # Reusable modal
    │   │   │   └── ProtectedRoute.jsx   # Auth route guard
    │   │   └── sidebar/
    │   │       ├── ConversationItem.jsx   # Sidebar chat item
    │   │       ├── GroupCreateModal.jsx   # Create group modal
    │   │       ├── OnlineUsers.jsx        # Online users list
    │   │       ├── Sidebar.jsx            # Main sidebar
    │   │       └── UserSearch.jsx         # User search
    │   ├── hooks/
    │   │   ├── useMessages.js         # Message loading logic
    │   │   └── useSocket.js           # Socket connection hook
    │   ├── lib/
    │   │   ├── axios.js               # Axios instance with interceptors
    │   │   └── socket.js              # Socket.io setup & helpers
    │   ├── pages/
    │   │   ├── HomePage.jsx           # Main chat page
    │   │   ├── LoginPage.jsx          # Login page
    │   │   └── RegisterPage.jsx       # Register page
    │   ├── store/
    │   │   ├── useAuthStore.js        # Auth state (Zustand)
    │   │   └── useChatStore.js        # Chat state (Zustand)
    │   ├── utils/
    │   │   └── formatTime.js          # Time formatting utilities
    │   ├── App.jsx                    # Main app with routes
    │   ├── main.jsx                   # Entry point
    │   └── index.css                  # Global styles
    ├── public/
    ├── index.html
    ├── vite.config.js                 # Vite + path aliases
    ├── tailwind.config.js
    └── package.json
```

---

## Backend API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | No |
| POST | `/api/auth/refresh` | Refresh access token | No (uses cookie) |
| GET | `/api/auth/me` | Get current user | Yes |

**Rate Limiting:** Auth routes pe rate limit hai (15 min me 15 requests production me, 1 min me 100 dev me).

### User Routes (`/api/users`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/search?q=query` | Search users by username | Yes |
| GET | `/api/users/:id` | Get user profile | Yes |
| PUT | `/api/users/profile` | Update profile (username, bio, avatar) | Yes |
| PUT | `/api/users/avatar` | Update only avatar | Yes |
| PUT | `/api/users/password` | Update password | Yes |

### Conversation Routes (`/api/conversations`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/conversations` | Get all user's conversations | Yes |
| POST | `/api/conversations` | Create DM conversation | Yes |
| POST | `/api/conversations/group` | Create group conversation | Yes |
| PUT | `/api/conversations/:id` | Update group (name, image, members) | Yes (Admin only) |
| DELETE | `/api/conversations/:id/leave` | Leave conversation | Yes |

### Message Routes (`/api/messages`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/messages/:conversationId?page=1` | Get messages (pagination) | Yes |  
| POST | `/api/messages` | Send message (text + image) | Yes |
| POST | `/api/messages/forward` | Forward message to multiple chats | Yes |
| PUT | `/api/messages/:id` | Edit message (5 min window) | Yes (Sender only) |
| DELETE | `/api/messages/:id` | Delete message (for me/everyone) | Yes |
| POST | `/api/messages/:id/react` | Add/remove reaction | Yes |
| GET | `/api/messages/search?q=query` | Search messages | Yes |

### Socket.io Events (Real-time)

**Client to Server:**
- `join_conversation` - Join a chat room
- `leave_conversation` - Leave a chat room
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `message_read` - Mark message as read
- `add_reaction` - Add emoji reaction

**Server to Client:**
- `new_message` - New message received
- `message_edited` - Message was edited
- `message_deleted` - Message was deleted
- `message_seen` - Message read receipt
- `reaction_updated` - Reaction added/removed
- `user_typing` - Someone is typing
- `user_stop_typing` - Someone stopped typing
- `user_online` - User came online
- `user_offline` - User went offline
- `online_users` - List of online users

---

## Data Models (MongoDB Schemas)

### User Model
```javascript
{
  username: String (required, unique, 3-30 chars),
  email: String (required, unique, valid email),
  password: String (required, min 6 chars, hashed),
  profilePicture: String (URL, default: ""),
  bio: String (max 150 chars),
  isOnline: Boolean (default: false),
  lastSeen: Date,
  refreshToken: String (hashed, for token rotation)
}
```

### Conversation Model
```javascript
{
  isGroup: Boolean (default: false),
  name: String (group name, null for DMs),
  groupImage: String (URL, null for DMs),
  admin: ObjectId (User, null for DMs),
  participants: [ObjectId] (User references),
  lastMessage: ObjectId (Message reference),
  unreadCount: Map (userId -> unread count)
}
```

### Message Model
```javascript
{
  conversationId: ObjectId (required),
  senderId: ObjectId (User, required),
  text: String (message content),
  image: String (image URL),
  messageType: Enum ['text', 'image', 'mixed'],
  isForwarded: Boolean,
  forwardedFrom: ObjectId (original message),
  replyTo: {
    messageId, senderId, senderName, text, image, messageType
  },
  isRead: Boolean,
  readBy: [ObjectId] (Users who read),
  reactions: [{ userId, emoji }],
  isDeleted: Boolean (soft delete),
  deletedAt: Date,
  deletedFor: [ObjectId] (Users who deleted),
  isEdited: Boolean,
  editedAt: Date
}
```

---

## Authentication Flow

1. **Registration:**
   - User register karta hai (username, email, password)
   - Password bcrypt se hash hota hai
   - Access token + Refresh token generate hote hain
   - Refresh token cookie me set hota hai (httpOnly, secure)

2. **Login:**
   - Email/password verify hote hain
   - Tokens generate hote hain
   - Refresh token cookie me set hota hai

3. **Token Refresh:**
   - Access token expire ho jaye to 401 aata hai
   - Axios interceptor auto refresh karta hai using `/auth/refresh`
   - Refresh token cookie se verify hota hai
   - New access token return hota hai

4. **Logout:**
   - Cookie clear hoti hai
   - Refresh token DB se remove hota hai

5. **Protected Routes:**
   - `Authorization: Bearer <token>` header required
   - `authMiddleware` verify karta hai JWT

---

## Frontend State Management (Zustand)

### Auth Store (`useAuthStore`)
- `authUser` - Current logged in user
- `accessToken` - JWT access token
- `isCheckingAuth` - Auth check loading state
- Actions: `login()`, `register()`, `logout()`, `checkAuth()`
- Persists accessToken to localStorage

### Chat Store (`useChatStore`)
- `conversations` - User's conversation list
- `selectedConversation` - Currently active chat
- `messages` - Messages in selected conversation
- `onlineUsers` - Array of online user IDs
- `typingUsers` - Who's typing in which conversation
- `forwardingMessage` - Message being forwarded
- Actions: Message CRUD, conversation management, socket event handlers

---

## Key Features

### 1. Real-time Messaging
- Socket.io pe real-time message sending/receiving
- Join/leave conversation rooms
- Online/offline status
- Typing indicators

### 2. Message Features
- Text + Image messages
- Reply to messages (quoted messages)
- Forward messages (up to 5 conversations)
- Edit messages (5 minute window)
- Delete messages (for me / for everyone)
- Emoji reactions
- Read receipts

### 3. Conversations
- Direct Messages (DMs) - 2 users
- Group Chats - Multiple users with admin
- Unread message counts
- Last message preview
- Search messages within conversation

### 4. User Features
- Profile with avatar and bio
- Online status
- User search
- Password change

### 5. Security
- JWT authentication (access + refresh tokens)
- Password hashing (bcryptjs, salt 12)
- Rate limiting on auth routes
- Helmet for security headers
- CORS configured
- File upload validation (5MB, images only)

---

## Environment Variables

### Backend (.env)
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://...
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## Running the Project

### Backend
```bash
cd backend
npm install
npm run dev          # Development (nodemon)
npm start            # Production
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # Development (Vite, port 5173)
npm run build        # Production build
```

---

## Path Aliases (Vite Config)

```javascript
@           -> ./src
@components -> ./src/components
@pages      -> ./src/pages
@store      -> ./src/store
@hooks      -> ./src/hooks
@lib        -> ./src/lib
@utils      -> ./src/utils
```

---

## Dependencies Summary

### Backend Dependencies
- **express** - Web framework
- **mongoose** - MongoDB ODM
- **socket.io** - Real-time communication
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT tokens
- **cloudinary** - Image storage
- **multer** - File upload middleware
- **helmet** - Security headers
- **cors** - CORS handling
- **express-rate-limit** - Rate limiting
- **express-validator** - Input validation
- **cookie-parser** - Cookie parsing
- **dotenv** - Environment variables
- **morgan** - HTTP logging

### Frontend Dependencies
- **react** - UI library
- **react-router-dom** - Routing
- **zustand** - State management
- **axios** - HTTP client
- **socket.io-client** - Real-time client
- **tailwindcss** - Styling
- **lucide-react** - Icons
- **framer-motion** - Animations
- **emoji-picker-react** - Emoji picker
- **react-hot-toast** - Notifications

---

## Common Questions You Can Ask

1. **"Register API ka endpoint kya hai?"**
   - POST `/api/auth/register` - Body: `{username, email, password}`

2. **"Message send karne ka flow kya hai?"**
   - Client: `sendMessage()` in `useChatStore` -> POST `/api/messages` -> Controller creates message -> Socket emits `new_message` -> Other clients receive in real-time

3. **"Group kaise create hota hai?"**
   - POST `/api/conversations/group` with FormData: `{name, participants (JSON string), image (optional)}`

4. **"Socket events ka list do"**
   - Client emits: `join_conversation`, `leave_conversation`, `typing_start`, `typing_stop`, `message_read`, `add_reaction`
   - Server emits: `new_message`, `message_edited`, `message_deleted`, `reaction_updated`, `user_online`, `user_offline`, `online_users`, `user_typing`, `user_stop_typing`, `message_seen`

5. **"Token refresh kaise kaam karta hai?"**
   - Axios interceptor 401 catch karta hai -> `/auth/refresh` call -> New access token -> Original request retry

6. **"File upload kahan hota hai?"**
   - Multer (memory storage) -> Cloudinary upload -> URL return -> DB save

7. **"Online status kaise track hota hai?"**
   - Socket `connection` pe `isOnline: true` set hota hai
   - Socket `disconnect` pe `isOnline: false` + `lastSeen` update
   - `user_online` / `user_offline` events broadcast hote hain

8. **"Conversation model me unreadCount kese kaam karta hai?"**
   - Map hai: `{ userId1: count1, userId2: count2 }`
   - Message send pe sender ka 0, others ka increment
   - Message read pe reader ka 0 set

9. **"Frontend me routing kaise setup hai?"**
   - `/login` -> LoginPage
   - `/register` -> RegisterPage
   - `/` -> HomePage (Protected)
   - `*` -> Redirect to `/`

10. **"Konsi component kya karti hai?"**
    - `Sidebar` -> Conversation list + search
    - `ChatWindow` -> Selected conversation ka UI
    - `MessageList` -> Scrollable messages
    - `MessageInput` -> Type + send messages
    - `MessageBubble` -> Individual message display

---

## File Reference Quick Links

- Backend Entry: `backend/server.js`
- Frontend Entry: `frontend/src/main.jsx`
- Routes: `backend/routes/*.js`
- Controllers: `backend/controllers/*.js`
- Models: `backend/models/*.js`
- Socket Handler: `backend/socket/socketHandler.js`
- Auth Store: `frontend/src/store/useAuthStore.js`
- Chat Store: `frontend/src/store/useChatStore.js`
- Axios Setup: `frontend/src/lib/axios.js`
- Socket Setup: `frontend/src/lib/socket.js`
