const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create supplier (admin, manager, storekeeper)
router.post('/', 
  authorize('admin', 'manager', 'storekeeper'), 
  supplierController.createSupplier
);

// Get all suppliers
router.get('/', 
  authorize('admin', 'manager', 'storekeeper'), 
  supplierController.getAllSuppliers
);

// Get suppliers with outstanding balance
router.get('/with-balance', 
  authorize('admin', 'manager'), 
  supplierController.getSuppliersWithBalance
);

// Get supplier by ID
router.get('/:id', 
  authorize('admin', 'manager', 'storekeeper'), 
  supplierController.getSupplierById
);

// Get supplier statement
router.get('/:id/statement', 
  authorize('admin', 'manager'), 
  supplierController.getSupplierStatement
);

// Update supplier
router.put('/:id', 
  authorize('admin', 'manager', 'storekeeper'), 
  supplierController.updateSupplier
);

// Delete supplier (admin, manager)
router.delete('/:id', 
  authorize('admin', 'manager'), 
  supplierController.deleteSupplier
);

module.exports = router;
