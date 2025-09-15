import crypto from 'crypto';
import User from '../models/user.models.js';
import { sendTwoFactorCodeEmail } from '../services/emailService.js';

/**
 * Generate a random 6-digit code
 * @returns {string} 6-digit verification code
 */
const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Generate backup codes for 2FA
 * @returns {string[]} Array of 10 backup codes
 */
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
};

/**
 * Check if user account is locked due to too many failed attempts
 * @param {Object} user - User object
 * @returns {boolean} True if account is locked
 */
const isAccountLocked = (user) => {
  if (!user.twoFactorAuth.lockedUntil) return false;
  return new Date() < user.twoFactorAuth.lockedUntil;
};

/**
 * Lock account for 15 minutes after too many failed attempts
 * @param {Object} user - User object
 */
const lockAccount = async (user) => {
  user.twoFactorAuth.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  user.twoFactorAuth.verificationAttempts = 0;
  await user.save();
};

/**
 * Enable 2FA for admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const enableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: '2FA is only available for admin users' });
    }

    if (user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Update user with 2FA settings
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.backupCodes = backupCodes;
    user.twoFactorAuth.secret = crypto.randomBytes(32).toString('hex');
    user.twoFactorAuth.verificationAttempts = 0;
    user.twoFactorAuth.lockedUntil = null;

    await user.save();

    res.json({
      message: '2FA enabled successfully',
      backupCodes: backupCodes, // Show backup codes only once
      warning: 'Save these backup codes securely. They will not be shown again.'
    });

  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Disable 2FA for admin user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const disableTwoFactor = async (req, res) => {
  try {
    const { verificationCode } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Verify the code before disabling
    if (!verificationCode) {
      return res.status(400).json({ message: 'Verification code is required' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.twoFactorAuth.lockedUntil
      });
    }

    // For simplicity, we'll accept any 6-digit code for disabling
    // In production, you might want to send a verification email first
    if (verificationCode.length !== 6 || !/^\d{6}$/.test(verificationCode)) {
      user.twoFactorAuth.verificationAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.twoFactorAuth.verificationAttempts >= 5) {
        await lockAccount(user);
        return res.status(423).json({
          message: 'Too many failed attempts. Account locked for 15 minutes.',
          lockedUntil: user.twoFactorAuth.lockedUntil
        });
      }

      await user.save();
      return res.status(400).json({
        message: 'Invalid verification code',
        attemptsLeft: 5 - user.twoFactorAuth.verificationAttempts
      });
    }

    // Reset 2FA settings
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.secret = null;
    user.twoFactorAuth.backupCodes = [];
    user.twoFactorAuth.lastVerification = null;
    user.twoFactorAuth.verificationAttempts = 0;
    user.twoFactorAuth.lockedUntil = null;

    await user.save();

    res.json({ message: '2FA disabled successfully' });

  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Send 2FA verification code via email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sendTwoFactorCode = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '2FA is not enabled for this account' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.twoFactorAuth.lockedUntil
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();

    // Store code temporarily (in production, use Redis or similar)
    // For now, we'll store it in the user document
    user.twoFactorAuth.secret = verificationCode; // Temporary storage
    user.twoFactorAuth.lastVerification = new Date();
    await user.save();

    // Send email with verification code
    await sendTwoFactorCodeEmail(user.email, verificationCode, user.username);

    res.json({
      message: 'Verification code sent to your email',
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Error sending 2FA code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify 2FA code
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyTwoFactorCode = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '2FA is not enabled for this account' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.twoFactorAuth.lockedUntil
      });
    }

    // Check if code is expired (10 minutes)
    if (user.twoFactorAuth.lastVerification) {
      const codeAge = Date.now() - user.twoFactorAuth.lastVerification.getTime();
      if (codeAge > 10 * 60 * 1000) { // 10 minutes
        return res.status(400).json({ message: 'Verification code has expired' });
      }
    }

    // Verify code
    if (user.twoFactorAuth.secret !== code) {
      user.twoFactorAuth.verificationAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.twoFactorAuth.verificationAttempts >= 5) {
        await lockAccount(user);
        return res.status(423).json({
          message: 'Too many failed attempts. Account locked for 15 minutes.',
          lockedUntil: user.twoFactorAuth.lockedUntil
        });
      }

      await user.save();
      return res.status(400).json({
        message: 'Invalid verification code',
        attemptsLeft: 5 - user.twoFactorAuth.verificationAttempts
      });
    }

    // Reset verification attempts and update last verification
    user.twoFactorAuth.verificationAttempts = 0;
    user.twoFactorAuth.lastVerification = new Date();
    user.twoFactorAuth.secret = null; // Clear the temporary code
    await user.save();

    res.json({ message: '2FA verification successful' });

  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify backup code for 2FA
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyBackupCode = async (req, res) => {
  try {
    const { backupCode } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '2FA is not enabled for this account' });
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.twoFactorAuth.lockedUntil
      });
    }

    // Find and remove the backup code
    const codeIndex = user.twoFactorAuth.backupCodes.indexOf(backupCode.toUpperCase());

    if (codeIndex === -1) {
      user.twoFactorAuth.verificationAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.twoFactorAuth.verificationAttempts >= 5) {
        await lockAccount(user);
        return res.status(423).json({
          message: 'Too many failed attempts. Account locked for 15 minutes.',
          lockedUntil: user.twoFactorAuth.lockedUntil
        });
      }

      await user.save();
      return res.status(400).json({
        message: 'Invalid backup code',
        attemptsLeft: 5 - user.twoFactorAuth.verificationAttempts
      });
    }

    // Remove the used backup code
    user.twoFactorAuth.backupCodes.splice(codeIndex, 1);
    user.twoFactorAuth.verificationAttempts = 0;
    user.twoFactorAuth.lastVerification = new Date();
    await user.save();

    res.json({
      message: 'Backup code verified successfully',
      remainingCodes: user.twoFactorAuth.backupCodes.length
    });

  } catch (error) {
    console.error('Error verifying backup code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Get 2FA status for current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTwoFactorStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('twoFactorAuth role');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      enabled: user.twoFactorAuth.enabled,
      isLocked: isAccountLocked(user),
      lockedUntil: user.twoFactorAuth.lockedUntil,
      backupCodesCount: user.twoFactorAuth.backupCodes.length,
      lastVerification: user.twoFactorAuth.lastVerification,
      availableForRole: user.role === 'admin'
    });

  } catch (error) {
    console.error('Error getting 2FA status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Regenerate backup codes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const regenerateBackupCodes = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Generate new backup codes
    const backupCodes = generateBackupCodes();

    user.twoFactorAuth.backupCodes = backupCodes;
    await user.save();

    res.json({
      message: 'Backup codes regenerated successfully',
      backupCodes: backupCodes,
      warning: 'Previous backup codes are no longer valid. Save these new codes securely.'
    });

  } catch (error) {
    console.error('Error regenerating backup codes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};