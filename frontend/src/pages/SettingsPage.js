import React, { useState, useEffect } from 'react';
import { tenantAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FaSave, FaStore, FaMobileAlt, FaUser, FaKey } from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../styles/Settings.css';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('business');
  
  // Business Settings
  const [businessData, setBusinessData] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: ''
  });

  // M-Pesa Settings
  const [mpesaData, setMpesaData] = useState({
    mpesaTillNumber: '',
    mpesaPaybill: '',
    mpesaAccountNumber: ''
  });

  // Profile Settings
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchTenantInfo();
    loadUserProfile();
  }, []);

  const fetchTenantInfo = async () => {
    try {
      const response = await tenantAPI.getInfo();
      const tenant = response.data.data;
      setBusinessData({
        businessName: tenant.business_name,
        businessEmail: tenant.business_email,
        businessPhone: tenant.business_phone || '',
        businessAddress: tenant.business_address || ''
      });
      setMpesaData({
        mpesaTillNumber: tenant.mpesa_till_number || '',
        mpesaPaybill: tenant.mpesa_paybill || '',
        mpesaAccountNumber: tenant.mpesa_account_number || ''
      });
    } catch (error) {
      console.error('Failed to load tenant info');
    }
  };

  const loadUserProfile = () => {
    setProfileData(prev => ({
      ...prev,
      fullName: user.fullName || '',
      email: user.email || ''
    }));
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tenantAPI.updateInfo(businessData);
      toast.success('Business settings updated successfully');
    } catch (error) {
      toast.error('Failed to update business settings');
    } finally {
      setLoading(false);
    }
  };

  const handleMpesaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await tenantAPI.updateMpesaSettings(mpesaData);
      toast.success('M-Pesa settings updated successfully');
    } catch (error) {
      toast.error('Failed to update M-Pesa settings');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (profileData.newPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (profileData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters');
        return;
      }
      if (!profileData.currentPassword) {
        toast.error('Current password is required to set new password');
        return;
      }
    }

    setLoading(true);

    try {
      const updateData = {
        fullName: profileData.fullName,
        email: profileData.email
      };

      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }

      const response = await authAPI.updateProfile(updateData);
      updateUser(response.data.data);
      
      toast.success('Profile updated successfully');
      
      // Clear password fields
      setProfileData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your system</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-btn ${activeTab === 'business' ? 'active' : ''}`}
          onClick={() => setActiveTab('business')}
        >
          <FaStore /> Business Settings
        </button>
        <button
          className={`tab-btn ${activeTab === 'mpesa' ? 'active' : ''}`}
          onClick={() => setActiveTab('mpesa')}
        >
          <FaMobileAlt /> M-Pesa Settings
        </button>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser /> My Profile
        </button>
      </div>

      {/* Settings Content */}
      <div className="settings-content">
        {/* Business Settings */}
        {activeTab === 'business' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Business Information</h2>
              <p>Update your business details</p>
            </div>

            <form onSubmit={handleBusinessSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    value={businessData.businessName}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, businessName: e.target.value }))}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Business Email *</label>
                  <input
                    type="email"
                    value={businessData.businessEmail}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, businessEmail: e.target.value }))}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Business Phone</label>
                  <input
                    type="tel"
                    value={businessData.businessPhone}
                    onChange={(e) => setBusinessData(prev => ({ ...prev, businessPhone: e.target.value }))}
                    placeholder="+254712345678"
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Business Address</label>
                <textarea
                  value={businessData.businessAddress}
                  onChange={(e) => setBusinessData(prev => ({ ...prev, businessAddress: e.target.value }))}
                  rows="3"
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* M-Pesa Settings */}
        {activeTab === 'mpesa' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>M-Pesa Integration</h2>
              <p>Configure your M-Pesa payment details</p>
            </div>

            <form onSubmit={handleMpesaSubmit}>
              <div className="alert alert-info">
                <strong>Note:</strong> M-Pesa integration settings for accepting payments. Leave blank if not using M-Pesa.
              </div>

              <div className="form-grid">
                <div className="input-group">
                  <label>Till Number</label>
                  <input
                    type="text"
                    value={mpesaData.mpesaTillNumber}
                    onChange={(e) => setMpesaData(prev => ({ ...prev, mpesaTillNumber: e.target.value }))}
                    placeholder="e.g., 123456"
                  />
                </div>

                <div className="input-group">
                  <label>Paybill Number</label>
                  <input
                    type="text"
                    value={mpesaData.mpesaPaybill}
                    onChange={(e) => setMpesaData(prev => ({ ...prev, mpesaPaybill: e.target.value }))}
                    placeholder="e.g., 654321"
                  />
                </div>

                <div className="input-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    value={mpesaData.mpesaAccountNumber}
                    onChange={(e) => setMpesaData(prev => ({ ...prev, mpesaAccountNumber: e.target.value }))}
                    placeholder="e.g., MyStore123"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FaSave /> {loading ? 'Saving...' : 'Save M-Pesa Settings'}
              </button>
            </form>
          </div>
        )}

        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>My Profile</h2>
              <p>Update your personal information and password</p>
            </div>

            <form onSubmit={handleProfileSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={user.username}
                    disabled
                  />
                  <small>Username cannot be changed</small>
                </div>

                <div className="input-group">
                  <label>Role</label>
                  <input
                    type="text"
                    value={user.role}
                    disabled
                    style={{ textTransform: 'capitalize' }}
                  />
                </div>

                <div className="input-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>

                <div className="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="password-section">
                <h3><FaKey /> Change Password</h3>
                <p className="section-description">Leave blank to keep current password</p>

                <div className="form-grid">
                  <div className="input-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="input-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Enter new password"
                      minLength="8"
                    />
                  </div>

                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FaSave /> {loading ? 'Saving...' : 'Update Profile'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
