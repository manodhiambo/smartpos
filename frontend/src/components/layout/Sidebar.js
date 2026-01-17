import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FaTachometerAlt,
  FaCashRegister,
  FaBoxes,
  FaShoppingBag,
  FaTruck,
  FaUsers,
  FaMoneyBillWave,
  FaChartBar,
  FaUsersCog,
  FaCog
} from 'react-icons/fa';

const Sidebar = ({ isOpen }) => {
  const { user } = useAuth();

  const menuItems = [
    {
      path: '/dashboard',
      icon: <FaTachometerAlt />,
      label: 'Dashboard',
      roles: ['admin', 'manager', 'cashier', 'storekeeper']
    },
    {
      path: '/pos',
      icon: <FaCashRegister />,
      label: 'POS',
      roles: ['admin', 'manager', 'cashier']
    },
    {
      path: '/products',
      icon: <FaBoxes />,
      label: 'Products',
      roles: ['admin', 'manager', 'storekeeper']
    },
    {
      path: '/sales',
      icon: <FaShoppingBag />,
      label: 'Sales',
      roles: ['admin', 'manager', 'cashier']
    },
    {
      path: '/purchases',
      icon: <FaTruck />,
      label: 'Purchases',
      roles: ['admin', 'manager', 'storekeeper']
    },
    {
      path: '/suppliers',
      icon: <FaTruck />,
      label: 'Suppliers',
      roles: ['admin', 'manager', 'storekeeper']
    },
    {
      path: '/customers',
      icon: <FaUsers />,
      label: 'Customers',
      roles: ['admin', 'manager', 'cashier']
    },
    {
      path: '/expenses',
      icon: <FaMoneyBillWave />,
      label: 'Expenses',
      roles: ['admin', 'manager']
    },
    {
      path: '/reports',
      icon: <FaChartBar />,
      label: 'Reports',
      roles: ['admin', 'manager']
    },
    {
      path: '/users',
      icon: <FaUsersCog />,
      label: 'Users',
      roles: ['admin', 'manager']
    },
    {
      path: '/settings',
      icon: <FaCog />,
      label: 'Settings',
      roles: ['admin', 'manager']
    }
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav">
        {filteredMenuItems.map((item, index) => (
          <NavLink
            key={index}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon">{item.icon}</span>
            {isOpen && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
