import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Layout from './components/layout/Layout';

// Pages
import WelcomePage from './pages/WelcomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import POSPage from './pages/POSPage';
import ProductsPage from './pages/ProductsPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import SuppliersPage from './pages/SuppliersPage';
import CustomersPage from './pages/CustomersPage';
import ExpensesPage from './pages/ExpensesPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

// Super Admin Route wrapper
const SuperAdminRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      {children}
    </ProtectedRoute>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationsProvider>
          <Toaster position="top-right" />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<WelcomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Super Admin Routes */}
            <Route path="/super-admin" element={
              <SuperAdminRoute>
                <Layout><SuperAdminDashboard /></Layout>
              </SuperAdminRoute>
            } />

            {/* Subscription Page (accessible even if expired) */}
            <Route path="/subscription" element={
              <ProtectedRoute>
                <Layout><SubscriptionPage /></Layout>
              </ProtectedRoute>
            } />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/pos" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                <Layout><POSPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/products" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'storekeeper']}>
                <Layout><ProductsPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/sales" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                <Layout><SalesPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/purchases" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'storekeeper']}>
                <Layout><PurchasesPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/suppliers" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'storekeeper']}>
                <Layout><SuppliersPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/customers" element={
              <ProtectedRoute allowedRoles={['admin', 'manager', 'cashier']}>
                <Layout><CustomersPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/expenses" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Layout><ExpensesPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/reports" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Layout><ReportsPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/users" element={
              <ProtectedRoute allowedRoles={['admin', 'manager']}>
                <Layout><UsersPage /></Layout>
              </ProtectedRoute>
            } />

            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout><SettingsPage /></Layout>
              </ProtectedRoute>
            } />

            {/* Redirect based on role */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </NotificationsProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
