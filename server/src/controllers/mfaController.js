const { authenticator } = require('otplib');
const qrcode = require('qrcode');
const User = require('../models/User');

exports.setupMFA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (user.isTwoFactorEnabled) {
      return res.status(400).json({ success: false, error: { message: 'MFA is already enabled.' } });
    }

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, 'TaskFlow', secret);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);

    // Temporarily save secret
    user.twoFactorSecret = secret;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        qrCode: qrCodeDataUrl,
        secret
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyAndEnableMFA = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (user.isTwoFactorEnabled) {
      return res.status(400).json({ success: false, error: { message: 'MFA is already enabled.' } });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ success: false, error: { message: 'MFA setup not initialized.' } });
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });

    if (!isValid) {
      return res.status(400).json({ success: false, error: { message: 'Invalid MFA token.' } });
    }

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 12).toUpperCase()
    );

    user.isTwoFactorEnabled = true;
    user.backupCodes = backupCodes;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'MFA enabled successfully.',
        backupCodes
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.disableMFA = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ success: false, error: { message: 'MFA is not enabled.' } });
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = undefined;
    user.backupCodes = [];
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: 'MFA disabled successfully.' }
    });
  } catch (error) {
    next(error);
  }
};
