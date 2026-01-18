import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { dashboardAPI } from '../services/api';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};

export const NotificationsProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const fetchIntervalRef = useRef(null);
  const hasErrorRef = useRef(false);

  // Use useCallback to memoize the fetch function
  const fetchNotifications = useCallback(async () => {
    // Don't retry if we've already had an error
    if (hasErrorRef.current) {
      return;
    }

    try {
      setLoading(true);
      
      // Get low stock alerts
      const lowStockRes = await dashboardAPI.getStats();
      const lowStockItems = lowStockRes.data.data.lowStockItems || [];
      
      // Convert to notifications format
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
      hasErrorRef.current = false; // Reset error flag on success
    } catch (error) {
      console.warn('Notifications disabled - endpoint not available');
      hasErrorRef.current = true; // Stop retrying
      
      // Clear any existing interval
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
        fetchIntervalRef.current = null;
      }
      
      // Set empty notifications
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Fetch on mount only
  useEffect(() => {
    fetchNotifications();
    
    // Only set interval if first fetch succeeds
    if (!hasErrorRef.current) {
      fetchIntervalRef.current = setInterval(fetchNotifications, 10 * 60 * 1000); // 10 minutes
    }
    
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [fetchNotifications]);

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
