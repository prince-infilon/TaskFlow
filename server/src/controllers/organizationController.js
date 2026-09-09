const Organization = require('../models/Organization');
const User = require('../models/User');
const { checkMemberLimit } = require('../services/limitService');

exports.getMyOrganizations = async (req, res, next) => {
  try {
    const orgs = await Organization.find({ 'members.user': req.user._id }).populate('owner', 'name email avatarUrl');
    res.status(200).json({ success: true, organizations: orgs });
  } catch (error) {
    next(error);
  }
};

exports.createOrganization = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Organization name is required.' } });
    }

    const newOrg = new Organization({
      name: name.trim(),
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    await newOrg.save();
    res.status(201).json({ success: true, organization: newOrg });
  } catch (error) {
    next(error);
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.organization._id).populate('members.user', 'name email avatarUrl');
    res.status(200).json({ success: true, members: org.members });
  } catch (error) {
    next(error);
  }
};

exports.inviteMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    // Enforce member limit
    await checkMemberLimit(req.organization._id);

    const userToInvite = await User.findOne({ email: email.toLowerCase().trim() });
    
    if (!userToInvite) {
      return res.status(404).json({ success: false, error: { message: 'User not found with this email.' } });
    }

    const org = await Organization.findById(req.organization._id);
    
    if (org.members.some(m => m.user.toString() === userToInvite._id.toString())) {
      return res.status(400).json({ success: false, error: { message: 'User is already a member.' } });
    }

    org.members.push({ user: userToInvite._id, role: role || 'member' });
    await org.save();

    res.status(200).json({ success: true, message: 'Member invited successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['admin', 'manager', 'member'].includes(role)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid role.' } });
    }

    const org = await Organization.findById(req.organization._id);
    const member = org.members.find(m => m.user.toString() === userId);
    
    if (!member) {
      return res.status(404).json({ success: false, error: { message: 'Member not found in organization.' } });
    }

    // Prevent changing owner's role or removing last admin (basic protection)
    if (org.owner.toString() === userId && role !== 'admin') {
      return res.status(400).json({ success: false, error: { message: 'Cannot demote the organization owner.' } });
    }

    member.role = role;
    await org.save();

    res.status(200).json({ success: true, message: 'Member role updated.' });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const org = await Organization.findById(req.organization._id);
    
    if (org.owner.toString() === userId) {
      return res.status(400).json({ success: false, error: { message: 'Cannot remove the organization owner.' } });
    }

    org.members = org.members.filter(m => m.user.toString() !== userId);
    await org.save();

    res.status(200).json({ success: true, message: 'Member removed.' });
  } catch (error) {
    next(error);
  }
};
