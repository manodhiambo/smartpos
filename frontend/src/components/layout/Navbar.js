import React, { useState } from 'react';
import { FaBars, FaBell, FaUser, FaSignOutAlt, FaCog, FaShoppingCart, FaTimes, FaCheck } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../../utils/helpers';

const Navbar = ({ toggleSidebar }) => {
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

  // Get business name from tenant or fallback to user data
  const businessName = tenant?.businessName || user?.businessName || 'SmartPOS';

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <FaBars />
        </button>
        <div className="navbar-logo">
          <FaShoppingCart />
          <span>{businessName}</span>
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-store-info">
          <span className="store-name">{businessName}</span>
        </div>
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
        <div className="navbar-profile">
          <button 
            className="profile-btn"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar">
              <FaUser />
            </div>
            <div className="profile-info">
              <span className="profile-name">{user?.fullName || user?.username || 'User'}</span>
              <span className="profile-role">{user?.role || 'Role'}</span>
            </div>
          </button>

          {showProfileMenu && (
            <>
              <div 
                className="dropdown-overlay" 
                onClick={() => setShowProfileMenu(false)}
              />
              <div className="profile-menu">
                <div className="profile-menu-header">
                  <div className="profile-avatar large">
                    <FaUser />
                  </div>
                  <div>
                    <div className="profile-menu-name">{user?.fullName || user?.username}</div>
                    <div className="profile-menu-email">{user?.email || user?.username}</div>
                  </div>
                </div>

                <div className="profile-menu-items">
                  <button 
                    className="profile-menu-item"
                    onClick={() => {
                      navigate('/settings');
                      setShowProfileMenu(false);
                    }}
                  >
                    <FaCog /> Settings
                  </button>
                  <div className="profile-menu-divider"></div>
                  <button 
                    className="profile-menu-item logout"
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
