import React, { useState, useEffect, useCallback } from 'react';
import { shiftsAPI } from '../services/api';
import {
  FaClock, FaLock, FaLockOpen, FaEye, FaFilter,
  FaMoneyBillWave, FaChartBar, FaTimes
} from 'react-icons/fa';
import { formatCurrency, formatDate, formatDateTime, getDateRange } from '../utils/helpers';
import toast from 'react-hot-toast';

const ShiftsPage = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentShift, setCurrentShift] = useState(null);
  const [currentShiftLoading, setCurrentShiftLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  // Open shift modal
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [openingSubmitting, setOpeningSubmitting] = useState(false);

  // Close shift modal
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  // Summary modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [selectedShiftSummary, setSelectedShiftSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchCurrentShift = useCallback(async () => {
    setCurrentShiftLoading(true);
    try {
      const response = await shiftsAPI.getCurrent();
      setCurrentShift(response.data.data || null);
    } catch (error) {
      // 404 means no active shift — that's fine
      setCurrentShift(null);
    } finally {
      setCurrentShiftLoading(false);
    }
  }, []);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined,
        endDate: filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined,
      };
      const response = await shiftsAPI.getAll(params);
      setShifts(response.data.data || []);
      setPagination(prev => ({ ...prev, ...(response.data.pagination || {}) }));
    } catch (error) {
      toast.error('Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filters]);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

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

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (!openingFloat || isNaN(parseFloat(openingFloat))) {
      toast.error('Please enter a valid opening float amount');
      return;
    }
    setOpeningSubmitting(true);
    try {
      await shiftsAPI.open({ opening_float: parseFloat(openingFloat) });
      toast.success('Shift opened successfully');
      setShowOpenModal(false);
      setOpeningFloat('');
      fetchCurrentShift();
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to open shift');
    } finally {
      setOpeningSubmitting(false);
    }
  };

  const handleCloseShift = async (e) => {
    e.preventDefault();
    if (!closingCash || isNaN(parseFloat(closingCash))) {
      toast.error('Please enter a valid closing cash amount');
      return;
    }
    setClosingSubmitting(true);
    try {
      await shiftsAPI.close({
        closing_cash: parseFloat(closingCash),
        notes: closingNotes,
      });
      toast.success('Shift closed successfully');
      setShowCloseModal(false);
      setClosingCash('');
      setClosingNotes('');
      fetchCurrentShift();
      fetchShifts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to close shift');
    } finally {
      setClosingSubmitting(false);
    }
  };

  const handleViewSummary = async (shift) => {
    setShowSummaryModal(true);
    setSummaryLoading(true);
    try {
      const response = await shiftsAPI.getSummary(shift.id);
      setSelectedShiftSummary(response.data.data || shift);
    } catch {
      setSelectedShiftSummary(shift);
    } finally {
      setSummaryLoading(false);
    }
  };

  const getVarianceStyle = (variance) => {
    if (variance === null || variance === undefined) return {};
    const v = parseFloat(variance);
    if (v === 0) return { color: '#16A34A', fontWeight: 700 };
    if (v < 0) return { color: '#DC2626', fontWeight: 700 };
    return { color: '#D97706', fontWeight: 700 };
  };

  const getVarianceLabel = (variance) => {
    if (variance === null || variance === undefined) return '-';
    const v = parseFloat(variance);
    if (v === 0) return `${formatCurrency(0)} (Balanced)`;
    if (v < 0) return `${formatCurrency(v)} (Short)`;
    return `+${formatCurrency(v)} (Over)`;
  };

  // Expected closing cash = opening float + total cash sales
  const getExpectedCash = (shift) => {
    return (parseFloat(shift.opening_float || 0) + parseFloat(shift.total_cash_sales || 0)).toFixed(2);
  };

  return (
    <div className="shifts-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Shift Management</h1>
          <p className="page-subtitle">Track and manage cashier shifts</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {!currentShiftLoading && !currentShift && (
            <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
              <FaLockOpen /> Open Shift
            </button>
          )}
          {!currentShiftLoading && currentShift && (
            <button className="btn btn-danger" onClick={() => setShowCloseModal(true)}>
              <FaLock /> Close Shift
            </button>
          )}
        </div>
      </div>

      {/* Current Shift Status Card */}
      <div style={{ marginBottom: '24px' }}>
        {currentShiftLoading ? (
          <div className="loading"><div className="spinner"></div></div>
        ) : currentShift ? (
          <div style={{
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: '#fff',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '20px',
            alignItems: 'center',
          }}>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>Shift Status</p>
              <p style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 700 }}>
                <FaLockOpen style={{ marginRight: '8px' }} /> Open
              </p>
            </div>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>Shift No</p>
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600 }}>{currentShift.shift_no || `SHF-${currentShift.id}`}</p>
            </div>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>Opened By</p>
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600 }}>{currentShift.opened_by_name || 'N/A'}</p>
            </div>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>Opened At</p>
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600 }}>{formatDateTime(currentShift.opened_at)}</p>
            </div>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>Opening Float</p>
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600 }}>{formatCurrency(currentShift.opening_float)}</p>
            </div>
            <div>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '13px' }}>Sales So Far</p>
              <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 600 }}>{formatCurrency(currentShift.total_sales || 0)}</p>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#F9FAFB',
            border: '2px dashed #D1D5DB',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            color: '#6B7280',
          }}>
            <FaClock style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No Shift Currently Open</p>
            <p style={{ margin: '8px 0 16px', fontSize: '14px' }}>Open a shift before starting POS operations</p>
            <button className="btn btn-primary" onClick={() => setShowOpenModal(true)}>
              <FaLockOpen /> Open Shift Now
            </button>
          </div>
        )}
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

      {/* Shifts Table */}
      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Shift No</th>
                  <th>Opened By</th>
                  <th>Opened At</th>
                  <th>Closed At</th>
                  <th>Opening Float</th>
                  <th>Closing Cash</th>
                  <th>Total Sales</th>
                  <th>Variance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaClock style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px', display: 'block', margin: '0 auto 16px' }} />
                      <p>No shifts found</p>
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => {
                    const variance = shift.cash_variance !== undefined ? shift.cash_variance
                      : shift.closing_cash !== null && shift.closing_cash !== undefined
                        ? parseFloat(shift.closing_cash) - parseFloat(getExpectedCash(shift))
                        : null;
                    return (
                      <tr key={shift.id}>
                        <td><strong>{shift.shift_no || `SHF-${shift.id}`}</strong></td>
                        <td>{shift.opened_by_name || 'N/A'}</td>
                        <td>{formatDateTime(shift.opened_at)}</td>
                        <td>{shift.closed_at ? formatDateTime(shift.closed_at) : <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                        <td>{formatCurrency(shift.opening_float)}</td>
                        <td>{shift.closing_cash !== null && shift.closing_cash !== undefined ? formatCurrency(shift.closing_cash) : <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                        <td className="amount-cell">{formatCurrency(shift.total_sales || 0)}</td>
                        <td style={getVarianceStyle(variance)}>
                          {variance !== null ? getVarianceLabel(variance) : '—'}
                        </td>
                        <td>
                          {shift.status === 'open' ? (
                            <span className="badge badge-success">Open</span>
                          ) : (
                            <span className="badge badge-info">Closed</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="btn-icon btn-icon-primary"
                            onClick={() => handleViewSummary(shift)}
                            title="View Summary"
                          >
                            <FaEye />
                          </button>
                        </td>
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

      {/* Open Shift Modal */}
      {showOpenModal && (
        <div className="modal-overlay" onClick={() => setShowOpenModal(false)}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Open New Shift</h2>
              <button className="modal-close" onClick={() => setShowOpenModal(false)}><FaTimes /></button>
            </div>
            <form onSubmit={handleOpenShift}>
              <div style={{ padding: '0 0 16px' }}>
                <div className="input-group">
                  <label>Opening Float (Cash in Till) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    placeholder="0.00"
                    required
                    autoFocus
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontSize: '16px' }}
                  />
                  <small style={{ color: '#6B7280', marginTop: '4px', display: 'block' }}>
                    Count the cash in the till before starting
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowOpenModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={openingSubmitting}>
                  {openingSubmitting ? 'Opening...' : <><FaLockOpen /> Open Shift</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Shift Modal */}
      {showCloseModal && currentShift && (
        <div className="modal-overlay" onClick={() => setShowCloseModal(false)}>
          <div className="modal-content" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Close Shift</h2>
              <button className="modal-close" onClick={() => setShowCloseModal(false)}><FaTimes /></button>
            </div>

            {/* Shift preview */}
            <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #E5E7EB' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#374151', fontWeight: 600 }}>Shift Summary Preview</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Shift No</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '14px' }}>{currentShift.shift_no || `SHF-${currentShift.id}`}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Opened At</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '14px' }}>{formatDateTime(currentShift.opened_at)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Opening Float</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '14px' }}>{formatCurrency(currentShift.opening_float)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Total Sales</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '14px' }}>{formatCurrency(currentShift.total_sales || 0)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Cash Sales</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '14px' }}>{formatCurrency(currentShift.total_cash_sales || 0)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Expected in Till</p>
                  <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '14px' }}>{formatCurrency(getExpectedCash(currentShift))}</p>
                </div>
              </div>
              {closingCash && !isNaN(parseFloat(closingCash)) && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>Variance</p>
                  <p style={{
                    margin: '4px 0 0',
                    fontWeight: 700,
                    fontSize: '16px',
                    ...getVarianceStyle(parseFloat(closingCash) - parseFloat(getExpectedCash(currentShift)))
                  }}>
                    {getVarianceLabel(parseFloat(closingCash) - parseFloat(getExpectedCash(currentShift)))}
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleCloseShift}>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>Closing Cash (Actual Cash in Till) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  placeholder="0.00"
                  required
                  autoFocus
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontSize: '16px' }}
                />
                <small style={{ color: '#6B7280', marginTop: '4px', display: 'block' }}>
                  Count the cash in the till at close
                </small>
              </div>
              <div className="input-group" style={{ marginBottom: '16px' }}>
                <label>Notes (optional)</label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  rows="2"
                  placeholder="Any notes about this shift..."
                  style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1D5DB', width: '100%', fontFamily: 'inherit', fontSize: '14px', resize: 'vertical' }}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCloseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={closingSubmitting}>
                  {closingSubmitting ? 'Closing...' : <><FaLock /> Close Shift</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Summary Modal */}
      {showSummaryModal && (
        <div className="modal-overlay" onClick={() => setShowSummaryModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FaChartBar style={{ marginRight: '8px' }} />
                Shift Summary
              </h2>
              <button className="modal-close" onClick={() => setShowSummaryModal(false)}><FaTimes /></button>
            </div>

            {summaryLoading ? (
              <div className="loading"><div className="spinner"></div></div>
            ) : selectedShiftSummary && (
              <div className="sale-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Shift No:</label>
                    <span>{selectedShiftSummary.shift_no || `SHF-${selectedShiftSummary.id}`}</span>
                  </div>
                  <div className="detail-item">
                    <label>Opened By:</label>
                    <span>{selectedShiftSummary.opened_by_name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Opened At:</label>
                    <span>{formatDateTime(selectedShiftSummary.opened_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Closed At:</label>
                    <span>{selectedShiftSummary.closed_at ? formatDateTime(selectedShiftSummary.closed_at) : 'Still Open'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`badge badge-${selectedShiftSummary.status === 'open' ? 'success' : 'info'}`}>
                      {selectedShiftSummary.status || 'closed'}
                    </span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 600 }}>Financial Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    {[
                      { label: 'Opening Float', value: formatCurrency(selectedShiftSummary.opening_float), icon: <FaMoneyBillWave />, color: '#4F46E5' },
                      { label: 'Total Sales', value: formatCurrency(selectedShiftSummary.total_sales || 0), icon: <FaChartBar />, color: '#10B981' },
                      { label: 'Cash Sales', value: formatCurrency(selectedShiftSummary.total_cash_sales || 0), icon: <FaMoneyBillWave />, color: '#059669' },
                      { label: 'M-Pesa Sales', value: formatCurrency(selectedShiftSummary.total_mpesa_sales || 0), icon: <FaMoneyBillWave />, color: '#00BF63' },
                      { label: 'Closing Cash', value: selectedShiftSummary.closing_cash !== null && selectedShiftSummary.closing_cash !== undefined ? formatCurrency(selectedShiftSummary.closing_cash) : '—', icon: <FaMoneyBillWave />, color: '#6B7280' },
                      { label: 'Expected Cash', value: formatCurrency(getExpectedCash(selectedShiftSummary)), icon: <FaMoneyBillWave />, color: '#374151' },
                    ].map((item, idx) => (
                      <div key={idx} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '14px' }}>
                        <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>{item.label}</p>
                        <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cash Variance */}
                {selectedShiftSummary.closing_cash !== null && selectedShiftSummary.closing_cash !== undefined && (
                  <div style={{ marginTop: '20px', padding: '16px', borderRadius: '10px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6B7280' }}>Cash Variance</p>
                    <p style={{
                      margin: '6px 0 0',
                      fontSize: '22px',
                      ...getVarianceStyle(
                        selectedShiftSummary.cash_variance !== undefined
                          ? selectedShiftSummary.cash_variance
                          : parseFloat(selectedShiftSummary.closing_cash) - parseFloat(getExpectedCash(selectedShiftSummary))
                      )
                    }}>
                      {getVarianceLabel(
                        selectedShiftSummary.cash_variance !== undefined
                          ? selectedShiftSummary.cash_variance
                          : parseFloat(selectedShiftSummary.closing_cash) - parseFloat(getExpectedCash(selectedShiftSummary))
                      )}
                    </p>
                  </div>
                )}

                {/* Sales Breakdown */}
                {selectedShiftSummary.sales_breakdown && (
                  <div style={{ marginTop: '20px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>Sales Breakdown by Payment Method</h3>
                    <div className="table-container">
                      <table>
                        <thead>
                          <tr>
                            <th>Payment Method</th>
                            <th>Transactions</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedShiftSummary.sales_breakdown.map((row, idx) => (
                            <tr key={idx}>
                              <td>
                                <span className={`badge badge-${row.payment_method}`}>{row.payment_method}</span>
                              </td>
                              <td>{row.count}</td>
                              <td className="amount-cell">{formatCurrency(row.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedShiftSummary.notes && (
                  <div className="notes-section" style={{ marginTop: '16px' }}>
                    <label>Notes:</label>
                    <p>{selectedShiftSummary.notes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowSummaryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftsPage;
