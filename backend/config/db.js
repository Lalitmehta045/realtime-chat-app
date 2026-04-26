const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGO_URI;
    
    // Ensure database name is present
    if (!mongoURI.includes('/chat-app')) {
      // Remove trailing slash before query params if present
      mongoURI = mongoURI.replace(/\/\?/, '?');
      
      // Insert database name before query params or at the end
      if (mongoURI.includes('?')) {
        mongoURI = mongoURI.replace('?', '/chat-app?');
      } else {
        // Remove trailing slash if present, then add database
        mongoURI = mongoURI.replace(/\/$/, '');
        mongoURI = `${mongoURI}/chat-app`;
      }
    }
    
    const conn = await mongoose.connect(mongoURI);

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
