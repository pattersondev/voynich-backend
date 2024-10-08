const express = require('express');
const { createChat, getChat, addMessage } = require('./controllers/chatController');
const auth = require('./middleware/auth');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/temp-token', (req, res) => {
  const tempToken = jwt.sign({}, process.env.JWT_SECRET, { expiresIn: '5m' });
  res.json({ token: tempToken });
});

router.post('/chats', auth, createChat);
router.get('/chats/:id', auth, getChat);
router.post('/chats/:id/messages', auth, (req, res) => {
  const { id } = req.params;
  const { sender, content } = req.body;
  addMessage(id, sender, content)
    .then(newMessage => res.json(newMessage))
    .catch(err => {
      console.error('Error adding message:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

module.exports = router;
