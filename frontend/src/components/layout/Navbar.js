import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaBars, FaShoppingCart, FaUser, FaBell, FaSignOutAlt, FaCog } from 'react-icons/fa';

const Navbar = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          <FaBars />
        </button>
        <div className="navbar-logo">
          <FaShoppingCart />
          <span>SmartPOS</span>
        </div>
      </div>

      <div className="navbar-center">
        <div className="navbar-store-info">
          <span className="store-name">{user?.tenant?.businessName}</span>
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-icon-btn">
          <FaBell />
          <span className="notification-badge">3</span>
        </button>

        <div className="navbar-profile">
          <button 
            className="profile-btn"
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
            <div className="profile-menu">
              <button className="profile-menu-item" onClick={() => navigate('/settings/profile')}>
                <FaUser /> My Profile
              </button>
              <button className="profile-menu-item" onClick={() => navigate('/settings')}>
                <FaCog /> Settings
              </button>
              <div className="profile-menu-divider"></div>
              <button className="profile-menu-item logout" onClick={handleLogout}>
                <FaSignOutAlt /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
