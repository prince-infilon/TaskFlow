const Organization = require('../models/Organization');

/**
 * Middleware to require a valid organization scope for requests.
 * Expects an 'x-organization-id' header and checks if the user is a member of that organization.
 */
exports.requireOrganization = async (req, res, next) => {
  try {
    const orgId = req.headers['x-organization-id'];

    if (!orgId) {
      return res.status(400).json({ success: false, error: { message: 'Missing x-organization-id header.' } });
    }

    const organization = await Organization.findById(orgId);
    if (!organization) {
      return res.status(404).json({ success: false, error: { message: 'Organization not found.' } });
    }

    // Admin global role can access any org for troubleshooting, or we strictly scope.
    // For now, let's strictly scope to org members.
    const member = organization.members.find(m => m.user.toString() === req.user._id.toString());
    
    // We allow global admin to bypass member check
    if (!member && req.user.globalRole !== 'admin') {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: You are not a member of this organization.' } });
    }

    req.organization = organization;
    req.orgRole = member ? member.role : 'admin'; // if global admin but not in members, treat as org admin
    next();
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: { message: 'Invalid organization ID format.' } });
    }
    next(error);
  }
};

/**
 * Middleware to authorize users based on organization roles.
 * Usage: authorizeOrg('admin', 'manager')
 */
exports.authorizeOrg = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.organization || !req.orgRole) {
      return res.status(500).json({ success: false, error: { message: 'requireOrganization middleware must be called first.' } });
    }

    if (!allowedRoles.includes(req.orgRole)) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden: You do not have permission to perform this action in this organization.' } });
    }

    next();
  };
};
