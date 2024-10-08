const { pool } = require('../db');

async function cleanupExpiredChats() {
  const client = await pool.connect();
  try {
    // Delete messages for expired chats
    await client.query('DELETE FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE expires_at < NOW())');
    // Delete expired chats
    await client.query('DELETE FROM chats WHERE expires_at < NOW()');
    console.log('Expired chats and messages cleaned up');
  } catch (err) {
    console.error('Error cleaning up expired chats:', err);
  } finally {
    client.release();
  }
}

module.exports = { cleanupExpiredChats };
