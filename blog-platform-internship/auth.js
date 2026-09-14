const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'development-secret-change-me';

function signUser(user) {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, secret, { expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { signUser, requireAuth };
