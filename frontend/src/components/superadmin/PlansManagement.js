import React, { useState, useEffect } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FaPlus, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
import { formatCurrency } from '../../utils/helpers';
import '../../styles/SuperAdmin.css';

const PlansManagement = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    plan_name: '',
    display_name: '',
    setup_fee: '',
    price_yearly: '',
    max_users: '',
    max_products: '',
    max_transactions_per_month: '',
    features: {
      support: '',
      reports: '',
      multi_location: false,
      pos_terminals: '',
      api_access: false,
    }
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await superAdminAPI.getAllPlans();
      setPlans(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await superAdminAPI.updatePlan(editingPlan.id, formData);
        toast.success('Plan updated successfully');
      } else {
        await superAdminAPI.createPlan(formData);
        toast.success('Plan created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save plan');
    }
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      plan_name: plan.plan_name,
      display_name: plan.display_name,
      setup_fee: plan.setup_fee,
      price_yearly: plan.price_yearly,
      max_users: plan.max_users,
      max_products: plan.max_products,
      max_transactions_per_month: plan.max_transactions_per_month,
      features: typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features,
    });
    setShowModal(true);
  };

  const handleDelete = async (planId) => {
    if (!window.confirm('Are you sure you want to deactivate this plan?')) return;
    try {
      await superAdminAPI.deletePlan(planId);
      toast.success('Plan deactivated successfully');
      fetchPlans();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete plan');
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      plan_name: '',
      display_name: '',
      setup_fee: '',
      price_yearly: '',
      max_users: '',
      max_products: '',
      max_transactions_per_month: '',
      features: {
        support: '',
        reports: '',
        multi_location: false,
        pos_terminals: '',
        api_access: false,
      }
    });
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="plans-management">
      <div className="page-header">
        <h2>Subscription Plans Management</h2>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setShowModal(true); }}
        >
          <FaPlus /> Create New Plan
        </button>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`plan-card ${!plan.is_active ? 'inactive' : ''}`}>
            <div className="plan-header">
              <h3>{plan.display_name}</h3>
              <span className={`badge ${plan.is_active ? 'badge-success' : 'badge-danger'}`}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="plan-pricing">
              {plan.plan_name !== 'trial' ? (
                <>
                  <div className="price-item">
                    <span className="price-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>One-time setup</span>
                    <span className="price">{formatCurrency(plan.setup_fee || 0)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-label" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Annual renewal</span>
                    <span className="price">{formatCurrency(plan.price_yearly || 0)}/year</span>
                  </div>
                </>
              ) : (
                <div className="price-item">
                  <span className="price">Free (5-day trial)</span>
                </div>
              )}
            </div>

            <div className="plan-limits">
              <div className="limit-item">
                <FaUsers /> {plan.max_users} Users
              </div>
              <div className="limit-item">
                📦 {plan.max_products?.toLocaleString()} Products
              </div>
              <div className="limit-item">
                🛒 {plan.max_transactions_per_month?.toLocaleString()} Transactions/mo
              </div>
            </div>

            <div className="plan-subscribers">
              <FaUsers /> {plan.active_subscribers || 0} Active Subscribers
            </div>

            <div className="plan-actions">
              <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(plan)}>
                <FaEdit /> Edit
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleDelete(plan.id)}
                disabled={plan.active_subscribers > 0}
              >
                <FaTrash /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Plan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Plan Name (slug) *</label>
                  <input
                    type="text"
                    value={formData.plan_name}
                    onChange={(e) => setFormData({...formData, plan_name: e.target.value})}
                    placeholder="e.g., standard"
                    required
                    disabled={!!editingPlan}
                  />
                </div>
                <div className="form-group">
                  <label>Display Name *</label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                    placeholder="e.g., Standard Plan"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>One-Time Setup Fee (KES) *</label>
                  <input
                    type="number"
                    value={formData.setup_fee}
                    onChange={(e) => setFormData({...formData, setup_fee: e.target.value})}
                    placeholder="70000"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Annual Renewal Price (KES) *</label>
                  <input
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) => setFormData({...formData, price_yearly: e.target.value})}
                    placeholder="20000"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Max Users *</label>
                  <input
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData({...formData, max_users: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Max Products *</label>
                  <input
                    type="number"
                    value={formData.max_products}
                    onChange={(e) => setFormData({...formData, max_products: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Max Transactions/Month *</label>
                <input
                  type="number"
                  value={formData.max_transactions_per_month}
                  onChange={(e) => setFormData({...formData, max_transactions_per_month: e.target.value})}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlansManagement;
