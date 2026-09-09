const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const { requireOrganization, authorizeOrg } = require('../middleware/orgMiddleware');
const orgController = require('../controllers/organizationController');
const { createOrgValidation, inviteMemberValidation, updateMemberRoleValidation } = require('../middleware/validation/orgValidation');

// Requires authentication but NOT a specific organization in headers
router.use(authenticate);

router.get('/', orgController.getMyOrganizations);
router.post('/', createOrgValidation, orgController.createOrganization);

// Requires a specific organization via x-organization-id header
router.use(requireOrganization);

router.get('/:id/members', orgController.getMembers);
router.post('/:id/members', authorizeOrg('admin', 'manager'), inviteMemberValidation, orgController.inviteMember);
router.patch('/:id/members/:userId', authorizeOrg('admin'), updateMemberRoleValidation, orgController.updateMemberRole);
router.delete('/:id/members/:userId', authorizeOrg('admin'), orgController.removeMember);

module.exports = router;
