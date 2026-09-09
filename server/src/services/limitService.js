const Organization = require('../models/Organization');
const Board = require('../models/Board');

const PLAN_LIMITS = {
  free: {
    maxBoards: 1,
    maxMembers: 3
  },
  pro: {
    maxBoards: 10,
    maxMembers: 15
  },
  enterprise: {
    maxBoards: Infinity,
    maxMembers: Infinity
  }
};

/**
 * Get the effective plan for an organization
 * @param {Object} organization 
 * @returns {String} 'free', 'pro', or 'enterprise'
 */
const getEffectivePlan = (organization) => {
  const sub = organization.subscription;
  if (!sub || !sub.plan || sub.status !== 'active') {
    return 'free';
  }
  return sub.plan;
};

exports.getEffectivePlan = getEffectivePlan;
exports.PLAN_LIMITS = PLAN_LIMITS;

/**
 * Check if the organization can create a new board
 * @param {String} orgId 
 * @returns {Boolean} true if allowed, throws Error if limit reached
 */
exports.checkBoardLimit = async (orgId) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found');

  const plan = getEffectivePlan(org);
  const limit = PLAN_LIMITS[plan].maxBoards;

  if (limit === Infinity) return true;

  const currentBoardsCount = await Board.countDocuments({ organization: orgId });

  if (currentBoardsCount >= limit) {
    const error = new Error(`Board limit reached for ${plan} plan (${limit} boards max). Please upgrade to create more boards.`);
    error.code = 'LIMIT_EXCEEDED';
    error.status = 403;
    throw error;
  }

  return true;
};

/**
 * Check if the organization can add a new member
 * @param {String} orgId 
 * @returns {Boolean} true if allowed, throws Error if limit reached
 */
exports.checkMemberLimit = async (orgId) => {
  const org = await Organization.findById(orgId);
  if (!org) throw new Error('Organization not found');

  const plan = getEffectivePlan(org);
  const limit = PLAN_LIMITS[plan].maxMembers;

  if (limit === Infinity) return true;

  const currentMembersCount = org.members.length;

  if (currentMembersCount >= limit) {
    const error = new Error(`Member limit reached for ${plan} plan (${limit} members max). Please upgrade to add more members.`);
    error.code = 'LIMIT_EXCEEDED';
    error.status = 403;
    throw error;
  }

  return true;
};
