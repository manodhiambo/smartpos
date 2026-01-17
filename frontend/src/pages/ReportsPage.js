import React, { useState, useEffect } from 'react';
import { salesAPI, dashboardAPI, expensesAPI } from '../services/api';
import { FaChartLine, FaDownload, FaCalendar } from 'react-icons/fa';
import { formatCurrency, formatNumber, getDateRange } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/Reports.css';

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('sales');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [salesReport, setSalesReport] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [cashierPerformance, setCashierPerformance] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    fetchReports();
  }, [reportType, dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: `${dateRange.startDate}T00:00:00Z`,
        endDate: `${dateRange.endDate}T23:59:59Z`
      };

      if (reportType === 'sales') {
        const [salesRes, topProductsRes, paymentRes] = await Promise.all([
          salesAPI.getReport(params),
          salesAPI.getTopProducts({ ...params, limit: 10 }),
          salesAPI.getByPaymentMethod(params)
        ]);

        setSalesReport(salesRes.data.data);
        setTopProducts(topProductsRes.data.data);
        setPaymentMethods(paymentRes.data.data);
      } else if (reportType === 'financial') {
        const financialRes = await dashboardAPI.getFinancialSummary(params);
        setFinancialSummary(financialRes.data.data);
      } else if (reportType === 'performance') {
        const cashierRes = await salesAPI.getCashierPerformance(params);
        setCashierPerformance(cashierRes.data.data);
      }
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangePreset = (preset) => {
    const range = getDateRange(preset);
    setDateRange({
      startDate: range.startDate.split('T')[0],
      endDate: range.endDate.split('T')[0]
    });
  };

  const exportReport = () => {
    toast.success('Export feature coming soon!');
  };

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Business insights and reports</p>
        </div>
        <button className="btn btn-primary" onClick={exportReport}>
          <FaDownload /> Export Report
        </button>
      </div>

      {/* Report Type Selection */}
      <div className="report-type-tabs">
        <button
          className={`tab-btn ${reportType === 'sales' ? 'active' : ''}`}
          onClick={() => setReportType('sales')}
        >
          Sales Report
        </button>
        <button
          className={`tab-btn ${reportType === 'financial' ? 'active' : ''}`}
          onClick={() => setReportType('financial')}
        >
          Financial Summary
        </button>
        <button
          className={`tab-btn ${reportType === 'performance' ? 'active' : ''}`}
          onClick={() => setReportType('performance')}
        >
          Staff Performance
        </button>
      </div>

      {/* Date Range Filter */}
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
          <button className="btn btn-outline btn-sm" onClick={() => handleDateRangePreset('year')}>
            This Year
          </button>
        </div>

        <div className="custom-date-range">
          <div className="input-group">
            <label>Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div className="input-group">
            <label>End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="report-content">
          {/* Sales Report */}
          {reportType === 'sales' && (
            <>
              <div className="report-section">
                <h2 className="section-title">Daily Sales Breakdown</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Total Sales</th>
                        <th>Revenue</th>
                        <th>VAT</th>
                        <th>Avg. Sale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesReport?.map((day, index) => (
                        <tr key={index}>
                          <td>{new Date(day.sale_date).toLocaleDateString()}</td>
                          <td>{formatNumber(day.total_sales)}</td>
                          <td className="amount-cell">{formatCurrency(day.total_revenue)}</td>
                          <td>{formatCurrency(day.total_vat)}</td>
                          <td>{formatCurrency(day.avg_sale_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="report-section">
                <h2 className="section-title">Top Selling Products</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>Category</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                        <th>Times Sold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts?.map((product, index) => (
                        <tr key={product.id}>
                          <td>{index + 1}</td>
                          <td><strong>{product.name}</strong></td>
                          <td><span className="badge badge-info">{product.category}</span></td>
                          <td>{formatNumber(product.total_quantity)}</td>
                          <td className="amount-cell">{formatCurrency(product.total_revenue)}</td>
                          <td>{formatNumber(product.times_sold)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="report-section">
                <h2 className="section-title">Payment Methods Breakdown</h2>
                <div className="payment-breakdown-cards">
                  {paymentMethods?.map((method, index) => (
                    <div key={index} className="payment-card">
                      <span className="payment-method-label">{method.payment_method}</span>
                      <span className="payment-amount">{formatCurrency(method.total)}</span>
                      <span className="payment-count">{formatNumber(method.count)} transactions</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Financial Summary */}
          {reportType === 'financial' && financialSummary && (
            <>
              <div className="financial-summary-grid">
                <div className="summary-card large">
                  <FaChartLine />
                  <div>
                    <span className="summary-label">Total Revenue</span>
                    <span className="summary-value">{formatCurrency(financialSummary.revenue.total)}</span>
                    <span className="summary-subtext">
                      {formatNumber(financialSummary.revenue.transactions)} transactions
                    </span>
                  </div>
                </div>

                <div className="summary-card large">
                  <FaChartLine />
                  <div>
                    <span className="summary-label">Total Purchases</span>
                    <span className="summary-value">{formatCurrency(financialSummary.purchases.total)}</span>
                    <span className="summary-subtext">
                      Balance: {formatCurrency(financialSummary.purchases.balance)}
                    </span>
                  </div>
                </div>

                <div className="summary-card large">
                  <FaChartLine />
                  <div>
                    <span className="summary-label">Total Expenses</span>
                    <span className="summary-value">{formatCurrency(financialSummary.expenses.total)}</span>
                    <span className="summary-subtext">
                      {formatNumber(financialSummary.expenses.count)} expense entries
                    </span>
                  </div>
                </div>

                <div className="summary-card large success">
                  <FaChartLine />
                  <div>
                    <span className="summary-label">Net Profit</span>
                    <span className="summary-value">{formatCurrency(financialSummary.profit.net)}</span>
                    <span className="summary-subtext">
                      Margin: {financialSummary.profit.margin}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="report-section">
                <h2 className="section-title">Profit & Loss Statement</h2>
                <div className="pl-statement">
                  <div className="pl-row">
                    <span>Revenue</span>
                    <span className="amount">{formatCurrency(financialSummary.revenue.total)}</span>
                  </div>
                  <div className="pl-row">
                    <span>Cost of Goods Sold</span>
                    <span className="amount negative">({formatCurrency(financialSummary.purchases.total)})</span>
                  </div>
                  <div className="pl-row subtotal">
                    <span><strong>Gross Profit</strong></span>
                    <span className="amount"><strong>{formatCurrency(financialSummary.profit.gross)}</strong></span>
                  </div>
                  <div className="pl-row">
                    <span>Operating Expenses</span>
                    <span className="amount negative">({formatCurrency(financialSummary.expenses.total)})</span>
                  </div>
                  <div className="pl-row total">
                    <span><strong>Net Profit</strong></span>
                    <span className="amount"><strong>{formatCurrency(financialSummary.profit.net)}</strong></span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Staff Performance */}
          {reportType === 'performance' && (
            <div className="report-section">
              <h2 className="section-title">Cashier Performance</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Cashier</th>
                      <th>Total Sales</th>
                      <th>Revenue</th>
                      <th>Avg. Sale Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashierPerformance?.map((cashier, index) => (
                      <tr key={cashier.id}>
                        <td>{index + 1}</td>
                        <td><strong>{cashier.full_name}</strong></td>
                        <td>{formatNumber(cashier.total_sales)}</td>
                        <td className="amount-cell">{formatCurrency(cashier.total_revenue)}</td>
                        <td>{formatCurrency(cashier.avg_sale_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
