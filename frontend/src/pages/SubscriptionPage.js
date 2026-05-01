import React, { useState, useEffect } from 'react';
import { paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaCheck, FaPhone, FaCreditCard, FaClock, FaStar, FaSync } from 'react-icons/fa';
import { formatCurrency, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/Subscription.css';

const SubscriptionPage = () => {
  const { user, tenant } = useAuth();
  const [standardPlan, setStandardPlan] = useState(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState('setup'); // 'setup' | 'renewal'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

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

      const plans = plansRes.data.data || [];
      setStandardPlan(plans.find(p => p.plan_name === 'standard') || null);
      setSubscriptionInfo(subRes.data.data);
      setPaymentHistory(paymentsRes.data.data || []);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (type) => {
    setPaymentType(type);
    setPhoneNumber('');
    setShowPaymentModal(true);
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
        payment_type: paymentType,
        phone: phoneNumber
      });

      if (response.data.success) {
        toast.success('Payment request sent! Please check your phone.');
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

  const checkPaymentStatus = (payId) => {
    let attempts = 0;
    const maxAttempts = 30;

    const interval = setInterval(async () => {
      attempts++;
      try {
        const response = await paymentsAPI.checkPaymentStatus(payId);
        const { status } = response.data.data;

        if (status === 'completed') {
          clearInterval(interval);
          toast.success(
            paymentType === 'setup'
              ? 'Setup fee paid! Your subscription is now active for 1 year.'
              : 'Subscription renewed for 1 year!'
          );
          setShowPaymentModal(false);
          setProcessingPayment(false);
          fetchData();
          window.location.reload();
        } else if (status === 'failed') {
          clearInterval(interval);
          toast.error('Payment failed. Please try again.');
          setProcessingPayment(false);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          toast.info('Payment timed out. Refresh to see updates.');
          setProcessingPayment(false);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }, 4000);
  };

  const isOnTrial = subscriptionInfo?.is_trial;
  const setupFeePaid = subscriptionInfo?.setup_fee_paid;
  const isActive = subscriptionInfo?.subscription_status === 'active';
  const daysLeft = Math.max(0, Math.floor(subscriptionInfo?.days_remaining || 0));

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return (
    <div className="subscription-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription & Billing</h1>
          <p className="page-subtitle">Manage your SmartPOS subscription</p>
        </div>
      </div>

      {/* Current Status */}
      {subscriptionInfo && (
        <div className="current-subscription">
          <h2>Current Plan</h2>
          <div className="subscription-card">
            <div className="subscription-details">
              <div className="plan-badge">
                {subscriptionInfo.subscription_plan?.toUpperCase()}
                {isOnTrial && <span className="trial-badge">Trial</span>}
              </div>
              <h3>{isOnTrial ? 'Free Trial' : (subscriptionInfo.display_name || 'Standard Plan')}</h3>

              <div className="subscription-status">
                <div className="status-item">
                  <FaClock />
                  <div>
                    <span className="status-label">
                      {isOnTrial ? 'Trial Ends' : 'Subscription Expires'}
                    </span>
                    <span className="status-value">
                      {formatDate(isOnTrial
                        ? subscriptionInfo.trial_ends_at
                        : subscriptionInfo.subscription_ends_at
                      )}
                    </span>
                  </div>
                </div>
                <div className="status-item">
                  <span className={`status-badge ${daysLeft <= 30 ? 'warning' : 'success'}`}>
                    {daysLeft} days remaining
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="subscription-actions" style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {!setupFeePaid && (
                  <button className="btn btn-primary" onClick={() => openPaymentModal('setup')}>
                    <FaCreditCard /> Pay Setup Fee — {formatCurrency(standardPlan?.setup_fee || 70000)}
                  </button>
                )}
                {setupFeePaid && (
                  <button className="btn btn-outline" onClick={() => openPaymentModal('renewal')}>
                    <FaSync /> Renew — {formatCurrency(standardPlan?.price_yearly || 20000)}/year
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Banner */}
      <div style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', borderRadius: 12, padding: '20px 24px', marginBottom: 24, color: '#fff' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>M-Pesa Payment Details</h3>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Paybill No.</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>522533</div>
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Account No.</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>8071524</div>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.9 }}>
          Use these details to pay via M-Pesa Paybill. After payment, contact support with your confirmation code for manual activation.
        </p>
      </div>

      {/* Pricing Overview */}
      <div className="plans-section">
        <h2>SmartPOS Pricing</h2>
        <div className="plans-grid pricing-grid">

          {/* Setup Fee */}
          <div className="plan-card featured">
            <div className="featured-badge">One-Time</div>
            <h3>Setup Fee</h3>
            <div className="plan-price-large">
              <span className="currency">KES</span>
              <span className="amount">{(standardPlan?.setup_fee || 70000).toLocaleString()}</span>
            </div>
            <p className="plan-yearly" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Paid once to activate your account
            </p>
            <ul className="plan-features">
              <li><FaCheck /> Full system setup &amp; onboarding</li>
              <li><FaCheck /> Unlimited products &amp; users</li>
              <li><FaCheck /> Multi-location support</li>
              <li><FaCheck /> M-Pesa integration</li>
              <li><FaCheck /> First year subscription included</li>
            </ul>
            {!setupFeePaid ? (
              <button
                className="btn btn-primary btn-block"
                onClick={() => openPaymentModal('setup')}
              >
                <FaCreditCard /> Pay Setup Fee
              </button>
            ) : (
              <button className="btn btn-outline btn-block" disabled>
                <FaCheck /> Already Paid
              </button>
            )}
          </div>

          {/* Annual Renewal */}
          <div className="plan-card">
            <h3>Annual Renewal</h3>
            <div className="plan-price-large">
              <span className="currency">KES</span>
              <span className="amount">{(standardPlan?.price_yearly || 20000).toLocaleString()}</span>
              <span className="period">/year</span>
            </div>
            <p className="plan-yearly" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Paid every year to keep access active
            </p>
            <ul className="plan-features">
              <li><FaCheck /> Continued full access</li>
              <li><FaCheck /> Software updates</li>
              <li><FaCheck /> Email &amp; phone support</li>
              <li><FaCheck /> Cloud data backup</li>
              <li><FaStar /> Priority support</li>
            </ul>
            {setupFeePaid ? (
              <button
                className="btn btn-primary btn-block"
                onClick={() => openPaymentModal('renewal')}
              >
                <FaSync /> Renew Subscription
              </button>
            ) : (
              <button className="btn btn-outline btn-block" disabled>
                Pay setup fee first
              </button>
            )}
          </div>

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
                  <th>Type</th>
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
                    <td>
                      <span className={`badge ${payment.payment_for === 'setup' ? 'badge-info' : 'badge-success'}`}>
                        {payment.payment_for === 'setup' ? 'Setup Fee' : 'Annual Renewal'}
                      </span>
                    </td>
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
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => !processingPayment && setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{paymentType === 'setup' ? 'Pay Setup Fee' : 'Renew Subscription'}</h2>
              {!processingPayment && (
                <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
              )}
            </div>

            <div className="payment-modal-body">
              <div className="selected-plan-info">
                <h3>{paymentType === 'setup' ? 'One-Time Setup Fee' : 'Annual Subscription Renewal'}</h3>
              </div>

              <div className="payment-summary" style={{ marginBottom: 20 }}>
                <div className="summary-row total">
                  <span><strong>Amount Due</strong></span>
                  <span><strong>
                    {formatCurrency(
                      paymentType === 'setup'
                        ? (standardPlan?.setup_fee || 70000)
                        : (standardPlan?.price_yearly || 20000)
                    )}
                  </strong></span>
                </div>
                {paymentType === 'setup' && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                    Includes first year of subscription. Annual renewal of KES 20,000 applies thereafter.
                  </p>
                )}
                {paymentType === 'renewal' && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                    Extends your subscription by 1 year from the current expiry date.
                  </p>
                )}
              </div>

              <form onSubmit={handleInitiatePayment}>
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
                  <small>Enter the M-Pesa number to receive the payment prompt</small>
                </div>

                {processingPayment ? (
                  <div className="payment-processing">
                    <div className="spinner"></div>
                    <p>Waiting for payment confirmation...</p>
                    <small>Complete the payment on your phone</small>
                  </div>
                ) : (
                  <button type="submit" className="btn btn-primary btn-block">
                    <FaCreditCard /> Pay with M-Pesa
                  </button>
                )}
              </form>

              <div className="payment-info">
                <p><strong>Pay via M-Pesa STK Push:</strong></p>
                <ol>
                  <li>Enter your M-Pesa phone number</li>
                  <li>Click "Pay with M-Pesa"</li>
                  <li>You'll receive a prompt on your phone</li>
                  <li>Enter your M-Pesa PIN to complete</li>
                  <li>Your subscription will be activated immediately</li>
                </ol>
              </div>

              <div className="payment-info" style={{ marginTop: 16, background: 'var(--bg-secondary, #f8f9fa)', borderRadius: 8, padding: '12px 16px' }}>
                <p><strong>Or pay manually via Paybill:</strong></p>
                <div style={{ display: 'flex', gap: 24, marginTop: 8, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Paybill No.</span>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>522533</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Account No.</span>
                    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>8071524</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, marginTop: 8, color: 'var(--text-secondary)' }}>
                  After payment, send the M-Pesa confirmation message to support for manual activation.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;
