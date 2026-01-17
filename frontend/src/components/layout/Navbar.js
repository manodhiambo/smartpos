import React, { useState } from 'react';
import { FaBell, FaUser, FaSignOutAlt, FaCog, FaStore, FaTimes, FaCheck } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../../utils/helpers';

const Navbar = () => {
  const { user, tenant, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'low_stock': return '📦';
      case 'sale': return '💰';
      case 'user': return '👤';
      default: return '🔔';
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <h2 className="navbar-brand">
          <FaStore /> {tenant?.businessName || 'SmartPOS'}
        </h2>
      </div>

      <div className="navbar-right">
        {/* Notifications */}
        <div className="navbar-item notification-container">
          <button 
            className="navbar-icon-btn"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="notification-overlay" 
                onClick={() => setShowNotifications(false)}
              />
              <div className="notifications-dropdown">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  {notifications.length > 0 && (
                    <div className="notifications-actions">
                      <button 
                        className="text-btn"
                        onClick={markAllAsRead}
                      >
                        <FaCheck /> Mark all read
                      </button>
                      <button 
                        className="text-btn"
                        onClick={clearAll}
                      >
                        <FaTimes /> Clear all
                      </button>
                    </div>
                  )}
                </div>

                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">
                      <FaBell style={{ fontSize: '48px', opacity: 0.3 }} />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="notification-icon">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="notification-content">
                          <div className="notification-title">
                            {notification.title}
                            {!notification.read && (
                              <span className="unread-dot"></span>
                            )}
                          </div>
                          <div className="notification-message">
                            {notification.message}
                          </div>
                          <div className="notification-time">
                            {formatTime(notification.createdAt)}
                          </div>
                        </div>
                        <div 
                          className="notification-severity"
                          style={{ backgroundColor: getSeverityColor(notification.severity) }}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile Menu */}
        <div className="navbar-item">
          <button 
            className="navbar-profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar">
              <FaUser />
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.fullName}</span>
              <span className="profile-role">{user?.role}</span>
            </div>
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="dropdown-overlay" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <div className="profile-avatar large">
                    <FaUser />
                  </div>
                  <div>
                    <div className="profile-dropdown-name">{user?.fullName}</div>
                    <div className="profile-dropdown-email">{user?.email || user?.username}</div>
                  </div>
                </div>

                <div className="profile-dropdown-menu">
                  <button 
                    className="profile-menu-item"
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                  >
                    <FaCog /> Settings
                  </button>
                  <button 
                    className="profile-menu-item danger"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt /> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
