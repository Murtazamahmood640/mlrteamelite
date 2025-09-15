import { Router } from 'express';
import { protect, authorize } from '../middlewares/auth.js';
import {
  enableTwoFactor,
  disableTwoFactor,
  sendTwoFactorCode,
  verifyTwoFactorCode,
  verifyBackupCode,
  getTwoFactorStatus,
  regenerateBackupCodes
} from '../controllers/twoFactor.controller.js';

const r = Router();

// All routes require authentication and admin role
r.use(protect);
r.use(authorize('admin'));

// Get 2FA status
r.get('/status', getTwoFactorStatus);

// Enable 2FA
r.post('/enable', enableTwoFactor);

// Send verification code
r.post('/send-code', sendTwoFactorCode);

// Verify 2FA code
r.post('/verify-code', verifyTwoFactorCode);

// Verify backup code
r.post('/verify-backup', verifyBackupCode);

// Disable 2FA
r.post('/disable', disableTwoFactor);

// Regenerate backup codes
r.post('/regenerate-backup', regenerateBackupCodes);

export default r;