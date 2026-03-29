import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FaStore, FaCheckCircle, FaBan, FaMoneyBillWave, FaChartLine,
  FaEye, FaPlus, FaEdit, FaTrash, FaClock, FaReceipt, FaUserSecret
} from 'react-icons/fa';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/SuperAdmin.css';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { impersonate } = useAuth();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState({
    status: '',
    plan: ''
  });
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showAssignPlanModal, setShowAssignPlanModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'plans') {
      fetchPlans();
    }
  }, [activeTab]);

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

  const fetchPlans = async () => {
    try {
      const response = await superAdminAPI.getAllPlans();
      setPlans(response.data.data);
    } catch (error) {
      toast.error('Failed to load plans');
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

  const handleImpersonate = async (tenantId, businessName) => {
    if (!window.confirm(`Enter ${businessName}'s session? You will see and interact with their live data.`)) return;
    const result = await impersonate(tenantId);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    try {
      await superAdminAPI.assignPlan(selectedTenant.tenant.id, {
        plan_name: formData.plan_name,
        months: formData.months
      });
      toast.success('Plan assigned successfully');
      setShowAssignPlanModal(false);
      fetchDashboardData();
      handleViewTenant(selectedTenant.tenant.id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign plan');
    }
  };

  const handleExtendTrial = async (tenantId) => {
    const days = window.prompt('How many days to extend trial?', '30');
    if (!days) return;

    try {
      await superAdminAPI.extendTrial(tenantId, parseInt(days));
      toast.success(`Trial extended by ${days} days`);
      fetchDashboardData();
      if (selectedTenant) handleViewTenant(tenantId);
    } catch (error) {
      toast.error('Failed to extend trial');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      await superAdminAPI.recordPayment(selectedTenant.tenant.id, {
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        reference: formData.reference,
        notes: formData.notes,
        months: parseInt(formData.months) || 1
      });
      toast.success('Payment recorded successfully');
      setShowRecordPaymentModal(false);
      fetchDashboardData();
      handleViewTenant(selectedTenant.tenant.id);
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    try {
      await superAdminAPI.createPlan({
        ...formData,
        features: formData.features ? JSON.parse(formData.features) : {}
      });
      toast.success('Plan created successfully');
      setShowPlanModal(false);
      fetchPlans();
      setFormData({});
    } catch (error) {
      toast.error('Failed to create plan');
    }
  };

  const handleUpdatePlan = async (e) => {
    e.preventDefault();
    try {
      await superAdminAPI.updatePlan(editingPlan.id, {
        ...formData,
        features: formData.features ? JSON.parse(formData.features) : undefined
      });
      toast.success('Plan updated successfully');
      setShowPlanModal(false);
      setEditingPlan(null);
      fetchPlans();
      setFormData({});
    } catch (error) {
      toast.error('Failed to update plan');
    }
  };

  const handleDeletePlan = async (planId, planName) => {
    if (!window.confirm(`Delete plan "${planName}"? This will deactivate it.`)) return;

    try {
      await superAdminAPI.deletePlan(planId);
      toast.success('Plan deactivated successfully');
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete plan');
    }
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setFormData({
      display_name: plan.display_name,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_users: plan.max_users,
      max_products: plan.max_products,
      max_transactions_per_month: plan.max_transactions_per_month,
      features: JSON.stringify(plan.features, null, 2),
      is_active: plan.is_active
    });
    setShowPlanModal(true);
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
        <button
          className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          Subscription Plans
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
                          <button
                            className="btn-icon btn-icon-warning"
                            onClick={() => handleImpersonate(tenant.id, tenant.business_name)}
                            title="Impersonate (view as tenant)"
                          >
                            <FaUserSecret />
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

      {/* Plans Management Tab */}
      {activeTab === 'plans' && (
        <div className="plans-section">
          <div className="section-header">
            <h2>Subscription Plans</h2>
            <button
              className="btn btn-primary"
              onClick={() => { setEditingPlan(null); setFormData({}); setShowPlanModal(true); }}
            >
              <FaPlus /> Add Plan
            </button>
          </div>
          <div className="plans-grid">
            {plans.map((plan) => (
              <div key={plan.id} className={`plan-card ${!plan.is_active ? 'inactive' : ''}`}>
                <div className="plan-card-header">
                  <h3>{plan.display_name}</h3>
                  <span className={`badge ${plan.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="plan-card-body">
                  <div className="plan-price">
                    <span className="price-monthly">{formatCurrency(plan.price_monthly)}/mo</span>
                    {plan.price_yearly && (
                      <span className="price-yearly">{formatCurrency(plan.price_yearly)}/yr</span>
                    )}
                  </div>
                  <ul className="plan-limits">
                    <li>Max Users: {plan.max_users || 'Unlimited'}</li>
                    <li>Max Products: {plan.max_products || 'Unlimited'}</li>
                    <li>Transactions/mo: {plan.max_transactions_per_month || 'Unlimited'}</li>
                  </ul>
                </div>
                <div className="plan-card-actions">
                  <button className="btn-icon btn-icon-primary" onClick={() => openEditPlan(plan)} title="Edit">
                    <FaEdit />
                  </button>
                  <button className="btn-icon btn-icon-danger" onClick={() => handleDeletePlan(plan.id, plan.display_name)} title="Deactivate">
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="overview-section">
          <h2>Recent Activity</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {tenants.slice(0, 10).map((tenant) => (
                  <tr key={tenant.id}>
                    <td><strong>{tenant.business_name}</strong></td>
                    <td><span className="badge badge-info">{tenant.plan_display_name || tenant.subscription_plan}</span></td>
                    <td>
                      <span className={`badge badge-${tenant.subscription_status === 'active' ? 'success' : 'danger'}`}>
                        {tenant.subscription_status}
                      </span>
                    </td>
                    <td>{formatDate(tenant.created_at)}</td>
                    <td>{formatCurrency(tenant.total_revenue || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tenant Detail Modal */}
      {showTenantModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowTenantModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedTenant.tenant.business_name}</h2>
              <button className="modal-close" onClick={() => setShowTenantModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="tenant-details-grid">
                <div className="detail-group">
                  <label>Email</label>
                  <span>{selectedTenant.tenant.business_email}</span>
                </div>
                <div className="detail-group">
                  <label>Plan</label>
                  <span>{selectedTenant.tenant.plan_display_name || selectedTenant.tenant.subscription_plan}</span>
                </div>
                <div className="detail-group">
                  <label>Status</label>
                  <span className={`badge badge-${selectedTenant.tenant.subscription_status === 'active' ? 'success' : 'danger'}`}>
                    {selectedTenant.tenant.subscription_status}
                  </span>
                </div>
                <div className="detail-group">
                  <label>Subscription Ends</label>
                  <span>{selectedTenant.tenant.subscription_end_date ? formatDate(selectedTenant.tenant.subscription_end_date) : 'N/A'}</span>
                </div>
                <div className="detail-group">
                  <label>Total Revenue</label>
                  <span>{formatCurrency(selectedTenant.tenant.total_revenue || 0)}</span>
                </div>
                <div className="detail-group">
                  <label>Users</label>
                  <span>{selectedTenant.stats?.total_users || 0}</span>
                </div>
              </div>
              <div className="modal-actions">
                <button
                  className="btn btn-warning"
                  onClick={() => { setShowTenantModal(false); handleImpersonate(selectedTenant.tenant.id, selectedTenant.tenant.business_name); }}
                  title="Enter this tenant's session"
                >
                  <FaUserSecret /> Impersonate
                </button>
                <button className="btn btn-primary" onClick={() => { setShowAssignPlanModal(true); setShowTenantModal(false); setFormData({}); }}>
                  Assign Plan
                </button>
                <button className="btn btn-secondary" onClick={() => handleExtendTrial(selectedTenant.tenant.id)}>
                  <FaClock /> Extend Trial
                </button>
                <button className="btn btn-success" onClick={() => { setShowRecordPaymentModal(true); setShowTenantModal(false); setFormData({}); }}>
                  <FaReceipt /> Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plan Create/Edit Modal */}
      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPlan ? 'Edit Plan' : 'Create Plan'}</h2>
              <button className="modal-close" onClick={() => setShowPlanModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={editingPlan ? handleUpdatePlan : handleCreatePlan}>
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={formData.display_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Monthly Price (KES)</label>
                    <input
                      type="number"
                      value={formData.price_monthly || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_monthly: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Yearly Price (KES)</label>
                    <input
                      type="number"
                      value={formData.price_yearly || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, price_yearly: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Max Users</label>
                    <input
                      type="number"
                      value={formData.max_users || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_users: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Max Products</label>
                    <input
                      type="number"
                      value={formData.max_products || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_products: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Max Transactions/Month</label>
                  <input
                    type="number"
                    value={formData.max_transactions_per_month || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_transactions_per_month: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Features (JSON)</label>
                  <textarea
                    rows={4}
                    value={formData.features || '{}'}
                    onChange={(e) => setFormData(prev => ({ ...prev, features: e.target.value }))}
                  />
                </div>
                {editingPlan && (
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.is_active !== false}
                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      />
                      {' '}Active
                    </label>
                  </div>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPlanModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editingPlan ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Plan Modal */}
      {showAssignPlanModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowAssignPlanModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Plan to {selectedTenant.tenant.business_name}</h2>
              <button className="modal-close" onClick={() => setShowAssignPlanModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleAssignPlan}>
                <div className="form-group">
                  <label>Plan</label>
                  <select
                    value={formData.plan_name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, plan_name: e.target.value }))}
                    required
                  >
                    <option value="">Select Plan</option>
                    <option value="trial">Trial</option>
                    <option value="basic">Basic</option>
                    <option value="premium">Premium</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Months</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.months || 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, months: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAssignPlanModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Assign</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPaymentModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowRecordPaymentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record Payment for {selectedTenant.tenant.business_name}</h2>
              <button className="modal-close" onClick={() => setShowRecordPaymentModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleRecordPayment}>
                <div className="form-group">
                  <label>Amount (KES)</label>
                  <input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    value={formData.payment_method || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                    required
                  >
                    <option value="">Select Method</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Reference</label>
                  <input
                    type="text"
                    value={formData.reference || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Months Paid</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.months || 1}
                    onChange={(e) => setFormData(prev => ({ ...prev, months: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    rows={3}
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowRecordPaymentModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Record Payment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
