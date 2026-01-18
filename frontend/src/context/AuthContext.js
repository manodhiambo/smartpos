import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
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
    setUser(null);
    setTenant(null);
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
    isAuthenticated, // Add this
    login,
    register,
    logout,
    updateUser,
    updateTenant
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
