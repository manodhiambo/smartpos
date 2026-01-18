import React, { useState } from 'react';
import { superAdminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { FaBan, FaCheck, FaClock, FaDollarSign, FaGift } from 'react-icons/fa';
import { formatCurrency, formatDate } from '../../utils/helpers';

const TenantManagement = ({ tenant, onUpdate }) => {
  const [showAssignPlan, setShowAssignPlan] = useState(false);
  const [showExtendTrial, setShowExtendTrial] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [plans, setPlans] = useState([]);
  
  const [assignData, setAssignData] = useState({
    plan_name: '',
    months: 1
  });

  const [trialDays, setTrialDays] = useState(30);
  
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'manual',
    reference: '',
    notes: '',
    months: 1
  });

  React.useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await superAdminAPI.getAllPlans();
      setPlans(response.data.data.filter(p => p.is_active));
    } catch (error) {
      console.error('Failed to fetch plans');
    }
  };

  const handleSuspend = async () => {
    const reason = prompt('Reason for suspension:');
    if (!reason) return;

    try {
      await superAdminAPI.suspendTenant(tenant.id, reason);
      toast.success('Tenant suspended successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to suspend tenant');
    }
  };

  const handleActivate = async () => {
    try {
      await superAdminAPI.activateTenant(tenant.id);
      toast.success('Tenant activated successfully');
      onUpdate();
    } catch (error) {
      toast.error('Failed to activate tenant');
    }
  };

  const handleAssignPlan = async (e) => {
    e.preventDefault();
    
    try {
      await superAdminAPI.assignPlan(tenant.id, assignData);
      toast.success(`Plan assigned for ${assignData.months} month(s)`);
      setShowAssignPlan(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to assign plan');
    }
  };

  const handleExtendTrial = async (e) => {
    e.preventDefault();
    
    try {
      await superAdminAPI.extendTrial(tenant.id, trialDays);
      toast.success(`Trial extended by ${trialDays} days`);
      setShowExtendTrial(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to extend trial');
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    
    try {
      await superAdminAPI.recordPayment(tenant.id, paymentData);
      toast.success('Payment recorded successfully');
      setShowRecordPayment(false);
      setPaymentData({
        amount: '',
        payment_method: 'manual',
        reference: '',
        notes: '',
        months: 1
      });
      onUpdate();
    } catch (error) {
      toast.error('Failed to record payment');
    }
  };

  return (
    <div className="tenant-management-actions">
      <div className="action-buttons">
        {tenant.subscription_status === 'active' ? (
          <button className="btn btn-danger" onClick={handleSuspend}>
            <FaBan /> Suspend Tenant
          </button>
        ) : (
          <button className="btn btn-success" onClick={handleActivate}>
            <FaCheck /> Activate Tenant
          </button>
        )}

        <button className="btn btn-primary" onClick={() => setShowAssignPlan(true)}>
          <FaGift /> Assign Plan
        </button>

        <button className="btn btn-secondary" onClick={() => setShowExtendTrial(true)}>
          <FaClock /> Extend Trial
        </button>

        <button className="btn btn-success" onClick={() => setShowRecordPayment(true)}>
          <FaDollarSign /> Record Payment
        </button>
      </div>

      {/* Assign Plan Modal */}
      {showAssignPlan && (
        <div className="modal-overlay" onClick={() => setShowAssignPlan(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Subscription Plan</h3>
              <button className="close-btn" onClick={() => setShowAssignPlan(false)}>×</button>
            </div>

            <form onSubmit={handleAssignPlan} className="modal-body">
              <div className="form-group">
                <label>Select Plan *</label>
                <select
                  value={assignData.plan_name}
                  onChange={(e) => setAssignData({...assignData, plan_name: e.target.value})}
                  required
                >
                  <option value="">Choose a plan...</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.plan_name}>
                      {plan.display_name} - {formatCurrency(plan.price_monthly)}/month
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Duration (Months) *</label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={assignData.months}
                  onChange={(e) => setAssignData({...assignData, months: e.target.value})}
                  required
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssignPlan(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Assign Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Trial Modal */}
      {showExtendTrial && (
        <div className="modal-overlay" onClick={() => setShowExtendTrial(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Extend Trial Period</h3>
              <button className="close-btn" onClick={() => setShowExtendTrial(false)}>×</button>
            </div>

            <form onSubmit={handleExtendTrial} className="modal-body">
              <div className="form-group">
                <label>Additional Days *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={trialDays}
                  onChange={(e) => setTrialDays(e.target.value)}
                  required
                />
                <small>Current trial ends: {formatDate(tenant.trial_ends_at)}</small>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExtendTrial(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Extend Trial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className="modal-overlay" onClick={() => setShowRecordPayment(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Manual Payment</h3>
              <button className="close-btn" onClick={() => setShowRecordPayment(false)}>×</button>
            </div>

            <form onSubmit={handleRecordPayment} className="modal-body">
              <div className="form-group">
                <label>Amount (KES) *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                >
                  <option value="manual">Manual</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div className="form-group">
                <label>Reference Number</label>
                <input
                  type="text"
                  value={paymentData.reference}
                  onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                  placeholder="Transaction ID or receipt number"
                />
              </div>

              <div className="form-group">
                <label>Extend Subscription (Months)</label>
                <input
                  type="number"
                  min="0"
                  value={paymentData.months}
                  onChange={(e) => setPaymentData({...paymentData, months: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                  rows="3"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRecordPayment(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantManagement;
