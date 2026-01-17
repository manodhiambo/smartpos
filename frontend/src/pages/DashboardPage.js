import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
  FaShoppingCart,
  FaMoneyBillWave,
  FaBoxes,
  FaExclamationTriangle,
  FaChartLine,
  FaCashRegister,
  FaMobileAlt,
  FaCreditCard
} from 'react-icons/fa';
import { formatCurrency, formatNumber } from '../utils/helpers';
import '../styles/Dashboard.css';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await dashboardAPI.getOverview();
      setOverview(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const stats = [
    {
      title: "Today's Sales",
      value: formatCurrency(overview?.sales?.todayTotal || 0),
      subtitle: `${formatNumber(overview?.sales?.todayCount || 0)} transactions`,
      icon: <FaShoppingCart />,
      color: '#4F46E5',
      bgColor: '#E0E7FF'
    },
    {
      title: "Cash Sales",
      value: formatCurrency(overview?.sales?.cashSales || 0),
      subtitle: 'Cash payments',
      icon: <FaCashRegister />,
      color: '#10B981',
      bgColor: '#D1FAE5'
    },
    {
      title: "M-Pesa Sales",
      value: formatCurrency(overview?.sales?.mpesaSales || 0),
      subtitle: 'Mobile money',
      icon: <FaMobileAlt />,
      color: '#F59E0B',
      bgColor: '#FEF3C7'
    },
    {
      title: "Card Sales",
      value: formatCurrency(overview?.sales?.cardSales || 0),
      subtitle: 'Card payments',
      icon: <FaCreditCard />,
      color: '#8B5CF6',
      bgColor: '#EDE9FE'
    }
  ];

  const inventoryStats = [
    {
      title: 'Active Products',
      value: formatNumber(overview?.inventory?.activeProducts || 0),
      icon: <FaBoxes />,
      color: '#3B82F6'
    },
    {
      title: 'Low Stock Items',
      value: formatNumber(overview?.inventory?.lowStockCount || 0),
      icon: <FaExclamationTriangle />,
      color: '#EF4444',
      link: '/products?filter=low-stock'
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your store's performance</p>
        </div>
        <Link to="/pos" className="btn btn-primary">
          <FaCashRegister /> Open POS
        </Link>
      </div>

      {/* Sales Stats */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <p className="stat-title">{stat.title}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <p className="stat-subtitle">{stat.subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Inventory & Low Stock */}
      <div className="dashboard-row">
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Inventory Status</h2>
          </div>
          <div className="inventory-stats">
            {inventoryStats.map((stat, index) => (
              <div key={index} className="inventory-stat-card">
                <div className="inventory-stat-icon" style={{ color: stat.color }}>
                  {stat.icon}
                </div>
                <div>
                  <p className="inventory-stat-title">{stat.title}</p>
                  <h4 className="inventory-stat-value">{stat.value}</h4>
                </div>
                {stat.link && (
                  <Link to={stat.link} className="inventory-stat-link">
                    View →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="dashboard-section">
          <div className="section-header">
            <h2 className="section-title">Payment Methods</h2>
          </div>
          <div className="payment-breakdown">
            {overview?.paymentBreakdown?.map((method, index) => (
              <div key={index} className="payment-method-item">
                <div className="payment-method-info">
                  <span className="payment-method-name">{method.payment_method}</span>
                  <span className="payment-method-count">{method.count} transactions</span>
                </div>
                <span className="payment-method-amount">{formatCurrency(method.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Sales</h2>
          <Link to="/sales" className="section-link">View All →</Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Cashier</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {overview?.recentSales?.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <Link to={`/sales/${sale.id}`} className="receipt-link">
                      {sale.receipt_no}
                    </Link>
                  </td>
                  <td>{sale.cashier_name || 'N/A'}</td>
                  <td className="amount-cell">{formatCurrency(sale.total_amount)}</td>
                  <td>
                    <span className={`badge badge-${sale.payment_method}`}>
                      {sale.payment_method}
                    </span>
                  </td>
                  <td>{new Date(sale.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
