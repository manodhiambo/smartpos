import React, { useState, useEffect } from 'react';
import { purchasesAPI, suppliersAPI, productsAPI } from '../services/api';
import { FaPlus, FaSearch, FaTruck, FaEye, FaMoneyBillWave } from 'react-icons/fa';
import { formatCurrency, formatDateTime } from '../utils/helpers';
import toast from 'react-hot-toast';

const PurchasesPage = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [formData, setFormData] = useState({
    supplierId: '',
    items: [],
    paymentMethod: 'credit',
    amountPaid: 0,
    notes: ''
  });
  const [itemForm, setItemForm] = useState({
    productId: '',
    quantity: 1,
    unitCost: 0
  });

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, [pagination.page]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const response = await purchasesAPI.getAll({
        page: pagination.page,
        limit: pagination.limit
      });
      setPurchases(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      toast.error('Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await suppliersAPI.getAll({ limit: 100 });
      setSuppliers(response.data.data);
    } catch (error) {
      console.error('Failed to load suppliers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.data.data);
    } catch (error) {
      console.error('Failed to load products');
    }
  };

  const handleAddItem = () => {
    if (!itemForm.productId || itemForm.quantity <= 0 || itemForm.unitCost <= 0) {
      toast.error('Please fill all item fields');
      return;
    }

    const product = products.find(p => p.id === parseInt(itemForm.productId));
    if (!product) return;

    const newItem = {
      productId: product.id,
      productName: product.name,
      quantity: parseFloat(itemForm.quantity),
      unitCost: parseFloat(itemForm.unitCost),
      totalCost: parseFloat(itemForm.quantity) * parseFloat(itemForm.unitCost)
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setItemForm({ productId: '', quantity: 1, unitCost: 0 });
  };

  const handleRemoveItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      await purchasesAPI.create(formData);
      toast.success('Purchase recorded successfully');
      setShowModal(false);
      resetForm();
      fetchPurchases();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record purchase');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (purchaseId) => {
    try {
      const response = await purchasesAPI.getById(purchaseId);
      setSelectedPurchase(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load purchase details');
    }
  };

  const resetForm = () => {
    setFormData({
      supplierId: '',
      items: [],
      paymentMethod: 'credit',
      amountPaid: 0,
      notes: ''
    });
    setItemForm({ productId: '', quantity: 1, unitCost: 0 });
  };

  return (
    <div className="purchases-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Manage supplier purchases</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> New Purchase
        </button>
      </div>

      {/* Purchases Table */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Total Cost</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaTruck style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }} />
                      <p>No purchases found</p>
                    </td>
                  </tr>
                ) : (
                  purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td>
                        <strong className="receipt-number">{purchase.invoice_no}</strong>
                      </td>
                      <td>{formatDateTime(purchase.created_at)}</td>
                      <td>{purchase.supplier_name}</td>
                      <td className="amount-cell">{formatCurrency(purchase.total_cost)}</td>
                      <td>{formatCurrency(purchase.amount_paid)}</td>
                      <td>
                        {purchase.balance > 0 ? (
                          <strong style={{ color: 'var(--danger-color)' }}>
                            {formatCurrency(purchase.balance)}
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--success-color)' }}>Paid</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-success">Completed</span>
                      </td>
                      <td>
                        <button
                          className="btn-icon btn-icon-primary"
                          onClick={() => handleViewDetails(purchase.id)}
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* New Purchase Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Purchase</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Supplier *</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add Items */}
              <div className="items-section">
                <h3>Add Items</h3>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Product</label>
                    <select
                      value={itemForm.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === parseInt(e.target.value));
                        setItemForm(prev => ({
                          ...prev,
                          productId: e.target.value,
                          unitCost: product ? product.cost_price : 0
                        }));
                      }}
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.barcode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm(prev => ({ ...prev, quantity: e.target.value }))}
                      min="0.01"
                      step="0.01"
                    />
                  </div>

                  <div className="input-group">
                    <label>Unit Cost</label>
                    <input
                      type="number"
                      value={itemForm.unitCost}
                      onChange={(e) => setItemForm(prev => ({ ...prev, unitCost: e.target.value }))}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="input-group">
                    <label>&nbsp;</label>
                    <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Items List */}
                {formData.items.length > 0 && (
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Cost</th>
                        <th>Total</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unitCost)}</td>
                          <td>{formatCurrency(item.totalCost)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-icon btn-icon-danger"
                              onClick={() => handleRemoveItem(index)}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3"><strong>Total:</strong></td>
                        <td colSpan="2"><strong>{formatCurrency(calculateTotal())}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <option value="credit">Credit</option>
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Amount Paid</label>
                  <input
                    type="number"
                    value={formData.amountPaid}
                    onChange={(e) => setFormData(prev => ({ ...prev, amountPaid: e.target.value }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || formData.items.length === 0}>
                  {loading ? 'Recording...' : 'Record Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Details Modal */}
      {showDetailsModal && selectedPurchase && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Purchase Details - {selectedPurchase.invoice_no}</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="sale-details">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Invoice Number:</label>
                  <span>{selectedPurchase.invoice_no}</span>
                </div>
                <div className="detail-item">
                  <label>Date:</label>
                  <span>{formatDateTime(selectedPurchase.created_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Supplier:</label>
                  <span>{selectedPurchase.supplier_name}</span>
                </div>
                <div className="detail-item">
                  <label>Payment Method:</label>
                  <span className="badge badge-info">{selectedPurchase.payment_method}</span>
                </div>
              </div>

              <div className="items-section">
                <h3>Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Cost</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPurchase.items?.map((item, index) => (
                      <tr key={index}>
                        <td>{item.product_name}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_cost)}</td>
                        <td>{formatCurrency(item.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedPurchase.subtotal)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total Cost:</span>
                  <span>{formatCurrency(selectedPurchase.total_cost)}</span>
                </div>
                <div className="total-row">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(selectedPurchase.amount_paid)}</span>
                </div>
                <div className="total-row">
                  <span>Balance:</span>
                  <span style={{ color: selectedPurchase.balance > 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                    {formatCurrency(selectedPurchase.balance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
