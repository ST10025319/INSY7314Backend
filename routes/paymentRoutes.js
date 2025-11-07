const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

router.post('/', authenticate, paymentController.addPayment);
router.get('/', authenticate, paymentController.viewTransactions);

module.exports = router;
