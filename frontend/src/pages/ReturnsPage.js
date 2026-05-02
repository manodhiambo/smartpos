import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { returnsAPI, salesAPI } from '../services/api';
import {
  FaUndo, FaSearch, FaEye, FaCheckSquare, FaSquare,
  FaFilter, FaReceipt, FaTimes
} from 'react-icons/fa';
import { formatCurrency, formatDate, formatDateTime, getDateRange } from '../utils/helpers';
import toast from 'react-hot-toast';

const ReturnsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // History state
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // New return flow state
  const [showNewReturn, setShowNewReturn] = useState(false);
  const [searchReceiptNo, setSearchReceiptNo] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [foundSale, setFoundSale] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [returnReason, setReturnReason] = useState('');
  const [refundMethod, setRefundMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, count: 0, pending: 0 });

  // Check for receipt query param on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const receipt = params.get('receipt');
    if (receipt) {
      setShowNewReturn(true);
      setSearchReceiptNo(receipt);
    }
  }, [location.search]);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined,
        endDate: filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined,
      };
      const response = await returnsAPI.getAll(params);
      const data = response.data.data || [];
      setReturns(data);
      setPagination(prev => ({ ...prev, ...(response.data.pagination || {}) }));

      // Compute stats from returned data
      const total = data.reduce((sum, r) => sum + parseFloat(r.refund_amount || 0), 0);
      const pending = data.filter(r => r.status === 'pending').length;
      setStats({ total, count: data.length, pending });
    } catch (error) {
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

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

  // Search for a sale by receipt number
  const handleSearchSale = async () => {
    if (!searchReceiptNo.trim()) {
      toast.error('Please enter a receipt number');
      return;
    }
    setSearchLoading(true);
    setFoundSale(null);
    setSelectedItems({});
    try {
      // Try to get all sales and find by receipt_no
      const response = await salesAPI.getAll({ search: searchReceiptNo.trim(), limit: 5 });
      const sales = response.data.data || [];
      const match = sales.find(s => s.receipt_no === searchReceiptNo.trim());
      if (match) {
        // Fetch full sale with items
        const detailRes = await salesAPI.getById(match.id);
        const sale = detailRes.data.data;
        setFoundSale(sale);
        // Pre-initialise selectedItems for each item
        const init = {};
        (sale.items || []).forEach(item => {
          init[item.id] = {
            selected: false,
            quantity: item.quantity,
            maxQty: item.quantity,
            condition: 'good',
            restock: true,
          };
        });
        setSelectedItems(init);
      } else {
        toast.error('No sale found with that receipt number');
      }
    } catch (error) {
      toast.error('Failed to search for sale');
    } finally {
      setSearchLoading(false);
    }
  };

  const toggleItemSelected = (itemId) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], selected: !prev[itemId].selected },
    }));
  };

  const updateItemField = (itemId, field, value) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnReason.trim()) {
      toast.error('Return reason is required');
      return;
    }
    const itemsToReturn = Object.entries(selectedItems)
      .filter(([, v]) => v.selected)
      .map(([id, v]) => ({
        sale_item_id: id,
        quantity_returned: parseInt(v.quantity),
        condition: v.condition,
        restock: v.restock,
      }));

    if (itemsToReturn.length === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    setSubmitting(true);
    try {
      await returnsAPI.create({
        sale_id: foundSale.id,
        items: itemsToReturn,
        reason: returnReason,
        refund_method: refundMethod,
      });
      toast.success('Return processed successfully');
      resetNewReturn();
      fetchReturns();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  const resetNewReturn = () => {
    setShowNewReturn(false);
    setSearchReceiptNo('');
    setFoundSale(null);
    setSelectedItems({});
    setReturnReason('');
    setRefundMethod('cash');
    // Clear query param
    navigate('/returns', { replace: true });
  };

  const handleViewDetail = async (ret) => {
    try {
      const response = await returnsAPI.getById(ret.id);
      setSelectedReturn(response.data.data || ret);
    } catch {
      setSelectedReturn(ret);
    }
    setShowDetailModal(true);
  };

  const getStatusBadge = (status) => {
    const map = { completed: 'success', pending: 'warning', rejected: 'danger' };
    return <span className={`badge badge-${map[status] || 'info'}`}>{status}</span>;
  };

  const selectedCount = Object.values(selectedItems).filter(v => v.selected).length;
  const selectedTotal = foundSale
    ? Object.entries(selectedItems)
        .filter(([, v]) => v.selected)
        .reduce((sum, [id, v]) => {
          const item = foundSale.items?.find(i => String(i.id) === String(id));
          return sum + (item ? parseFloat(item.unit_price) * parseInt(v.quantity || 0) : 0);
        }, 0)
    : 0;

  return (
    <div className="returns-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Returns</h1>
          <p className="page-subtitle">Manage customer returns and refunds</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewReturn(true)}>
          <FaUndo /> Process Return
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#EEF2FF', borderRadius: '8px', padding: '12px', color: '#4F46E5' }}>
            <FaUndo size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Total Returns</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>{returns.length}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '12px', color: '#D97706' }}>
            <FaReceipt size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Refunds Issued</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>{formatCurrency(stats.total)}</p>
          </div>
        </div>
        <div className="stat-card" style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#FEE2E2', borderRadius: '8px', padding: '12px', color: '#DC2626' }}>
            <FaFilter size={20} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Pending</p>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#111827' }}>{stats.pending}</p>
          </div>
        </div>
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
            <button className="btn btn-primary" onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}>
              <FaFilter /> Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Return No</th>
                  <th>Original Receipt</th>
                  <th>Reason</th>
                  <th>Refund Method</th>
                  <th>Refund Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaUndo style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                      <p>No returns found for this period</p>
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr key={ret.id}>
                      <td>{formatDate(ret.created_at)}</td>
                      <td><strong>{ret.return_no || `RET-${ret.id}`}</strong></td>
                      <td>
                        <span className="receipt-number">{ret.receipt_no || ret.sale?.receipt_no || '-'}</span>
                      </td>
                      <td>{ret.reason || '-'}</td>
                      <td>
                        <span className={`badge badge-${ret.refund_method}`}>{ret.refund_method || '-'}</span>
                      </td>
                      <td className="amount-cell">{formatCurrency(ret.refund_amount)}</td>
                      <td>{getStatusBadge(ret.status || 'completed')}</td>
                      <td>
                        <button
                          className="btn-icon btn-icon-primary"
                          onClick={() => handleViewDetail(ret)}
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

      {/* New Return Modal */}
      {showNewReturn && (
        <div className="modal-overlay" onClick={resetNewReturn}>
          <div
            className="modal-content modal-large"
            style={{ maxWidth: '760px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Process Return</h2>
              <button className="modal-close" onClick={resetNewReturn}><FaTimes /></button>
            </div>

            {/* Step 1: Search */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                Find Original Sale by Receipt Number
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="e.g. RCP20240501ABCD"
                  value={searchReceiptNo}
                  onChange={(e) => setSearchReceiptNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSale()}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSearchSale}
                  disabled={searchLoading}
                >
                  {searchLoading ? 'Searching...' : <><FaSearch /> Search</>}
                </button>
              </div>
            </div>

            {/* Step 2: Found Sale Items */}
            {foundSale && (
              <form onSubmit={handleSubmitReturn}>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#166534' }}>
                    Sale Found: {foundSale.receipt_no} &mdash; {formatDateTime(foundSale.created_at)} &mdash; Total: {formatCurrency(foundSale.total_amount)}
                  </p>
                  {foundSale.customer_name && (
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#15803D' }}>
                      Customer: {foundSale.customer_name}
                    </p>
                  )}
                </div>

                <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>
                  Select Items to Return
                </h3>

                <div className="table-container" style={{ marginBottom: '20px' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}></th>
                        <th>Product</th>
                        <th>Unit Price</th>
                        <th>Sold Qty</th>
                        <th>Return Qty</th>
                        <th>Condition</th>
                        <th>Restock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(foundSale.items || []).map((item) => {
                        const sel = selectedItems[item.id] || {};
                        return (
                          <tr key={item.id} style={{ background: sel.selected ? '#EEF2FF' : '' }}>
                            <td>
                              <button
                                type="button"
                                onClick={() => toggleItemSelected(item.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: sel.selected ? '#4F46E5' : '#9CA3AF' }}
                              >
                                {sel.selected ? <FaCheckSquare /> : <FaSquare />}
                              </button>
                            </td>
                            <td>
                              <strong>{item.product_name}</strong>
                            </td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>{item.quantity}</td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                max={item.quantity}
                                value={sel.quantity || item.quantity}
                                onChange={(e) => updateItemField(item.id, 'quantity', e.target.value)}
                                disabled={!sel.selected}
                                style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', textAlign: 'center' }}
                              />
                            </td>
                            <td>
                              <select
                                value={sel.condition || 'good'}
                                onChange={(e) => updateItemField(item.id, 'condition', e.target.value)}
                                disabled={!sel.selected}
                                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                              >
                                <option value="good">Good</option>
                                <option value="damaged">Damaged</option>
                              </select>
                            </td>
                            <td>
                              <input
                                type="checkbox"
                                checked={sel.restock !== false}
                                onChange={(e) => updateItemField(item.id, 'restock', e.target.checked)}
                                disabled={!sel.selected}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedCount > 0 && (
                  <div style={{ background: '#EEF2FF', borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#4338CA' }}>{selectedCount} item(s) selected</span>
                    <span style={{ fontWeight: 700, color: '#4338CA' }}>Refund: {formatCurrency(selectedTotal)}</span>
                  </div>
                )}

                {/* Return Details */}
                <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label>Return Reason *</label>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      rows="2"
                      required
                      placeholder="Explain why the customer is returning these items..."
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                    />
                  </div>
                  <div className="input-group">
                    <label>Refund Method *</label>
                    <select
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value)}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontSize: '14px' }}
                    >
                      <option value="cash">Cash</option>
                      <option value="mpesa">M-Pesa</option>
                      <option value="credit">Store Credit</option>
                    </select>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-outline" onClick={resetNewReturn}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting || selectedCount === 0}>
                    {submitting ? 'Processing...' : `Process Return${selectedCount > 0 ? ` (${formatCurrency(selectedTotal)})` : ''}`}
                  </button>
                </div>
              </form>
            )}

            {!foundSale && !searchLoading && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                <FaSearch style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }} />
                <p>Search for a sale by receipt number to begin the return process</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedReturn && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Return Details &mdash; {selectedReturn.return_no || `RET-${selectedReturn.id}`}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}><FaTimes /></button>
            </div>

            <div className="sale-details">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Return No:</label>
                  <span>{selectedReturn.return_no || `RET-${selectedReturn.id}`}</span>
                </div>
                <div className="detail-item">
                  <label>Original Receipt:</label>
                  <span>{selectedReturn.receipt_no || selectedReturn.sale?.receipt_no || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Date:</label>
                  <span>{formatDateTime(selectedReturn.created_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Processed By:</label>
                  <span>{selectedReturn.processed_by_name || selectedReturn.cashier_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Refund Method:</label>
                  <span className={`badge badge-${selectedReturn.refund_method}`}>{selectedReturn.refund_method}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span>{getStatusBadge(selectedReturn.status || 'completed')}</span>
                </div>
              </div>

              <div className="items-section" style={{ marginTop: '20px' }}>
                <h3>Returned Items</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty Returned</th>
                      <th>Unit Price</th>
                      <th>Condition</th>
                      <th>Restocked</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReturn.items || []).map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.product_name}</strong></td>
                        <td>{item.quantity_returned || item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>
                          <span className={`badge badge-${item.condition === 'good' ? 'success' : 'danger'}`}>
                            {item.condition || 'good'}
                          </span>
                        </td>
                        <td>{item.restock ? 'Yes' : 'No'}</td>
                        <td>{formatCurrency((item.unit_price || 0) * (item.quantity_returned || item.quantity || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="totals-section" style={{ marginTop: '16px' }}>
                <div className="total-row grand-total">
                  <span>Total Refund Amount:</span>
                  <span>{formatCurrency(selectedReturn.refund_amount)}</span>
                </div>
              </div>

              {selectedReturn.reason && (
                <div className="notes-section" style={{ marginTop: '16px' }}>
                  <label>Return Reason:</label>
                  <p>{selectedReturn.reason}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnsPage;
