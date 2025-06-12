import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log(`[${new Date().toISOString()}] Auth middleware: Token received: ${token ? 'Present' : 'Missing'}`);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required: No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[${new Date().toISOString()}] Auth middleware: Token decoded, user ID: ${decoded.id}`);

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log(`[${new Date().toISOString()}] Auth middleware: User not found for ID: ${decoded.id}`);
      return res.status(401).json({ error: 'Authentication failed: User not found' });
    }

    req.user = { id: user._id.toString(), ...user.toObject() };
    console.log(`[${new Date().toISOString()}] Auth middleware: User authenticated: ${req.user.id}`);
    next();
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Auth middleware error: ${err.message}`);
    res.status(401).json({ error: 'Authentication failed: Invalid token' });
  }
};

export default auth;