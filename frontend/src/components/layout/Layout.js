import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SubscriptionBanner from '../common/SubscriptionBanner';
import HelvinoCredit from '../common/HelvinoCredit';
import ImpersonationBanner from '../common/ImpersonationBanner';
import '../../styles/Layout.css';

const isMobile = () => window.innerWidth <= 768;
const isDesktop = () => window.innerWidth > 1024;

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop());
  const [mobile, setMobile] = useState(isMobile());
  const { user, tenant } = useAuth();
  const location = useLocation();

  // Close mobile drawer on route change
  useEffect(() => {
    if (isMobile()) setSidebarOpen(false);
  }, [location.pathname]);

  // Track mobile/desktop breakpoints
  useEffect(() => {
    const onResize = () => {
      const m = isMobile();
      setMobile(m);
      if (isDesktop()) setSidebarOpen(true);
      else if (m) setSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const showSubscriptionBanner = user && !user.isSuperAdmin && tenant;
  const showOverlay = sidebarOpen && mobile;

  return (
    <div className="layout">
      <ImpersonationBanner />
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="layout-container">
        <div
          className={`sidebar-overlay${showOverlay ? ' visible' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        <main className="main-content">
          {showSubscriptionBanner && <SubscriptionBanner subscription={tenant} />}
          {children}
          <HelvinoCredit />
        </main>
      </div>
    </div>
  );
};

export default Layout;
