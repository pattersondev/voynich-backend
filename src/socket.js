const { addMessage } = require('./controllers/chatController');
const { pool } = require('./db');

function setupSocketIO(io) {
  const chatRooms = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', async ({ chatId, userId }) => {
      console.log(`${socket.id} (${userId}) joined chat: ${chatId}`);
      socket.join(chatId);
      
      if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, new Map());
      }
      chatRooms.get(chatId).set(socket.id, userId);

      // Emit the updated user count to all clients in the chat
      io.to(chatId).emit('userCount', chatRooms.get(chatId).size);
    });

    socket.on('message', async ({ chatId, sender, content, attachment }) => {
      console.log(`Received message from ${sender} in chat ${chatId}:`, content);
      console.log('Attachment:', attachment);
      try {
        const newMessage = await addMessage(chatId, sender, content, attachment);
        io.to(chatId).emit('message', newMessage);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [chatId, users] of chatRooms) {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          if (users.size === 0) {
            chatRooms.delete(chatId);
          } else {
            // Emit the updated user count to all clients in the chat
            io.to(chatId).emit('userCount', users.size);
          }
          break;
        }
      }
    });
  });
}

module.exports = { setupSocketIO };
