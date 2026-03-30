import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationsContext';
import {
  FaTachometerAlt, FaCashRegister, FaBoxes, FaShoppingBag,
  FaTruck, FaUsers, FaMoneyBillWave, FaChartBar, FaUsersCog,
  FaCog, FaCreditCard, FaStore, FaBars
} from 'react-icons/fa';

const menuItems = [
  { path: '/dashboard',    icon: <FaTachometerAlt />, label: 'Dashboard',    roles: ['admin','manager','cashier','storekeeper'] },
  { path: '/pos',          icon: <FaCashRegister />,  label: 'POS',          roles: ['admin','manager','cashier'] },
  { path: '/products',     icon: <FaBoxes />,          label: 'Products',     roles: ['admin','manager','storekeeper'] },
  { path: '/sales',        icon: <FaShoppingBag />,   label: 'Sales',        roles: ['admin','manager','cashier'] },
  { path: '/purchases',    icon: <FaTruck />,          label: 'Purchases',    roles: ['admin','manager','storekeeper'] },
  { path: '/suppliers',    icon: <FaTruck />,          label: 'Suppliers',    roles: ['admin','manager','storekeeper'] },
  { path: '/customers',    icon: <FaUsers />,          label: 'Customers',    roles: ['admin','manager','cashier'] },
  { path: '/expenses',     icon: <FaMoneyBillWave />,  label: 'Expenses',     roles: ['admin','manager'] },
  { path: '/reports',      icon: <FaChartBar />,       label: 'Reports',      roles: ['admin','manager'] },
  { path: '/users',        icon: <FaUsersCog />,       label: 'Users',        roles: ['admin','manager'] },
  { path: '/subscription', icon: <FaCreditCard />,     label: 'Subscription', roles: ['admin','manager','cashier','storekeeper'] },
  { path: '/settings',     icon: <FaCog />,            label: 'Settings',     roles: ['admin','manager'] },
];

const superAdminItems = [
  { path: '/super-admin', icon: <FaStore />, label: 'Admin Dashboard', roles: ['super_admin'] },
];

// Priority items shown in mobile bottom nav (max 4 slots + More)
const BOTTOM_NAV_PATHS = ['/dashboard', '/pos', '/sales', '/products'];

const Sidebar = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const location = useLocation();

  const allItems = user?.isSuperAdmin ? superAdminItems : menuItems;
  const filtered = allItems.filter(item => item.roles.includes(user?.role));

  const bottomItems = BOTTOM_NAV_PATHS
    .map(p => filtered.find(i => i.path === p))
    .filter(Boolean);

  return (
    <>
      {/* ── Desktop / tablet sidebar ── */}
      <aside className={`sidebar ${isOpen ? 'open mobile-open' : 'closed'}`}>
        <nav className="sidebar-nav">
          {filtered.map((item, idx) => (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => {
                // On mobile, close drawer after navigation
                if (window.innerWidth <= 768 && isOpen) onToggle();
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Mobile bottom navigation ── */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          {bottomItems.map((item, idx) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={idx}
                to={item.path}
                className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          {/* More → opens the sidebar drawer */}
          <button
            className={`bottom-nav-item ${isOpen ? 'active' : ''}`}
            onClick={onToggle}
            aria-label="More menu"
          >
            {unreadCount > 0 && (
              <span className="bottom-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
            <FaBars />
            <span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
