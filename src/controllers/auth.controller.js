import { validationResult } from "express-validator";
import { signToken } from "../utils/jwt.js";
import User from "../models/user.models.js";
import { sendTwoFactorCodeEmail, sendVerificationEmail } from "../services/emailService.js";
import crypto from "crypto";

export const register = async (req, res) => {
   const errors = validationResult(req);
   if (!errors.isEmpty())
     return res.status(400).json({ errors: errors.array() });
   const {
     username,
     email,
     password,
     fullName,
     mobile,
     department,
     enrollmentNo,
   } = req.body;
   const exists = await User.findOne({ $or: [{ email }, { username }] });
   if (exists) return res.status(409).json({ message: "User already exists" });

   // Generate verification token
   const verificationToken = crypto.randomBytes(32).toString('hex');
   const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

   const user = await User.create({
     username,
     email,
     password,
     fullName,
     mobile,
     department,
     enrollmentNo,
     emailVerificationToken: verificationToken,
     emailVerificationExpires: verificationExpires,
   });

   // Send verification email
   try {
     const { sendVerificationEmail } = await import('../services/emailService.js');
     await sendVerificationEmail(email, verificationToken, fullName);
   } catch (emailError) {
     console.error('Failed to send verification email:', emailError);
     // Don't fail registration if email fails, but log it
   }

   res.status(201).json({
     message: "Registration successful. Please check your email to verify your account.",
     user: { ...user.toObject(), password: undefined, emailVerificationToken: undefined, emailVerificationExpires: undefined }
   });
};

export const login = async (req, res) => {
   const { email, password } = req.body;
   const user = await User.findOne({ email });
   if (!user) return res.status(401).json({ message: "Invalid credentials" });
   const match = await user.comparePassword(password);
   if (!match) return res.status(401).json({ message: "Invalid credentials" });

   // Check if email is verified (only for admin users)
   if (!user.emailVerified && user.role === 'admin') {
     // Send verification email
     try {
       const verificationToken = crypto.randomBytes(32).toString('hex');
       const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

       user.emailVerificationToken = verificationToken;
       user.emailVerificationExpires = verificationExpires;
       await user.save();

       await sendVerificationEmail(user.email, verificationToken, user.fullName);
     } catch (emailError) {
       console.error('Failed to send verification email:', emailError);
       // Continue with the response even if email fails
     }

     return res.status(403).json({
       message: "Please verify your email before logging in. A verification email has been sent.",
       error: "EMAIL_NOT_VERIFIED",
       emailNotVerified: true
     });
   }

   // Check if 2FA is enabled for admin users
   if (user.role === 'admin' && user.twoFactorAuth.enabled) {
     // Return partial response indicating 2FA is required
     return res.json({
       requiresTwoFactor: true,
       user: {
         _id: user._id,
         username: user.username,
         email: user.email,
         role: user.role,
         twoFactorEnabled: true
       }
     });
   }

   // Generate token for non-admin users or admins without 2FA
   const token = signToken({ id: user._id, role: user.role });
   res.json({ token, user: { ...user.toObject(), password: undefined } });
};

export const me = async (req, res) => {
  res.json({ user: req.user });
};

export const updateProfile = async (req, res) => {
  const fields = ["fullName", "mobile", "department", "preferences"];
  const updates = {};
  fields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    select: '-password'
  });
  res.json({ user });
};


