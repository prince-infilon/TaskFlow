const express = require('express');
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireOrganization } = require('../middleware/orgMiddleware');

const router = express.Router();

// The webhook must use the raw body, so it's handled in server.js directly, or we can use express.raw() here.
// But we'll assume express.json() is applied globally, so we'll route webhook separately in server.js.

// Protected routes
router.use(authenticate);
router.use(requireOrganization);

router.post('/create-checkout-session', billingController.createCheckoutSession);
router.post('/customer-portal', billingController.createCustomerPortal);

module.exports = router;
