import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

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
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      const savedTenant = localStorage.getItem('tenant');

      if (token && savedUser) {
        try {
          // Restore saved user and tenant from localStorage
          setUser(JSON.parse(savedUser));
          if (savedTenant) setTenant(JSON.parse(savedTenant));

          // Fetch fresh profile data
          const response = await authAPI.getProfile();
          if (response.data?.data?.user) {
            setUser(response.data.data.user);
          }
          if (response.data?.data?.subscription) {
            setTenant(response.data.data.subscription);
            localStorage.setItem('tenant', JSON.stringify(response.data.data.subscription));
          }
        } catch (error) {
          console.error('Auth check failed, keeping existing user:', error);
          // Do NOT logout here to avoid infinite refresh
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { token, user: userData, tenant: tenantData } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (tenantData) {
      localStorage.setItem('tenant', JSON.stringify(tenantData));
      setTenant(tenantData);
    }

    setUser(userData);
    return userData;
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    const { token, user: userData, tenant: tenantData } = response.data.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    if (tenantData) {
      localStorage.setItem('tenant', JSON.stringify(tenantData));
      setTenant(tenantData);
    }

    setUser(userData);
    return userData;
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

  const value = {
    user,
    tenant,
    loading,
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
