import React, { useState, useEffect } from 'react';
import { tenantAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FaSave, FaStore, FaMobileAlt, FaUser, FaKey, FaShieldAlt,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaExternalLinkAlt,
  FaEye, FaEyeSlash, FaInfoCircle, FaWifi
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import '../styles/Settings.css';

const PLACEHOLDER = '••••••••';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('business');

  // Business
  const [businessData, setBusinessData] = useState({
    businessName: '', businessEmail: '', businessPhone: '', businessAddress: ''
  });

  // M-Pesa display (till/paybill)
  const [mpesaData, setMpesaData] = useState({
    mpesaTillNumber: '', mpesaPaybill: '', mpesaAccountNumber: ''
  });

  // Daraja API
  const [darajaData, setDarajaData] = useState({
    consumerKey: '',
    consumerSecret: '',
    passkey: '',
    environment: 'sandbox'
  });
  const [darajaSecretSet, setDarajaSecretSet] = useState(false);
  const [darajaPasskeySet, setDarajaPasskeySet] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | { success, message }
  const [testLoading, setTestLoading] = useState(false);

  // Profile
  const [profileData, setProfileData] = useState({
    fullName: '', email: '',
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  useEffect(() => {
    fetchTenantInfo();
    loadUserProfile();
  }, []);

  const fetchTenantInfo = async () => {
    try {
      const response = await tenantAPI.getInfo();
      const t = response.data.data;
      setBusinessData({
        businessName: t.businessName || '',
        businessEmail: t.businessEmail || '',
        businessPhone: t.businessPhone || '',
        businessAddress: t.businessAddress || ''
      });
      setMpesaData({
        mpesaTillNumber: t.mpesaTillNumber || '',
        mpesaPaybill: t.mpesaPaybill || '',
        mpesaAccountNumber: t.mpesaAccountNumber || ''
      });
      setDarajaData({
        consumerKey: t.darajaConsumerKey || '',
        consumerSecret: t.darajaConsumerSecretSet ? PLACEHOLDER : '',
        passkey: t.darajaPasskeySet ? PLACEHOLDER : '',
        environment: t.darajaEnvironment || 'sandbox'
      });
      setDarajaSecretSet(!!t.darajaConsumerSecretSet);
      setDarajaPasskeySet(!!t.darajaPasskeySet);
    } catch (error) {
      console.error('Failed to load tenant info');
    }
  };

  const loadUserProfile = () => {
    setProfileData(prev => ({ ...prev, fullName: user.fullName || '', email: user.email || '' }));
  };

  const handleBusinessSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await tenantAPI.updateInfo(businessData);
      toast.success('Business settings saved');
    } catch {
      toast.error('Failed to save business settings');
    } finally { setLoading(false); }
  };

  const handleMpesaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await tenantAPI.updateMpesaSettings(mpesaData);
      toast.success('M-Pesa payment details saved');
    } catch {
      toast.error('Failed to save M-Pesa settings');
    } finally { setLoading(false); }
  };

  const handleDarajaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);
    try {
      const response = await tenantAPI.updateDarajaSettings(darajaData);
      const d = response.data.data;
      setDarajaSecretSet(d.darajaConsumerSecretSet);
      setDarajaPasskeySet(d.darajaPasskeySet);
      // Re-mask if saved
      setDarajaData(prev => ({
        ...prev,
        consumerSecret: d.darajaConsumerSecretSet ? PLACEHOLDER : '',
        passkey: d.darajaPasskeySet ? PLACEHOLDER : ''
      }));
      toast.success('Daraja API credentials saved');
    } catch {
      toast.error('Failed to save Daraja settings');
    } finally { setLoading(false); }
  };

  const handleTestDaraja = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const response = await tenantAPI.testDarajaConnection();
      setTestResult({ success: true, message: response.data.message });
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || 'Connection failed'
      });
    } finally { setTestLoading(false); }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (profileData.newPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        toast.error('Passwords do not match'); return;
      }
      if (profileData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters'); return;
      }
      if (!profileData.currentPassword) {
        toast.error('Current password is required'); return;
      }
    }
    setLoading(true);
    try {
      const updateData = { fullName: profileData.fullName, email: profileData.email };
      if (profileData.newPassword) {
        updateData.currentPassword = profileData.currentPassword;
        updateData.newPassword = profileData.newPassword;
      }
      const response = await authAPI.updateProfile(updateData);
      updateUser(response.data.data);
      toast.success('Profile updated');
      setProfileData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally { setLoading(false); }
  };

  const darajaConfigured = darajaData.consumerKey && darajaSecretSet && darajaPasskeySet;
  const darajaSandbox = darajaData.environment === 'sandbox';

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Configure your system</p>
        </div>
      </div>

      <div className="settings-tabs">
        <button className={`tab-btn ${activeTab === 'business' ? 'active' : ''}`} onClick={() => setActiveTab('business')}>
          <FaStore /> Business
        </button>
        <button className={`tab-btn ${activeTab === 'mpesa' ? 'active' : ''}`} onClick={() => setActiveTab('mpesa')}>
          <FaMobileAlt /> M-Pesa Payments
        </button>
        <button className={`tab-btn ${activeTab === 'daraja' ? 'active' : ''}`} onClick={() => setActiveTab('daraja')}>
          <FaShieldAlt /> Daraja API
          {darajaConfigured && (
            <span className={`daraja-badge ${darajaSandbox ? 'sandbox' : 'live'}`}>
              {darajaSandbox ? 'Sandbox' : 'Live'}
            </span>
          )}
        </button>
        <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          <FaUser /> My Profile
        </button>
      </div>

      <div className="settings-content">

        {/* ── Business Settings ── */}
        {activeTab === 'business' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Business Information</h2>
              <p>Your business details shown on receipts and communications</p>
            </div>
            <form onSubmit={handleBusinessSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Business Name *</label>
                  <input type="text" value={businessData.businessName}
                    onChange={(e) => setBusinessData(p => ({ ...p, businessName: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label>Business Email *</label>
                  <input type="email" value={businessData.businessEmail}
                    onChange={(e) => setBusinessData(p => ({ ...p, businessEmail: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label>Business Phone</label>
                  <input type="tel" value={businessData.businessPhone}
                    onChange={(e) => setBusinessData(p => ({ ...p, businessPhone: e.target.value }))}
                    placeholder="+254712345678" />
                </div>
              </div>
              <div className="input-group">
                <label>Business Address</label>
                <textarea value={businessData.businessAddress}
                  onChange={(e) => setBusinessData(p => ({ ...p, businessAddress: e.target.value }))} rows="3" />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FaSave /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}

        {/* ── M-Pesa Payment Display ── */}
        {activeTab === 'mpesa' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>M-Pesa Payment Details</h2>
              <p>Your business M-Pesa numbers shown to customers at checkout</p>
            </div>

            <div className="alert alert-info" style={{ marginBottom: 24 }}>
              <FaInfoCircle style={{ marginRight: 8 }} />
              These numbers are <strong>displayed to customers</strong> so they can pay manually.
              For automatic STK Push (prompting customers), configure your <strong>Daraja API</strong> in the next tab.
            </div>

            <form onSubmit={handleMpesaSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Till Number (Buy Goods)</label>
                  <input type="text" value={mpesaData.mpesaTillNumber}
                    onChange={(e) => setMpesaData(p => ({ ...p, mpesaTillNumber: e.target.value }))}
                    placeholder="e.g. 123456" />
                  <small>Used for Lipa Na M-Pesa Buy Goods</small>
                </div>
                <div className="input-group">
                  <label>Paybill Number</label>
                  <input type="text" value={mpesaData.mpesaPaybill}
                    onChange={(e) => setMpesaData(p => ({ ...p, mpesaPaybill: e.target.value }))}
                    placeholder="e.g. 654321" />
                  <small>Used for Lipa Na M-Pesa Paybill</small>
                </div>
                <div className="input-group">
                  <label>Account Number</label>
                  <input type="text" value={mpesaData.mpesaAccountNumber}
                    onChange={(e) => setMpesaData(p => ({ ...p, mpesaAccountNumber: e.target.value }))}
                    placeholder="e.g. Store001" />
                  <small>Account reference for Paybill payments</small>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <FaSave /> {loading ? 'Saving...' : 'Save Payment Details'}
              </button>
            </form>
          </div>
        )}

        {/* ── Daraja API ── */}
        {activeTab === 'daraja' && (
          <div className="settings-section">
            <div className="section-header">
              <h2>Daraja API — M-Pesa STK Push</h2>
              <p>Connect your Safaricom Daraja account to enable automatic payment prompts sent to customers' phones</p>
            </div>

            {/* How-to guide */}
            <div className="daraja-guide">
              <h3><FaInfoCircle /> How to get your Daraja credentials</h3>
              <ol className="daraja-steps">
                <li>
                  <span className="step-num">1</span>
                  <div>
                    <strong>Create a Daraja account</strong>
                    <p>Go to <a href="https://developer.safaricom.co.ke" target="_blank" rel="noreferrer">
                      developer.safaricom.co.ke <FaExternalLinkAlt style={{ fontSize: 10 }} />
                    </a> and sign up or log in.</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">2</span>
                  <div>
                    <strong>Create an App</strong>
                    <p>Under "My Apps", create a new app and select the <em>Lipa Na M-Pesa</em> product. Copy the <strong>Consumer Key</strong> and <strong>Consumer Secret</strong>.</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">3</span>
                  <div>
                    <strong>Get your Passkey</strong>
                    <p>In sandbox, the test passkey is provided on the portal. In production, Safaricom sends it to you when your app is approved for Go-Live.</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">4</span>
                  <div>
                    <strong>Set your Shortcode</strong>
                    <p>Your shortcode is the same as your Paybill or Till Number above. Make sure it matches the app you created on Daraja.</p>
                  </div>
                </li>
                <li>
                  <span className="step-num">5</span>
                  <div>
                    <strong>Go Live</strong>
                    <p>Start with <em>Sandbox</em> for testing. Once ready, apply for Go-Live on the Daraja portal and switch environment to <em>Production</em> here.</p>
                  </div>
                </li>
              </ol>

              <div className="daraja-sandbox-note">
                <strong>Sandbox test credentials:</strong><br />
                Shortcode: <code>174379</code> &nbsp;|&nbsp;
                Passkey: <code>bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919</code><br />
                <small>Use your own sandbox Consumer Key/Secret from your Daraja app.</small>
              </div>
            </div>

            {/* Status badge */}
            <div className="daraja-status-row">
              <div className={`daraja-status-badge ${darajaConfigured ? (darajaSandbox ? 'sandbox' : 'live') : 'unconfigured'}`}>
                {darajaConfigured ? (
                  darajaSandbox
                    ? <><FaWifi /> Sandbox — STK Push active (test mode)</>
                    : <><FaCheckCircle /> Production — STK Push active</>
                ) : (
                  <><FaTimesCircle /> Not configured — STK Push disabled</>
                )}
              </div>
              {darajaConfigured && (
                <button
                  className={`btn-test-daraja ${testLoading ? 'testing' : ''} ${testResult ? (testResult.success ? 'success' : 'fail') : ''}`}
                  onClick={handleTestDaraja}
                  disabled={testLoading}
                  type="button"
                >
                  {testLoading ? <><FaSpinner className="spin" /> Testing...</> : <><FaWifi /> Test Connection</>}
                </button>
              )}
            </div>

            {testResult && (
              <div className={`daraja-test-result ${testResult.success ? 'success' : 'fail'}`}>
                {testResult.success ? <FaCheckCircle /> : <FaTimesCircle />}
                {testResult.message}
              </div>
            )}

            {/* Credentials form */}
            <form onSubmit={handleDarajaSubmit} style={{ marginTop: 24 }}>
              <div className="daraja-env-toggle">
                <label className="env-label">Environment</label>
                <div className="env-options">
                  <label className={`env-option ${darajaData.environment === 'sandbox' ? 'active' : ''}`}>
                    <input type="radio" name="environment" value="sandbox"
                      checked={darajaData.environment === 'sandbox'}
                      onChange={() => setDarajaData(p => ({ ...p, environment: 'sandbox' }))} />
                    Sandbox (Testing)
                  </label>
                  <label className={`env-option production ${darajaData.environment === 'production' ? 'active' : ''}`}>
                    <input type="radio" name="environment" value="production"
                      checked={darajaData.environment === 'production'}
                      onChange={() => setDarajaData(p => ({ ...p, environment: 'production' }))} />
                    Production (Live)
                  </label>
                </div>
                {darajaData.environment === 'production' && (
                  <div className="alert alert-warning" style={{ marginTop: 8 }}>
                    Production mode will send real STK push prompts and deduct actual money. Ensure your credentials are correct.
                  </div>
                )}
              </div>

              <div className="form-grid" style={{ marginTop: 20 }}>
                <div className="input-group">
                  <label>Consumer Key *</label>
                  <input
                    type="text"
                    value={darajaData.consumerKey}
                    onChange={(e) => setDarajaData(p => ({ ...p, consumerKey: e.target.value }))}
                    placeholder="Paste your Consumer Key"
                    autoComplete="off"
                  />
                  <small>Found in your Daraja app under "Keys & Tokens"</small>
                </div>

                <div className="input-group">
                  <label>
                    Consumer Secret *
                    {darajaSecretSet && <span className="field-set-badge">set</span>}
                  </label>
                  <div className="secret-input-row">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={darajaData.consumerSecret}
                      onChange={(e) => setDarajaData(p => ({ ...p, consumerSecret: e.target.value }))}
                      onFocus={() => {
                        if (darajaData.consumerSecret === PLACEHOLDER) {
                          setDarajaData(p => ({ ...p, consumerSecret: '' }));
                        }
                      }}
                      placeholder={darajaSecretSet ? 'Leave blank to keep existing' : 'Paste your Consumer Secret'}
                      autoComplete="new-password"
                    />
                    <button type="button" className="show-hide-btn" onClick={() => setShowSecret(v => !v)}>
                      {showSecret ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <small>Keep secret — do not share. Leave blank to keep current value.</small>
                </div>

                <div className="input-group">
                  <label>
                    Lipa Na M-Pesa Passkey *
                    {darajaPasskeySet && <span className="field-set-badge">set</span>}
                  </label>
                  <div className="secret-input-row">
                    <input
                      type={showPasskey ? 'text' : 'password'}
                      value={darajaData.passkey}
                      onChange={(e) => setDarajaData(p => ({ ...p, passkey: e.target.value }))}
                      onFocus={() => {
                        if (darajaData.passkey === PLACEHOLDER) {
                          setDarajaData(p => ({ ...p, passkey: '' }));
                        }
                      }}
                      placeholder={darajaPasskeySet ? 'Leave blank to keep existing' : 'Paste your Passkey'}
                      autoComplete="new-password"
                    />
                    <button type="button" className="show-hide-btn" onClick={() => setShowPasskey(v => !v)}>
                      {showPasskey ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <small>Provided by Safaricom in your Daraja portal. Leave blank to keep current value.</small>
                </div>

                <div className="input-group">
                  <label>Shortcode</label>
                  <input
                    type="text"
                    value={mpesaData.mpesaPaybill || mpesaData.mpesaTillNumber}
                    disabled
                    style={{ background: 'var(--light-color)', color: 'var(--text-secondary)' }}
                  />
                  <small>Auto-filled from your M-Pesa payment details above. Change it there if needed.</small>
                </div>
              </div>

              <div className="daraja-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <FaSave /> {loading ? 'Saving...' : 'Save Daraja Credentials'}
                </button>
                {darajaConfigured && (
                  <button type="button" className="btn btn-outline" onClick={handleTestDaraja} disabled={testLoading}>
                    {testLoading ? <><FaSpinner className="spin" /> Testing...</> : <><FaWifi /> Test Connection</>}
                  </button>
                )}
              </div>

              <div className="daraja-security-note">
                <FaShieldAlt />
                <span>Your credentials are stored securely and never exposed in API responses. Only the Consumer Key is visible after saving.</span>
              </div>
            </form>
          </div>
        )}

        {/* ── Profile ── */}
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
                  <input type="text" value={user.username} disabled />
                  <small>Username cannot be changed</small>
                </div>
                <div className="input-group">
                  <label>Role</label>
                  <input type="text" value={user.role} disabled style={{ textTransform: 'capitalize' }} />
                </div>
                <div className="input-group">
                  <label>Full Name *</label>
                  <input type="text" value={profileData.fullName}
                    onChange={(e) => setProfileData(p => ({ ...p, fullName: e.target.value }))} required />
                </div>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" value={profileData.email}
                    onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))} />
                </div>
              </div>

              <div className="password-section">
                <h3><FaKey /> Change Password</h3>
                <p className="section-description">Leave blank to keep current password</p>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Current Password</label>
                    <input type="password" value={profileData.currentPassword}
                      onChange={(e) => setProfileData(p => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Enter current password" />
                  </div>
                  <div className="input-group">
                    <label>New Password</label>
                    <input type="password" value={profileData.newPassword}
                      onChange={(e) => setProfileData(p => ({ ...p, newPassword: e.target.value }))}
                      placeholder="Enter new password" minLength="8" />
                  </div>
                  <div className="input-group">
                    <label>Confirm New Password</label>
                    <input type="password" value={profileData.confirmPassword}
                      onChange={(e) => setProfileData(p => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="Confirm new password" />
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
