const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const Organization = require('../models/Organization');
const AuthAuditLog = require('../models/AuthAuditLog');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const sendResponseWithTokens = async (req, res, user, statusCode = 200) => {
  const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  // If this is a refresh operation, revoke the old session if one existed in the request
  if (req.currentSessionId) {
    await Session.findByIdAndDelete(req.currentSessionId);
  }

  // Create new session
  await Session.create({
    user: user._id,
    refreshTokenHash: hashToken(refreshToken),
    userAgent: req.headers['user-agent'] || 'Unknown Device',
    ipAddress: req.ip || req.connection.remoteAddress,
    expiresAt: new Date(Date.now() + maxAge)
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'Strict' : 'Lax',
    maxAge
  });

  res.status(statusCode).json({
    success: true,
    data: {
      user,
      token: accessToken
    }
  });
};

const logAudit = async (userId, action, req, metadata = {}) => {
  try {
    await AuthAuditLog.create({
      user: userId,
      action,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      metadata
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: { message: 'An account with this email address already exists. Please use a different email address.' } });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await User.create({
      name,
      email,
      passwordHash
    });

    // Create a default organization for the new user
    const org = new Organization({
      name: `${newUser.name}'s Workspace`,
      owner: newUser._id,
      members: [{ user: newUser._id, role: 'admin' }]
    });
    await org.save();

    await sendResponseWithTokens(req, res, newUser, 201);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, error: { message: 'Account is deactivated.' } });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' } 
      });
    }

    const isMatch = user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!isMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 mins
        await logAudit(user._id, 'lockout', req);
      }
      await user.save();
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    // Reset lockout counters on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    if (user.isTwoFactorEnabled) {
      // Issue a temporary token to complete MFA
      const mfaToken = jwt.sign({ userId: user._id, mfaPending: true }, process.env.JWT_SECRET, { expiresIn: '5m' });
      return res.status(200).json({
        success: true,
        data: {
          requiresMfa: true,
          mfaToken
        }
      });
    }

    await logAudit(user._id, 'login', req);
    await sendResponseWithTokens(req, res, user, 200);
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    await Session.findOneAndDelete({ refreshTokenHash: hashToken(refreshToken) });
  }

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax',
  });
  
  if (req.user) {
    await logAudit(req.user._id, 'logout', req);
  }

  res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: { message: 'No refresh token provided.' } });
    }

    const hashedToken = hashToken(refreshToken);
    const session = await Session.findOne({ refreshTokenHash: hashedToken }).populate('user');
    
    if (!session) {
      // Reuse detection or invalid token
      // If we could determine *which* user this old token belonged to, we could revoke all their sessions.
      // Since it's a random hex string, without storing old hashes, we can't easily track the user.
      // Wait, we could search for an inactive session if we kept them, but for now we just reject it.
      res.clearCookie('refreshToken');
      return res.status(401).json({ success: false, error: { message: 'Invalid or expired refresh token.' } });
    }

    if (!session.isValid) {
      // Token reuse detected (session was explicitly marked invalid but retained)
      await Session.deleteMany({ user: session.user._id }); // Revoke ALL sessions
      await logAudit(session.user._id, 'token_revoked', req, { reason: 'reuse_detected' });
      res.clearCookie('refreshToken');
      return res.status(401).json({ success: false, error: { message: 'Session compromised. Please login again.' } });
    }

    const user = session.user;
    if (!user || !user.isActive) {
      await Session.findByIdAndDelete(session._id);
      res.clearCookie('refreshToken');
      return res.status(401).json({ success: false, error: { message: 'Invalid refresh token or inactive user.' } });
    }

    // Set current session to delete it when replacing
    req.currentSessionId = session._id;
    await sendResponseWithTokens(req, res, user, 200);
  } catch (error) {
    next(error);
  }
};

exports.oauthCallback = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=oauth_failed`);
    }

    const user = req.user;

    const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = crypto.randomBytes(40).toString('hex');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    await Session.create({
      user: user._id,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || req.connection.remoteAddress,
      expiresAt: new Date(Date.now() + maxAge)
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'Strict' : 'Lax',
      maxAge
    });

    await logAudit(user._id, 'login', req, { method: 'oauth' });

    res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/auth/callback?token=${accessToken}`);
  } catch (error) {
    next(error);
  }
};

exports.mfaChallenge = async (req, res, next) => {
  try {
    const { mfaToken, code } = req.body;
    
    if (!mfaToken || !code) {
      return res.status(400).json({ success: false, error: { message: 'Missing MFA token or code.' } });
    }

    const decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
    if (!decoded.mfaPending) {
      return res.status(400).json({ success: false, error: { message: 'Invalid MFA token.' } });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: { message: 'User not found or inactive.' } });
    }

    const { authenticator } = require('otplib');
    
    // Check if code is a backup code
    const isBackupCode = user.backupCodes && user.backupCodes.includes(code.toUpperCase());
    
    if (isBackupCode) {
      // Remove the used backup code
      user.backupCodes = user.backupCodes.filter(c => c !== code.toUpperCase());
      await user.save();
    } else {
      const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
      if (!isValid) {
        return res.status(401).json({ success: false, error: { message: 'Invalid MFA code.' } });
      }
    }

    await logAudit(user._id, 'login', req, { mfa: true, usedBackupCode: isBackupCode });
    await sendResponseWithTokens(req, res, user, 200);
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: { message: 'MFA token expired. Please login again.' } });
    }
    next(error);
  }
};
