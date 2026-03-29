import React from 'react';
import { FaPhone, FaEnvelope, FaGlobe } from 'react-icons/fa';

/**
 * Developer / licensor credit block shown on public pages and in-app footer.
 * variant: 'light' (default, dark text on white) | 'dark' (light text on dark bg)
 */
const HelvinoCredit = ({ variant = 'light' }) => {
  const isDark = variant === 'dark';

  const containerStyle = {
    textAlign: 'center',
    padding: '12px 16px',
    fontSize: 12,
    color: isDark ? 'rgba(255,255,255,0.75)' : 'var(--text-secondary, #6b7280)',
    borderTop: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid var(--border-color, #e5e7eb)',
    lineHeight: 1.8,
  };

  const linkStyle = {
    color: isDark ? 'rgba(255,255,255,0.9)' : 'var(--primary-color, #667eea)',
    textDecoration: 'none',
    fontWeight: 600,
  };

  const rowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    flexWrap: 'wrap',
    marginTop: 4,
  };

  const itemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
  };

  return (
    <div style={containerStyle}>
      <div>
        Developed &amp; Licensed by{' '}
        <a href="https://helvino.org" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          Helvino Technologies Limited
        </a>
      </div>
      <div style={rowStyle}>
        <span style={itemStyle}>
          <FaGlobe size={11} />
          <a href="https://helvino.org" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            helvino.org
          </a>
        </span>
        <span style={itemStyle}>
          <FaPhone size={11} />
          <a href="tel:+254110421320" style={linkStyle}>0110 421 320</a>
        </span>
        <span style={itemStyle}>
          <FaEnvelope size={11} />
          <a href="mailto:info@helvino.org" style={linkStyle}>info@helvino.org</a>
        </span>
      </div>
    </div>
  );
};

export default HelvinoCredit;
