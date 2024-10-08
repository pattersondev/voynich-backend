const { addMessage } = require('./controllers/chatController');
const { pool } = require('./db');

function setupSocketIO(io) {
  const chatRooms = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', async (chatId) => {
      console.log(`${socket.id} joined chat: ${chatId}`);
      socket.join(chatId);
      
      if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, new Set());
      }
      chatRooms.get(chatId).add(socket.id);

      // Check if chat has expired
      const client = await pool.connect();
      try {
        const result = await client.query('SELECT expires_at FROM chats WHERE id = $1', [chatId]);
        if (result.rows.length > 0) {
          const expiresAt = new Date(result.rows[0].expires_at);
          if (expiresAt < new Date()) {
            io.to(chatId).emit('chatExpired');
            chatRooms.delete(chatId);
          }
        } else {
          socket.emit('chatExpired');
        }
      } catch (err) {
        console.error('Error checking chat expiration:', err);
      } finally {
        client.release();
      }
    });

    socket.on('message', async ({ chatId, sender, content }) => {
      console.log(`Received message from ${sender} in chat ${chatId}:`, content);
      try {
        const newMessage = await addMessage(chatId, sender, content);
        console.log('New message added to database:', newMessage);
        io.to(chatId).emit('message', newMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [chatId, clients] of chatRooms) {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) {
            chatRooms.delete(chatId);
          }
          break;
        }
      }
    });
  });

  // Periodically check for expired chats
  setInterval(async () => {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id FROM chats WHERE expires_at < NOW()');
      for (const row of result.rows) {
        const chatId = row.id;
        if (chatRooms.has(chatId)) {
          io.to(chatId).emit('chatExpired');
          chatRooms.delete(chatId);
        }
      }
    } catch (err) {
      console.error('Error checking for expired chats:', err);
    } finally {
      client.release();
    }
  }, 60000); // Check every minute
}

module.exports = { setupSocketIO };