/**
 * Request password reset
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({
      reset_password_token: resetToken,
      reset_password_expires: resetExpires,
    });

    // Get user details for name
    const userDetails = await UserDetails.findOne({
      where: { user_id: user.user_id },
    });

    // Send password reset email
    try {
      await sendPasswordResetEmail(
        email,
        resetToken,
        userDetails?.firstname || "User"
      );
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError.message);
    }

    res.json({
      success: true,
      message:
        "If an account with that email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset request failed",
      error: "RESET_REQUEST_FAILED",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Find user
    const user = await User.findByPk(decoded.userId);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        error: "INVALID_REFRESH_TOKEN",
      });
    }

    // Generate new token pair
    const tokens = generateTokenPair(user);

    res.json({
      success: true,
      message: "Tokens refreshed successfully",
      data: { tokens },
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      error: "INVALID_REFRESH_TOKEN",
    });
  }
};

/**
 * Logout user (client-side token removal)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const logout = async (req, res) => {
  try {
    // In a more advanced implementation, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
      error: "LOGOUT_FAILED",
    });
  }
};

/**
 * Reset password
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findByResetToken(token);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
        error: "INVALID_TOKEN",
      });
    }

    // Update password and clear reset token
    await user.update({
      password_hash: password, // Will be hashed by the model hook
      reset_password_token: null,
      reset_password_expires: null,
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset failed",
      error: "RESET_FAILED",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token"
      });
    }

    // Mark email as verified and clear verification fields
    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully. You can now log in to your account."
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Email verification failed"
    });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: "If an account with that email exists, a verification link has been sent"
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified"
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send verification email
    try {
      const { sendVerificationEmail } = await import('../services/emailService.js');
      await sendVerificationEmail(email, verificationToken, user.fullName);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send verification email"
      });
    }

    res.json({
      success: true,
      message: "Verification email sent successfully"
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification email"
    });
  }
};

/**
 * Send 2FA code for login verification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const sendTwoFactorLoginCode = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin' || !user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: 'Invalid request or 2FA not enabled' });
    }

    // Check if account is locked
    if (user.twoFactorAuth.lockedUntil && new Date() < user.twoFactorAuth.lockedUntil) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.twoFactorAuth.lockedUntil
      });
    }

    // Generate verification code
    const verificationCode = crypto.randomInt(100000, 999999).toString();

    // Store code temporarily
    user.twoFactorAuth.secret = verificationCode;
    user.twoFactorAuth.lastVerification = new Date();
    user.twoFactorAuth.verificationAttempts = 0;
    await user.save();

    // Send email with verification code
    await sendTwoFactorCodeEmail(user.email, verificationCode, user.username);

    res.json({
      message: 'Verification code sent to your email',
      expiresIn: '10 minutes'
    });

  } catch (error) {
    console.error('Error sending 2FA login code:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Verify 2FA code and complete login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyTwoFactorLogin = async (req, res) => {
  try {
    const { userId, code } = req.body;

    const user = await User.findById(userId);
    if (!user || user.role !== 'admin' || !user.twoFactorAuth.enabled) {
      return res.status(400).json({ message: 'Invalid request' });
    }

    // Check if account is locked
    if (user.twoFactorAuth.lockedUntil && new Date() < user.twoFactorAuth.lockedUntil) {
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.twoFactorAuth.lockedUntil
      });
    }

    // Check if code is expired (10 minutes)
    if (user.twoFactorAuth.lastVerification) {
      const codeAge = Date.now() - user.twoFactorAuth.lastVerification.getTime();
      if (codeAge > 10 * 60 * 1000) {
        return res.status(400).json({ message: 'Verification code has expired' });
      }
    }

    // Verify code
    if (user.twoFactorAuth.secret !== code) {
      user.twoFactorAuth.verificationAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.twoFactorAuth.verificationAttempts >= 5) {
        user.twoFactorAuth.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        await user.save();
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

    // Reset verification attempts and generate token
    user.twoFactorAuth.verificationAttempts = 0;
    user.twoFactorAuth.lastVerification = new Date();
    user.twoFactorAuth.secret = null; // Clear the temporary code
    await user.save();

    const token = signToken({ id: user._id, role: user.role });
    res.json({
      token,
      user: { ...user.toObject(), password: undefined },
      message: 'Login successful with 2FA verification'
    });

  } catch (error) {
    console.error('Error verifying 2FA login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
