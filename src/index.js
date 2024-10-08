require('dotenv').config();

// Add this near the top of the file, after loading dotenv
const { encryptMessage, decryptMessage } = require('./utils/encryption');

// Check for required environment variables
const requiredEnvVars = ['PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'JWT_SECRET', 'ENCRYPTION_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Error: Environment variable ${envVar} is not set.`);
    process.exit(1);
  }
}

// Add this after checking for required environment variables
console.log('Testing encryption...');
const testMessage = 'This is a test message';
const encrypted = encryptMessage(testMessage);
const decrypted = decryptMessage(encrypted);
console.log('Encryption test result:', testMessage === decrypted ? 'Passed' : 'Failed');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');
const routes = require('./routes');
const { setupDatabase } = require('./db');
const { setupSocketIO } = require('./socket');
const { cleanupExpiredChats } = require('./utils/cleanupExpiredChats');

const app = express();
const server = http.createServer(app);

// Update this line to allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://voynich-client-8sy7.vercel.app', // Add your Vercel deployment URL
  process.env.CLIENT_URL
].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: '/socket.io',
});

setupSocketIO(io);

// Update the CORS middleware for Express
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(express.json());

app.use('/api', routes);

setupDatabase();

// Run cleanup every hour
setInterval(cleanupExpiredChats, 60 * 60 * 1000);

const PORT = process.env.PORT || 3005;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
