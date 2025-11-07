const express = require('express');
const router = express.Router();
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');
const employeeController = require('../controllers/employeeController');


router.post('/add', authenticate, authorizeRoles('employee'), employeeController.addEmployee);

module.exports = router;
