const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const token = req.header('x-auth-token');
  console.log('Received token:', token);

  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    console.log('Token verified successfully');
    next();
  } catch (e) {
    console.error('Token verification failed:', e);
    res.status(400).json({ msg: 'Token is not valid' });
  }
}

module.exports = auth;
