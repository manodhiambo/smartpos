const express = require('express');
const router = express.Router();
const returnsController = require('../controllers/returnsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create a return
router.post('/', returnsController.createReturn);

// Get all returns (paginated)
router.get('/', returnsController.getAllReturns);

// Get a single return with items
router.get('/:returnId', returnsController.getReturnById);

module.exports = router;
