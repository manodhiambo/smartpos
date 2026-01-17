import React, { useState, useEffect } from 'react';
import { salesAPI } from '../services/api';
import { FaSearch, FaEye, FaFileDownload, FaFilter, FaReceipt } from 'react-icons/fa';
import { formatCurrency, formatDateTime, getDateRange } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/Sales.css';

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    paymentMethod: '',
    cashierId: ''
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchSales();
  }, [pagination.page, filters]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        startDate: filters.startDate ? `${filters.startDate}T00:00:00Z` : undefined,
        endDate: filters.endDate ? `${filters.endDate}T23:59:59Z` : undefined,
        paymentMethod: filters.paymentMethod || undefined,
        cashierId: filters.cashierId || undefined
      };

      const response = await salesAPI.getAll(params);
      setSales(response.data.data);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (saleId) => {
    try {
      const response = await salesAPI.getById(saleId);
      setSelectedSale(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Failed to load sale details');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleDateRangePreset = (preset) => {
    const range = getDateRange(preset);
    setFilters(prev => ({
      ...prev,
      startDate: range.startDate.split('T')[0],
      endDate: range.endDate.split('T')[0]
    }));
  };

  const exportToCSV = () => {
    const headers = ['Receipt No', 'Date', 'Cashier', 'Total Amount', 'Payment Method', 'Status'];
    const rows = sales.map(sale => [
      sale.receipt_no,
      formatDateTime(sale.created_at),
      sale.cashier_name || 'N/A',
      sale.total_amount,
      sale.payment_method,
      sale.status
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Sales exported successfully');
  };

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-subtitle">View all transactions</p>
        </div>
        <button className="btn btn-primary" onClick={exportToCSV}>
          <FaFileDownload /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="date-range-presets">
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('today')}>
            Today
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('week')}>
            This Week
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('month')}>
            This Month
          </button>
        </div>

        <div className="filters-grid">
          <div className="input-group">
            <label>Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="input-group">
            <label>End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>

          <div className="input-group">
            <label>Payment Method</label>
            <select name="paymentMethod" value={filters.paymentMethod} onChange={handleFilterChange}>
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <div className="input-group">
            <button className="btn btn-primary" onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}>
              <FaFilter /> Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
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
                  <th>Receipt No</th>
                  <th>Date & Time</th>
                  <th>Cashier</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '40px' }}>
                      <FaReceipt style={{ fontSize: '48px', opacity: 0.3, marginBottom: '16px' }} />
                      <p>No sales found</p>
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <strong className="receipt-number">{sale.receipt_no}</strong>
                      </td>
                      <td>{formatDateTime(sale.created_at)}</td>
                      <td>{sale.cashier_name || 'N/A'}</td>
                      <td>{sale.customer_name || '-'}</td>
                      <td>
                        <span className="items-count">{sale.items?.length || 0} items</span>
                      </td>
                      <td className="amount-cell">{formatCurrency(sale.total_amount)}</td>
                      <td>
                        <span className={`badge badge-${sale.payment_method}`}>
                          {sale.payment_method}
                        </span>
                      </td>
                      <td>
                        {sale.status === 'completed' ? (
                          <span className="badge badge-success">Completed</span>
                        ) : sale.status === 'voided' ? (
                          <span className="badge badge-danger">Voided</span>
                        ) : (
                          <span className="badge badge-warning">{sale.status}</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-icon btn-icon-primary"
                          onClick={() => handleViewDetails(sale.id)}
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
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
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

      {/* Sale Details Modal */}
      {showDetailsModal && selectedSale && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Sale Details - {selectedSale.receipt_no}</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>×</button>
            </div>

            <div className="sale-details">
              <div className="details-grid">
                <div className="detail-item">
                  <label>Receipt Number:</label>
                  <span>{selectedSale.receipt_no}</span>
                </div>
                <div className="detail-item">
                  <label>Date & Time:</label>
                  <span>{formatDateTime(selectedSale.created_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Cashier:</label>
                  <span>{selectedSale.cashier_name || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Customer:</label>
                  <span>{selectedSale.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div className="detail-item">
                  <label>Payment Method:</label>
                  <span className={`badge badge-${selectedSale.payment_method}`}>
                    {selectedSale.payment_method}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`badge badge-${selectedSale.status === 'completed' ? 'success' : 'danger'}`}>
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="items-section">
                <h3>Items Purchased</h3>
                <table className="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items?.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{item.product_name}</strong>
                          <br />
                          <small>{item.barcode}</small>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="totals-section">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedSale.subtotal)}</span>
                </div>
                <div className="total-row">
                  <span>VAT (16%):</span>
                  <span>{formatCurrency(selectedSale.vat_amount)}</span>
                </div>
                {selectedSale.discount > 0 && (
                  <div className="total-row">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedSale.discount)}</span>
                  </div>
                )}
                <div className="total-row grand-total">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(selectedSale.total_amount)}</span>
                </div>
                <div className="total-row">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(selectedSale.amount_paid)}</span>
                </div>
                {selectedSale.change_amount > 0 && (
                  <div className="total-row">
                    <span>Change:</span>
                    <span>{formatCurrency(selectedSale.change_amount)}</span>
                  </div>
                )}
                {selectedSale.mpesa_code && (
                  <div className="total-row">
                    <span>M-Pesa Code:</span>
                    <span><strong>{selectedSale.mpesa_code}</strong></span>
                  </div>
                )}
              </div>

              {selectedSale.notes && (
                <div className="notes-section">
                  <label>Notes:</label>
                  <p>{selectedSale.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowDetailsModal(false)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPage;
