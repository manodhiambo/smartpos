const express = require('express');
const router = express.Router();
const shiftsController = require('../controllers/shiftsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Open a new shift
router.post('/open', shiftsController.openShift);

// Get the current open shift
router.get('/current', shiftsController.getCurrentShift);

// Get all shifts (paginated)
router.get('/', shiftsController.getAllShifts);

// Close a specific shift (admin or manager only)
router.post('/:shiftId/close',
  authorize('admin', 'manager'),
  shiftsController.closeShift
);

// Get detailed summary for a specific shift
router.get('/:shiftId/summary', shiftsController.getShiftSummary);

module.exports = router;
