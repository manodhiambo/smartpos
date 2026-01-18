import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaCheck, FaTimes, FaPhone, FaCreditCard, FaClock } from 'react-icons/fa';
import { formatCurrency, formatDate, formatNumber } from '../utils/helpers'; // Added formatNumber
import toast from 'react-hot-toast';
import '../styles/Subscription.css';

const SubscriptionPage = () => {
  const { user, tenant, updateUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedMonths, setSelectedMonths] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentId, setPaymentId] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes, paymentsRes] = await Promise.all([
        paymentsAPI.getPlans(),
        paymentsAPI.getSubscriptionInfo(),
        paymentsAPI.getPaymentHistory()
      ]);

      setPlans(plansRes.data.data);
      setSubscriptionInfo(subRes.data.data);
      setPaymentHistory(paymentsRes.data.data);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (plan) => {
    if (plan.plan_name === 'trial') {
      toast.error('Cannot purchase trial plan');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const calculateTotal = () => {
    if (!selectedPlan) return 0;
    return selectedPlan.price_monthly * selectedMonths;
  };

  const handleInitiatePayment = async (e) => {
    e.preventDefault();

    if (!phoneNumber || phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await paymentsAPI.initiatePayment({
        planName: selectedPlan.plan_name,
        months: selectedMonths,
        phone: phoneNumber
      });

      if (response.data.success) {
        setPaymentId(response.data.data.paymentId);
        toast.success('Payment request sent! Please check your phone.');
        
        // Start checking payment status
        checkPaymentStatus(response.data.data.paymentId);
      } else {
        toast.error(response.data.message || 'Failed to initiate payment');
        setProcessingPayment(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment initiation failed');
      setProcessingPayment(false);
    }
  };

  const checkPaymentStatus = async (payId) => {
    let attempts = 0;
    const maxAttempts = 30; // Check for 2 minutes (30 * 4 seconds)

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await paymentsAPI.checkPaymentStatus(payId);
        
        if (response.data.data.status === 'completed') {
          clearInterval(interval);
          toast.success('Payment successful! Your subscription has been upgraded.');
          setShowPaymentModal(false);
          setProcessingPayment(false);
          fetchData();
          
          // Refresh user session
          window.location.reload();
        } else if (response.data.data.status === 'failed') {
          clearInterval(interval);
          toast.error('Payment failed. Please try again.');
          setProcessingPayment(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          toast.info('Payment status check timed out. Please refresh to see updates.');
          setProcessingPayment(false);
        }
      } catch (error) {
        console.error('Status check error:', error);
      }
    }, 4000); // Check every 4 seconds
  };

  const getPlanFeatures = (features) => {
    if (typeof features === 'string') {
      try {
        return JSON.parse(features);
      } catch {
        return {};
      }
    }
    return features || {};
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="subscription-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription & Billing</h1>
          <p className="page-subtitle">Manage your subscription plan</p>
        </div>
      </div>

      {/* Current Subscription */}
      {subscriptionInfo && (
        <div className="current-subscription">
          <h2>Current Plan</h2>
          <div className="subscription-card">
            <div className="subscription-details">
              <div className="plan-badge">
                {subscriptionInfo.subscription_plan?.toUpperCase()}
                {subscriptionInfo.is_trial && <span className="trial-badge">Trial</span>}
              </div>
              <h3>{subscriptionInfo.display_name || 'Free Trial'}</h3>
              <p className="plan-price">
                {subscriptionInfo.monthly_price > 0 
                  ? formatCurrency(subscriptionInfo.monthly_price) + '/month'
                  : 'Free'}
              </p>
              
              <div className="subscription-status">
                <div className="status-item">
                  <FaClock />
                  <div>
                    <span className="status-label">
                      {subscriptionInfo.is_trial ? 'Trial Ends' : 'Renews On'}
                    </span>
                    <span className="status-value">
                      {formatDate(subscriptionInfo.is_trial ? subscriptionInfo.trial_ends_at : subscriptionInfo.subscription_ends_at)}
                    </span>
                  </div>
                </div>
                <div className="status-item">
                  <span className={`status-badge ${subscriptionInfo.days_remaining <= 7 ? 'warning' : 'success'}`}>
                    {Math.max(0, Math.floor(subscriptionInfo.days_remaining))} days remaining
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div className="plans-section">
        <h2>Available Plans</h2>
        <div className="plans-grid">
          {plans.map((plan) => {
            const features = getPlanFeatures(plan.features);
            const isCurrentPlan = subscriptionInfo?.subscription_plan === plan.plan_name;
            
            return (
              <div 
                key={plan.id} 
                className={`plan-card ${plan.plan_name === 'premium' ? 'featured' : ''} ${isCurrentPlan ? 'current' : ''}`}
              >
                {plan.plan_name === 'premium' && (
                  <div className="featured-badge">Most Popular</div>
                )}
                {isCurrentPlan && (
                  <div className="current-plan-badge">Current Plan</div>
                )}

                <h3>{plan.display_name}</h3>
                <div className="plan-price-large">
                  <span className="currency">KES</span>
                  <span className="amount">{formatCurrency(plan.price_monthly).replace('KES ', '')}</span>
                  <span className="period">/month</span>
                </div>
                <p className="plan-yearly">
                  or {formatCurrency(plan.price_yearly)}/year (Save {Math.round((1 - (plan.price_yearly / (plan.price_monthly * 12))) * 100)}%)
                </p>

                <ul className="plan-features">
                  <li><FaCheck /> Up to {formatNumber(plan.max_users)} users</li>
                  <li><FaCheck /> {formatNumber(plan.max_products)} products</li>
                  <li><FaCheck /> {formatNumber(plan.max_transactions_per_month)} transactions/month</li>
                  {features.multi_location ? (
                    <li><FaCheck /> Multi-location support</li>
                  ) : (
                    <li className="disabled"><FaTimes /> Multi-location support</li>
                  )}
                  {features.api_access ? (
                    <li><FaCheck /> API Access</li>
                  ) : (
                    <li className="disabled"><FaTimes /> API Access</li>
                  )}
                  {features.support && (
                    <li><FaCheck /> {features.support.replace('_', ' ')} support</li>
                  )}
                </ul>

                <button 
                  className={`btn ${plan.plan_name === 'premium' ? 'btn-primary' : 'btn-outline'} btn-block`}
                  onClick={() => handleSelectPlan(plan)}
                  disabled={plan.plan_name === 'trial' || isCurrentPlan}
                >
                  {isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment History */}
      {paymentHistory.length > 0 && (
        <div className="payment-history-section">
          <h2>Payment History</h2>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Plan</th>
                  <th>Duration</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td>{formatDate(payment.created_at)}</td>
                    <td><span className="badge badge-info">{payment.subscription_period}</span></td>
                    <td>{payment.subscription_months} month(s)</td>
                    <td>{formatCurrency(payment.amount)}</td>
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

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="modal-overlay" onClick={() => !processingPayment && setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Complete Payment</h2>
              {!processingPayment && (
                <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
              )}
            </div>

            <div className="payment-modal-body">
              <div className="selected-plan-info">
                <h3>{selectedPlan.display_name}</h3>
                <p className="plan-description">
                  {formatCurrency(selectedPlan.price_monthly)}/month
                </p>
              </div>

              <form onSubmit={handleInitiatePayment}>
                <div className="input-group">
                  <label>Subscription Duration</label>
                  <select 
                    value={selectedMonths} 
                    onChange={(e) => setSelectedMonths(parseInt(e.target.value))}
                    disabled={processingPayment}
                  >
                    <option value="1">1 Month</option>
                    <option value="3">3 Months (Save 5%)</option>
                    <option value="6">6 Months (Save 10%)</option>
                    <option value="12">12 Months (Save 15%)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>M-Pesa Phone Number *</label>
                  <div className="input-with-icon">
                    <FaPhone className="input-icon" />
                    <input
                      type="tel"
                      placeholder="0712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                      disabled={processingPayment}
                    />
                  </div>
                  <small>Enter the phone number to receive payment prompt</small>
                </div>

                <div className="payment-summary">
                  <div className="summary-row">
                    <span>Subtotal ({selectedMonths} month{selectedMonths > 1 ? 's' : ''})</span>
                    <span>{formatCurrency(selectedPlan.price_monthly * selectedMonths)}</span>
                  </div>
                  {selectedMonths >= 3 && (
                    <div className="summary-row discount">
                      <span>Discount</span>
                      <span>-{formatCurrency(selectedPlan.price_monthly * selectedMonths * (selectedMonths >= 12 ? 0.15 : selectedMonths >= 6 ? 0.10 : 0.05))}</span>
                    </div>
                  )}
                  <div className="summary-row total">
                    <span><strong>Total Amount</strong></span>
                    <span><strong>{formatCurrency(calculateTotal())}</strong></span>
                  </div>
                </div>

                {processingPayment ? (
                  <div className="payment-processing">
                    <div className="spinner"></div>
                    <p>Waiting for payment confirmation...</p>
                    <small>Please complete the payment on your phone</small>
                  </div>
                ) : (
                  <button type="submit" className="btn btn-primary btn-block">
                    <FaCreditCard /> Pay with M-Pesa
                  </button>
                )}
              </form>

              <div className="payment-info">
                <p><strong>How it works:</strong></p>
                <ol>
                  <li>Enter your M-Pesa phone number</li>
                  <li>Click "Pay with M-Pesa"</li>
                  <li>You'll receive a prompt on your phone</li>
                  <li>Enter your M-Pesa PIN to complete</li>
                  <li>Your subscription will be activated immediately</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
