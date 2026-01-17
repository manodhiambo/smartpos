import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import { dashboardAPI } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Prevent overlapping requests
  const isFetchingRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user || isFetchingRef.current) return;

    isFetchingRef.current = true;

    try {
      setLoading(true);

      const lowStockRes = await dashboardAPI.getStats();
      const lowStockItems = lowStockRes.data?.data?.lowStockItems || [];

      const stockNotifications = lowStockItems.map(item => ({
        id: `stock-${item.id}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${item.name} is running low (${item.stock_quantity} ${item.unit_of_measure} remaining)`,
        read: false,
        createdAt: new Date().toISOString(),
        severity: item.stock_quantity <= 5 ? 'critical' : 'warning'
      }));

      setNotifications(stockNotifications);
      setUnreadCount(stockNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
