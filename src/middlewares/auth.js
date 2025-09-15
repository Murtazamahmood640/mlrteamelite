import jwt from 'jsonwebtoken';
import User from '../models/user.models.js';

export async function protect(req, res, next) {
  try {
    console.log('Protect middleware: Checking authorization header');
    const header = req.headers.authorization || '';
    console.log('Authorization header:', header ? 'present' : 'missing');
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      console.log('Protect middleware: No token found');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('Protect middleware: Token found, verifying...');
    const secret = process.env.JWT_SECRET || 'dev_secret_change';
    const decoded = jwt.verify(token, secret);
    console.log('Protect middleware: Token decoded, user ID:', decoded.id);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('Protect middleware: User not found in DB');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('Protect middleware: User found, role:', user.role);
    req.user = user;
    next();
  } catch (e) {
    console.log('Protect middleware: Error verifying token:', e.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    console.log('Authorize middleware: Checking user and roles');
    console.log('Authorize middleware: req.user exists:', !!req.user);
    if (!req.user) {
      console.log('Authorize middleware: No user in request');
      return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('Authorize middleware: User role:', req.user.role);
    console.log('Authorize middleware: Allowed roles:', roles);
    if (!roles.includes(req.user.role)) {
      console.log('Authorize middleware: User role not in allowed roles, returning 403');
      return res.status(403).json({ message: 'Forbidden' });
    }
    console.log('Authorize middleware: Authorization passed');
    next();
  };
}

export async function optionalProtect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (token) {
      const secret = process.env.JWT_SECRET || 'dev_secret_change';
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    }
  } catch (e) {
    // ignore errors, proceed without user
  }
  next();
}

