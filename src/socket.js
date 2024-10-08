const { encryptMessage, decryptMessage } = require('./utils/encryption');
const { addMessage } = require('./controllers/chatController');

function setupSocketIO(io) {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (chatId) => {
      socket.join(chatId);
      console.log(`Client ${socket.id} joined chat: ${chatId}`);
    });

    socket.on('message', async ({ chatId, sender, content }) => {
      console.log(`Received message from ${sender} in chat ${chatId}:`, content);
      try {
        const newMessage = await addMessage(chatId, sender, content);
        console.log('New message added:', newMessage);
        io.to(chatId).emit('message', newMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

module.exports = { setupSocketIO };
