import React, { useState, useEffect } from 'react';
import { superAdminAPI } from '../services/api';
import { FaStore, FaCheckCircle, FaBan, FaMoneyBillWave, FaChartLine, FaSearch, FaEye } from 'react-icons/fa';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/SuperAdmin.css';

const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    status: '',
    plan: ''
  });
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantModal, setShowTenantModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, tenantsRes, paymentsRes] = await Promise.all([
        superAdminAPI.getDashboardStats(),
        superAdminAPI.getAllTenants(),
        superAdminAPI.getAllPayments({ limit: 100 })
      ]);

      setStats(statsRes.data.data);
      setTenants(tenantsRes.data.data);
      setPayments(paymentsRes.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTenant = async (tenantId) => {
    try {
      const response = await superAdminAPI.getTenantDetails(tenantId);
      setSelectedTenant(response.data.data);
      setShowTenantModal(true);
    } catch (error) {
      toast.error('Failed to load tenant details');
    }
  };

  const handleSuspendTenant = async (tenantId, businessName) => {
    const reason = window.prompt(`Why are you suspending ${businessName}?`);
    if (!reason) return;

    try {
      await superAdminAPI.suspendTenant(tenantId, reason);
      toast.success('Tenant suspended successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivateTenant = async (tenantId, businessName) => {
    if (!window.confirm(`Activate ${businessName}?`)) return;

    try {
      await superAdminAPI.activateTenant(tenantId);
      toast.success('Tenant activated successfully');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="super-admin-dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">Manage all SmartPOS tenants</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <FaStore />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Tenants</span>
            <span className="stat-value">{formatNumber(stats?.tenants?.total_tenants || 0)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            <FaCheckCircle />
          </div>
          <div className="stat-details">
            <span className="stat-label">Active Tenants</span>
            <span className="stat-value">{formatNumber(stats?.tenants?.active_tenants || 0)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
            <FaChartLine />
          </div>
          <div className="stat-details">
            <span className="stat-label">Trial Tenants</span>
            <span className="stat-value">{formatNumber(stats?.tenants?.trial_tenants || 0)}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}>
            <FaBan />
          </div>
          <div className="stat-details">
            <span className="stat-label">Suspended</span>
            <span className="stat-value">{formatNumber(stats?.tenants?.suspended_tenants || 0)}</span>
          </div>
        </div>

        <div className="stat-card large">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)' }}>
            <FaMoneyBillWave />
          </div>
          <div className="stat-details">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value">{formatCurrency(stats?.revenue?.total_revenue || 0)}</span>
            <small>Last 30 days: {formatCurrency(stats?.revenue?.revenue_last_30_days || 0)}</small>
          </div>
        </div>

        <div className="stat-card large">
          <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)' }}>
            <FaChartLine />
          </div>
          <div className="stat-details">
            <span className="stat-label">Monthly Recurring Revenue</span>
            <span className="stat-value">{formatCurrency(stats?.tenants?.monthly_recurring_revenue || 0)}</span>
            <small>{formatNumber(stats?.revenue?.total_payments || 0)} total payments</small>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      <div className="plan-distribution">
        <h2>Plan Distribution</h2>
        <div className="distribution-grid">
          {stats?.planDistribution?.map((plan, index) => (
            <div key={index} className="distribution-card">
              <span className="distribution-plan">{plan.display_name || plan.subscription_plan}</span>
              <span className="distribution-count">{formatNumber(plan.count)} tenants</span>
              <div className="distribution-bar">
                <div 
                  className="distribution-fill"
                  style={{ width: `${(plan.count / stats.tenants.total_tenants) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tenants' ? 'active' : ''}`}
          onClick={() => setActiveTab('tenants')}
        >
          All Tenants
        </button>
        <button 
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payments
        </button>
      </div>

      {/* Tenants Table */}
      {activeTab === 'tenants' && (
        <div className="tenants-section">
          <div className="section-header">
            <h2>All Tenants</h2>
            <div className="filters">
              <select 
                value={filters.status} 
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <select 
                value={filters.plan} 
                onChange={(e) => setFilters(prev => ({ ...prev, plan: e.target.value }))}
              >
                <option value="">All Plans</option>
                <option value="trial">Trial</option>
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Business Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Revenue</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants
                  .filter(t => !filters.status || t.subscription_status === filters.status)
                  .filter(t => !filters.plan || t.subscription_plan === filters.plan)
                  .map((tenant) => (
                    <tr key={tenant.id}>
                      <td>
                        <strong>{tenant.business_name}</strong>
                        {tenant.is_trial && (
                          <span className="badge badge-warning" style={{ marginLeft: '8px', fontSize: '10px' }}>
                            Trial
                          </span>
                        )}
                      </td>
                      <td>{tenant.business_email}</td>
                      <td>
                        <span className="badge badge-info">
                          {tenant.plan_display_name || tenant.subscription_plan}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${tenant.subscription_status === 'active' ? 'success' : 'danger'}`}>
                          {tenant.subscription_status}
                        </span>
                      </td>
                      <td>{formatDate(tenant.created_at)}</td>
                      <td>{formatCurrency(tenant.total_revenue || 0)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-icon btn-icon-primary"
                            onClick={() => handleViewTenant(tenant.id)}
                            title="View Details"
                          >
                            <FaEye />
                          </button>
                          {tenant.subscription_status === 'active' ? (
                            <button
                              className="btn-icon btn-icon-danger"
                              onClick={() => handleSuspendTenant(tenant.id, tenant.business_name)}
                              title="Suspend"
                            >
                              <FaBan />
                            </button>
                          ) : (
                            <button
                              className="btn-icon btn-icon-success"
                              onClick={() => handleActivateTenant(tenant.id, tenant.business_name)}
                              title="Activate"
                            >
                              <FaCheckCircle />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments Table */}
      {activeTab === 'payments' && (
        <div className="payments-section">
          <h2>Recent Payments</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.created_at)}</td>
                    <td>{payment.business_name}</td>
                    <td>
                      <span className="badge badge-info">{payment.subscription_period}</span>
                    </td>
                    <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                    <td>{payment.payment_method?.toUpperCase()}</td>
                    <td>
                      <span className={`badge badge-${payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger'}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td>{payment.mpesa_transaction_id || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenant Details Modal */}
      {showTenantModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowTenantModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTenant.tenant.business_name}</h2>
              <button className="modal-close" onClick={() => setShowTenantModal(false)}>×</button>
            </div>

            <div className="tenant-details">
              <div className="details-section">
                <h3>Business Information</h3>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Business Email:</label>
                    <span>{selectedTenant.tenant.business_email}</span>
                  </div>
                  <div className="detail-item">
                    <label>Phone:</label>
                    <span>{selectedTenant.tenant.business_phone || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Plan:</label>
                    <span className="badge badge-info">{selectedTenant.tenant.display_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Status:</label>
                    <span className={`badge badge-${selectedTenant.tenant.subscription_status === 'active' ? 'success' : 'danger'}`}>
                      {selectedTenant.tenant.subscription_status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Created:</label>
                    <span>{formatDate(selectedTenant.tenant.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Subscription Ends:</label>
                    <span>
                      {formatDate(selectedTenant.tenant.is_trial 
                        ? selectedTenant.tenant.trial_ends_at 
                        : selectedTenant.tenant.subscription_ends_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="details-section">
                <h3>Recent Payments</h3>
                <table className="mini-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTenant.recentPayments?.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDate(payment.created_at)}</td>
                        <td>{formatCurrency(payment.amount)}</td>
                        <td>
                          <span className={`badge badge-${payment.status === 'completed' ? 'success' : 'warning'}`}>
                            {payment.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowTenantModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
