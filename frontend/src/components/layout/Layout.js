import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SubscriptionBanner from '../common/SubscriptionBanner';
import '../../styles/Layout.css';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, tenant } = useAuth();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Don't show subscription banner for super admin
  const showSubscriptionBanner = user && !user.isSuperAdmin && tenant;

  return (
    <div className="layout">
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="layout-container">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
          {showSubscriptionBanner && <SubscriptionBanner subscription={tenant} />}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
