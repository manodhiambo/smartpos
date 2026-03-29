import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, superAdminAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedTenantName, setImpersonatedTenantName] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const savedTenant = localStorage.getItem('tenant');

    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedTenant) {
          setTenant(JSON.parse(savedTenant));
        }
        // Restore impersonation state across page refreshes
        const impersonating = localStorage.getItem('impersonating');
        if (impersonating) {
          setIsImpersonating(true);
          setImpersonatedTenantName(localStorage.getItem('impersonated_name') || '');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        logout();
      }
    }
    setLoading(false);
  };

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData, tenant: tenantData } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (tenantData) {
        localStorage.setItem('tenant', JSON.stringify(tenantData));
        setTenant(tenantData);
      }

      setUser(userData);
      
      // Return success response
      return { success: true, user: userData, tenant: tenantData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (data) => {
    try {
      const response = await authAPI.register(data);
      const { token, user: userData, tenant: tenantData } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      if (tenantData) {
        localStorage.setItem('tenant', JSON.stringify(tenantData));
        setTenant(tenantData);
      }

      setUser(userData);
      
      // Return success response
      return { success: true, user: userData, tenant: tenantData };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    localStorage.removeItem('impersonating');
    localStorage.removeItem('impersonated_name');
    setUser(null);
    setTenant(null);
    setIsImpersonating(false);
    setImpersonatedTenantName('');
  };

  /**
   * Super admin: enter a tenant's session
   */
  const impersonate = async (tenantId) => {
    try {
      const response = await superAdminAPI.impersonateTenant(tenantId);
      const { token, user: tenantUser, tenant: tenantData } = response.data.data;

      // Save current super admin session so we can restore it
      localStorage.setItem('superadmin_token', localStorage.getItem('token'));
      localStorage.setItem('superadmin_user', localStorage.getItem('user'));
      localStorage.setItem('impersonating', '1');
      localStorage.setItem('impersonated_name', tenantData.businessName || tenantData.business_name || '');

      // Switch to tenant session
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(tenantUser));
      localStorage.setItem('tenant', JSON.stringify(tenantData));

      setUser(tenantUser);
      setTenant(tenantData);
      setIsImpersonating(true);
      setImpersonatedTenantName(tenantData.businessName || tenantData.business_name || '');

      toast.success(`Now viewing as: ${tenantData.businessName || tenantData.business_name}`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to impersonate tenant';
      toast.error(message);
      return { success: false };
    }
  };

  /**
   * Super admin: return to own session
   */
  const stopImpersonating = () => {
    const saToken = localStorage.getItem('superadmin_token');
    const saUser = localStorage.getItem('superadmin_user');

    if (!saToken || !saUser) {
      logout();
      return;
    }

    localStorage.setItem('token', saToken);
    localStorage.setItem('user', saUser);
    localStorage.removeItem('tenant');
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin_user');
    localStorage.removeItem('impersonating');
    localStorage.removeItem('impersonated_name');

    setUser(JSON.parse(saUser));
    setTenant(null);
    setIsImpersonating(false);
    setImpersonatedTenantName('');

    toast.success('Returned to Super Admin session');
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updateTenant = (tenantData) => {
    setTenant(tenantData);
    localStorage.setItem('tenant', JSON.stringify(tenantData));
  };

  // Computed value for authentication status
  const isAuthenticated = !!user && !!localStorage.getItem('token');

  const value = {
    user,
    tenant,
    loading,
    isAuthenticated,
    isImpersonating,
    impersonatedTenantName,
    login,
    register,
    logout,
    updateUser,
    updateTenant,
    impersonate,
    stopImpersonating
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
