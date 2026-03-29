import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaUserSecret, FaSignOutAlt, FaExclamationTriangle } from 'react-icons/fa';

const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedTenantName, stopImpersonating } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleStop = () => {
    stopImpersonating();
    navigate('/super-admin');
  };

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      background: 'linear-gradient(90deg, #b45309 0%, #92400e 100%)',
      color: 'white',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      fontSize: 14,
      fontWeight: 600,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <FaUserSecret size={18} />
        <FaExclamationTriangle size={14} style={{ opacity: 0.8 }} />
        <span>
          You are viewing as <strong style={{ textDecoration: 'underline' }}>{impersonatedTenantName}</strong>.
          &nbsp;Changes you make affect this tenant's live data.
        </span>
      </div>
      <button
        onClick={handleStop}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: 'white',
          color: '#92400e',
          border: 'none',
          borderRadius: 6,
          padding: '6px 14px',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <FaSignOutAlt /> Exit — Return to Super Admin
      </button>
    </div>
  );
};

export default ImpersonationBanner;
