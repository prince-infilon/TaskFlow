const User = require('../models/User');

/**
 * Ensures the requesting user has either Admin or Manager globalRole.
 */
exports.requireAdminOrManager = (req, res, next) => {
  if (!req.user || !['admin', 'manager'].includes(req.user.globalRole)) {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: Requires admin or manager privileges.' }
    });
  }
  next();
};

/**
 * Ensures the requesting user has Admin globalRole.
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.globalRole !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: Requires admin privileges.' }
    });
  }
  next();
};

/**
 * Authorizes access to a target user based on strict hierarchical rules:
 * - Admin: can access any user.
 * - Manager: can ONLY access members assigned to them (targetUser.managerId === req.user._id).
 * - Member: cannot access any target user via management endpoints.
 */
exports.authorizeTargetUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found.' }
      });
    }

    if (req.user.globalRole === 'admin') {
      req.targetUser = targetUser;
      return next();
    }

    if (req.user.globalRole === 'manager') {
      const isAssignedMember =
        targetUser.globalRole === 'member' &&
        targetUser.managerId &&
        targetUser.managerId.toString() === req.user._id.toString();

      if (!isAssignedMember) {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden: You do not have access to this user.' }
        });
      }

      req.targetUser = targetUser;
      return next();
    }

    return res.status(403).json({
      success: false,
      error: { message: 'Forbidden: Insufficient permissions.' }
    });
  } catch (error) {
    next(error);
  }
};
