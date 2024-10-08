require('dotenv').config();
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
const allowedOrigins = ['http://localhost:3001', 'http://localhost:3004', process.env.CLIENT_URL].filter(Boolean);

const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Update the CORS middleware for Express
app.use(cors({
  origin: allowedOrigins,
  credentials: true
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
setupSocketIO(io);

// Run cleanup every hour
setInterval(cleanupExpiredChats, 60 * 60 * 1000);

const PORT = process.env.PORT || 3005;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
