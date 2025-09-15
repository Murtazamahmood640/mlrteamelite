import { Router } from 'express';
import { body } from 'express-validator';
import { login, logout, me, refreshToken, register, requestPasswordReset, resendVerification, resetPassword, updateProfile, verifyEmail, sendTwoFactorLoginCode, verifyTwoFactorLogin } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.js';
import { validateEmailVerification, validatePasswordReset, validatePasswordResetRequest, validateRefreshToken } from '../../../frontend/src/utils/validation.js';
import { rateLimit } from 'express-rate-limit';


const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // Reduced to 5 minutes for faster reset
  max: 200, // Increased from 100 to 200 for better performance
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased from 5 to 20 for better UX
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for successful requests to prevent blocking legitimate users
  skip: (req, res) => res.statusCode < 400
});

const tokenLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Allow frequent token checks
  message: {
    success: false,
    message: 'Too many token verification requests',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const r = Router();

r.post('/register',
  body('username').isLength({ min: 3 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').notEmpty(),
  body('enrollmentNo').notEmpty(),
  body('department').notEmpty(),
  register
);

r.post('/login', login);

// 2FA routes for login process
r.post('/send-2fa-code', sendTwoFactorLoginCode);
r.post('/verify-2fa', verifyTwoFactorLogin);

r.get('/me', protect, me);

r.patch('/me', protect, updateProfile);

/**
 * @route   GET /api/v1/auth/verify-email/:token
 * @desc    Verify user email address
 * @access  Public
 */
r.get('/verify-email/:token', generalLimiter, validateEmailVerification, verifyEmail);

/**
 * @route   POST /api/v1/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 */
r.post('/resend-verification', authLimiter, resendVerification);

/**
 * @route   POST /api/v1/auth/request-password-reset
 * @desc    Request password reset
 * @access  Public
 */
r.post('/request-password-reset', authLimiter, validatePasswordResetRequest, requestPasswordReset);

/**
 * @route   POST /api/v1/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
r.post('/reset-password', authLimiter, validatePasswordReset, resetPassword);

/**
 * @route   POST /api/v1/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public
 */
r.post('/refresh-token', tokenLimiter, validateRefreshToken, refreshToken);

// Protected routes (authentication required)

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
r.post('/logout', generalLimiter, protect, logout);


export default r;
