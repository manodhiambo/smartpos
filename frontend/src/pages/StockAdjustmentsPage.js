import React, { useState, useEffect, useCallback, useRef } from 'react';
import { stockAdjustmentsAPI, productsAPI } from '../services/api';
import {
  FaPlus, FaFilter, FaClipboardList, FaSearch, FaTimes,
  FaBoxes, FaExclamationTriangle
} from 'react-icons/fa';
import { formatCurrency, formatDate, formatDateTime, getDateRange } from '../utils/helpers';
import toast from 'react-hot-toast';

const ADJUSTMENT_TYPES = [
  { value: 'wastage',          label: 'Wastage',          direction: 'reduce', color: '#F59E0B', badgeClass: 'badge-warning' },
  { value: 'damage',           label: 'Damage',           direction: 'reduce', color: '#EF4444', badgeClass: 'badge-danger' },
  { value: 'theft',            label: 'Theft',            direction: 'reduce', color: '#DC2626', badgeClass: 'badge-danger' },
  { value: 'expiry',           label: 'Expiry',           direction: 'reduce', color: '#9CA3AF', badgeClass: 'badge-info' },
  { value: 'count_correction', label: 'Count Correction', direction: 'both',   color: '#3B82F6', badgeClass: 'badge-info' },
  { value: 'found',            label: 'Found',            direction: 'both',   color: '#10B981', badgeClass: 'badge-success' },
];

const getTypeInfo = (typeValue) => ADJUSTMENT_TYPES.find(t => t.value === typeValue) || ADJUSTMENT_TYPES[0];

