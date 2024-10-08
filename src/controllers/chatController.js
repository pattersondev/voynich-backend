const { pool } = require('../db');
const { encryptMessage, decryptMessage } = require('../utils/encryption');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

async function createChat(req, res) {
  const { duration } = req.body;
  const chatId = crypto.randomBytes(16).toString('hex'); // Generate a random 32-character string
  const client = await pool.connect();

  try {
    const result = await client.query(
      'INSERT INTO chats (id, expires_at) VALUES ($1, NOW() + $2::INTERVAL) RETURNING id',
      [chatId, duration]
    );
    
    const token = req.tempToken || jwt.sign(
      { chatId: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: duration }
    );

    res.json({
      id: result.rows[0].id,
      token: token
    });
  } catch (err) {
    console.error('Error creating chat:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function getChat(req, res) {
  const { id } = req.params;
  console.log(`Attempting to fetch chat with id: ${id}`);
  const client = await pool.connect();

  try {
    const chatResult = await client.query('SELECT * FROM chats WHERE id = $1', [id]);
    if (chatResult.rows.length === 0) {
      console.log(`Chat with id ${id} not found`);
      return res.status(404).json({ error: 'Chat not found' });
    }

    const messagesResult = await client.query('SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [id]);
    const decryptedMessages = messagesResult.rows.map(msg => ({
      ...msg,
      content: decryptMessage(msg.content)
    }));

    console.log(`Successfully fetched chat with id ${id}`);
    res.json({
      chat: chatResult.rows[0],
      messages: decryptedMessages
    });
  } catch (err) {
    console.error('Error getting chat:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
}

async function addMessage(chatId, sender, content, attachment) {
  const client = await pool.connect();

  try {
    let encryptedAttachment = null;
    if (attachment) {
      encryptedAttachment = {
        name: encryptMessage(attachment.name),
        type: encryptMessage(attachment.type),
        data: encryptMessage(attachment.data),
      };
    }

    const encryptedContent = encryptMessage(content);
    const result = await client.query(
      'INSERT INTO messages (chat_id, sender, content, attachment) VALUES ($1, $2, $3, $4) RETURNING id, sender, content, attachment, created_at',
      [chatId, sender, encryptedContent, encryptedAttachment ? JSON.stringify(encryptedAttachment) : null]
    );
    
    const newMessage = result.rows[0];
    newMessage.content = decryptMessage(newMessage.content);
    
    if (newMessage.attachment) {
      // Check if attachment is a string (JSON) or already an object
      const attachmentObj = typeof newMessage.attachment === 'string' 
        ? JSON.parse(newMessage.attachment) 
        : newMessage.attachment;
      
      newMessage.attachment = {
        name: decryptMessage(attachmentObj.name),
        type: decryptMessage(attachmentObj.type),
        data: decryptMessage(attachmentObj.data),
      };
    }

    console.log('Message added to database:', newMessage);
    return newMessage;
  } catch (err) {
    console.error('Error adding message to database:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function addAttachment(chatId, sender, attachment) {
  const client = await pool.connect();

  try {
    const encryptedAttachment = {
      name: encryptMessage(attachment.name),
      type: encryptMessage(attachment.type),
      data: encryptMessage(attachment.data),
    };

    const result = await client.query(
      'INSERT INTO messages (chat_id, sender, attachment) VALUES ($1, $2, $3) RETURNING id, sender, attachment, created_at',
      [chatId, sender, JSON.stringify(encryptedAttachment)]
    );
    
    const newAttachment = result.rows[0];
    newAttachment.attachment = {
      name: decryptMessage(JSON.parse(newAttachment.attachment).name),
      type: decryptMessage(JSON.parse(newAttachment.attachment).type),
      data: decryptMessage(JSON.parse(newAttachment.attachment).data),
    };

    console.log('Attachment added to database:', newAttachment);
    return newAttachment;
  } catch (err) {
    console.error('Error adding attachment to database:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { createChat, getChat, addMessage, addAttachment };
