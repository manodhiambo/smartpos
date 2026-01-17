import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaClock, FaCreditCard } from 'react-icons/fa';
import '../../styles/SubscriptionBanner.css';

const SubscriptionBanner = ({ subscription }) => {
  const navigate = useNavigate();

  if (!subscription || subscription.status === 'active' && !subscription.isTrial) {
    return null;
  }

  const daysRemaining = subscription.daysRemaining || 0;
  const isExpiringSoon = daysRemaining <= 7;
  const isExpired = daysRemaining <= 0;

  if (isExpired) {
    return (
      <div className="subscription-banner expired">
        <div className="banner-content">
          <FaExclamationTriangle className="banner-icon" />
          <div className="banner-text">
            <strong>Subscription Expired!</strong>
            <p>Your {subscription.isTrial ? 'trial' : 'subscription'} has ended. Renew now to continue using SmartPOS.</p>
          </div>
        </div>
        <button className="banner-btn" onClick={() => navigate('/subscription')}>
          <FaCreditCard /> Renew Now
        </button>
      </div>
    );
  }

  if (subscription.isTrial || isExpiringSoon) {
    return (
      <div className={`subscription-banner ${isExpiringSoon ? 'warning' : 'info'}`}>
        <div className="banner-content">
          <FaClock className="banner-icon" />
          <div className="banner-text">
            <strong>
              {subscription.isTrial ? 'Free Trial Active' : 'Subscription Expiring Soon'}
            </strong>
            <p>
              {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining. 
              {subscription.isTrial && ' Upgrade to continue after trial ends.'}
            </p>
          </div>
        </div>
        <button className="banner-btn" onClick={() => navigate('/subscription')}>
          {subscription.isTrial ? 'Upgrade Now' : 'Renew'}
        </button>
      </div>
    );
  }

  return null;
};

export default SubscriptionBanner;