const StockAdjustmentsPage = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
  });

  // Form modal
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productSearchLoading, setProductSearchLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const searchDebounceRef = useRef(null);

  // Form fields
  const [adjustmentType, setAdjustmentType] = useState('wastage');
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState('reduce'); // for count_correction / found
  const [reason, setReason] = useState('');

  const fetchAdjustments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined,
        endDate: filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined,
        type: filters.type || undefined,
      };
      const response = await stockAdjustmentsAPI.getAll(params);
      setAdjustments(response.data.data || []);
      setPagination(prev => ({ ...prev, ...(response.data.pagination || {}) }));
    } catch (error) {
      toast.error('Failed to load stock adjustments');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => {
    fetchAdjustments();
  }, [fetchAdjustments]);

  const handleDateRangePreset = (preset) => {
    const range = getDateRange(preset);
    setFilters(prev => ({
      ...prev,
      startDate: range.startDate.split('T')[0],
      endDate: range.endDate.split('T')[0],
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Debounced product search
  const handleProductSearchChange = (e) => {
    const val = e.target.value;
    setProductSearch(val);
    setSelectedProduct(null);

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!val.trim()) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setProductSearchLoading(true);
      try {
        const response = await productsAPI.search(val.trim());
        const results = response.data.data || response.data || [];
        setProductResults(results);
        setShowProductDropdown(true);
      } catch {
        setProductResults([]);
      } finally {
        setProductSearchLoading(false);
      }
    }, 350);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setProductSearch(product.name);
    setShowProductDropdown(false);
    setProductResults([]);
  };

  const handleTypeChange = (e) => {
    const val = e.target.value;
    setAdjustmentType(val);
    const info = getTypeInfo(val);
    if (info.direction !== 'both') {
      setDirection(info.direction);
    }
  };

  const typeInfo = getTypeInfo(adjustmentType);
  const isBothDirection = typeInfo.direction === 'both';

  // Compute new stock level preview
  const previewQty = (() => {
    if (!selectedProduct || !quantity || isNaN(parseFloat(quantity))) return null;
    const current = parseFloat(selectedProduct.quantity || selectedProduct.stock_quantity || 0);
    const adj = parseFloat(quantity);
    const effectiveDirection = isBothDirection ? direction : typeInfo.direction;
    return effectiveDirection === 'reduce' ? current - adj : current + adj;
  })();

  const resetForm = () => {
    setProductSearch('');
    setSelectedProduct(null);
    setProductResults([]);
    setShowProductDropdown(false);
    setAdjustmentType('wastage');
    setQuantity('');
    setDirection('reduce');
    setReason('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Please select a product');
      return;
    }
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }

    const effectiveDirection = isBothDirection ? direction : typeInfo.direction;
    const quantityAdjusted = effectiveDirection === 'reduce'
      ? -Math.abs(parseFloat(quantity))
      : Math.abs(parseFloat(quantity));

    setSubmitting(true);
    try {
      await stockAdjustmentsAPI.create({
        productId: selectedProduct.id,
        adjustmentType,
        quantityAdjusted,
        reason: reason.trim(),
      });
      toast.success('Stock adjustment recorded successfully');
      setShowModal(false);
      resetForm();
      fetchAdjustments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to record adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const currentStock = selectedProduct
    ? parseFloat(selectedProduct.quantity || selectedProduct.stock_quantity || 0)
    : null;

  return (
    <div className="stock-adjustments-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Stock Adjustments</h1>
          <p className="page-subtitle">Record wastage, damage, theft, and inventory corrections</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FaPlus /> Record Adjustment
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="date-range-presets">
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('today')}>Today</button>
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('week')}>This Week</button>
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('month')}>This Month</button>
        </div>
        <div className="filters-grid">
          <div className="input-group">
            <label>Start Date</label>
            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
          </div>
          <div className="input-group">
            <label>End Date</label>
            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
          </div>
          <div className="input-group">
            <label>Adjustment Type</label>
            <select name="type" value={filters.type} onChange={handleFilterChange}>
              <option value="">All Types</option>
              {ADJUSTMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <button className="btn btn-primary" onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}>
              <FaFilter /> Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Adjustments Table */}
      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Type</th>
                  <th>Qty Before</th>
                  <th>Adjusted</th>
                  <th>Qty After</th>
                  <th>Adjusted By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaClipboardList style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                      <p>No stock adjustments found</p>
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => {
                    const info = getTypeInfo(adj.adjustment_type);
                    const qtyAdj = parseFloat(adj.quantity_adjusted || 0);
                    const qtyBefore = parseFloat(adj.quantity_before || 0);
                    const qtyAfter = parseFloat(adj.quantity_after || (qtyBefore + qtyAdj));
                    return (
                      <tr key={adj.id}>
                        <td>{formatDateTime(adj.created_at)}</td>
                        <td>
                          <strong>{adj.product_name || adj.product?.name || '-'}</strong>
                          {adj.product?.sku && <br />}
                          {adj.product?.sku && <small style={{ color: '#9CA3AF' }}>{adj.product.sku}</small>}
                        </td>
                        <td>
                          <span className={`badge ${info.badgeClass}`}>{info.label}</span>
                        </td>
                        <td>{qtyBefore}</td>
                        <td>
                          <span style={{
                            fontWeight: 700,
                            color: qtyAdj < 0 ? '#DC2626' : '#16A34A',
                          }}>
                            {qtyAdj > 0 ? `+${qtyAdj}` : qtyAdj}
                          </span>
                        </td>
                        <td>{qtyAfter}</td>
                        <td>{adj.adjusted_by_name || adj.user?.name || 'N/A'}</td>
                        <td style={{ maxWidth: '200px', wordBreak: 'break-word' }}>{adj.reason || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
              >
                Previous
              </button>
              <span>Page {pagination.page} of {pagination.totalPages}</span>
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

      {/* Record Adjustment Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div
            className="modal-content"
            style={{ maxWidth: '520px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Record Stock Adjustment</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}><FaTimes /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Product Search */}
              <div className="input-group" style={{ marginBottom: '16px', position: 'relative' }}>
                <label>Search Product *</label>
                <div style={{ position: 'relative' }}>
                  <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={handleProductSearchChange}
                    placeholder="Type product name..."
                    style={{ padding: '10px 14px 10px 36px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontSize: '14px' }}
                  />
                  {productSearchLoading && (
                    <div className="spinner" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px' }}></div>
                  )}
                </div>

                {showProductDropdown && productResults.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}>
                    {productResults.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #F3F4F6',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                      >
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{product.name}</p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{product.sku || product.barcode || ''}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#374151' }}>
                            Stock: <strong>{product.quantity || product.stock_quantity || 0}</strong>
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>{formatCurrency(product.selling_price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {showProductDropdown && productResults.length === 0 && !productSearchLoading && productSearch.trim() && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px',
                    padding: '16px', textAlign: 'center', color: '#9CA3AF', zIndex: 100,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                  }}>
                    No products found
                  </div>
                )}
              </div>

              {/* Selected product info card */}
              {selectedProduct && (
                <div style={{ background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, color: '#3730A3' }}>{selectedProduct.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6366F1' }}>
                        SKU: {selectedProduct.sku || '-'} &nbsp;|&nbsp; Category: {selectedProduct.category || '-'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Current Stock</p>
                      <p style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#4F46E5' }}>
                        {currentStock}
                      </p>
                    </div>
                  </div>

                  {/* Stock preview */}
                  {previewQty !== null && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #C7D2FE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: '#4338CA', fontWeight: 600 }}>After adjustment:</span>
                      <span style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: previewQty < 0 ? '#DC2626' : previewQty === 0 ? '#D97706' : '#16A34A',
                      }}>
                        {previewQty}
                        {previewQty < 0 && <FaExclamationTriangle style={{ marginLeft: '6px', fontSize: '14px' }} />}
                      </span>
                    </div>
                  )}
                  {previewQty !== null && previewQty < 0 && (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#DC2626', fontWeight: 600 }}>
                      Warning: This will result in negative stock!
                    </p>
                  )}
                </div>
              )}

              {/* Adjustment Type */}
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>Adjustment Type *</label>
                <select
                  value={adjustmentType}
                  onChange={handleTypeChange}
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontSize: '14px' }}
                >
                  {ADJUSTMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <small style={{ marginTop: '4px', display: 'block', color: typeInfo.direction === 'reduce' ? '#DC2626' : '#16A34A' }}>
                  {typeInfo.direction === 'reduce'
                    ? 'This type reduces stock levels'
                    : 'This type can increase or decrease stock'}
                </small>
              </div>

              {/* Direction (only for 'both' types) */}
              {isBothDirection && (
                <div className="input-group" style={{ marginBottom: '16px' }}>
                  <label>Direction *</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                      <input
                        type="radio"
                        name="direction"
                        value="reduce"
                        checked={direction === 'reduce'}
                        onChange={() => setDirection('reduce')}
                      />
                      <span style={{ color: '#DC2626', fontWeight: 600 }}>Reduce Stock</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal' }}>
                      <input
                        type="radio"
                        name="direction"
                        value="increase"
                        checked={direction === 'increase'}
                        onChange={() => setDirection('increase')}
                      />
                      <span style={{ color: '#16A34A', fontWeight: 600 }}>Increase Stock</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>Quantity *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  required
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontSize: '14px' }}
                />
              </div>

              {/* Reason */}
              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label>Reason *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows="3"
                  required
                  placeholder="Describe why this adjustment is being made..."
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : <><FaBoxes /> Record Adjustment</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAdjustmentsPage;
