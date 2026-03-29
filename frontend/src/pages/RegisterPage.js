import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FaShoppingCart, FaStore, FaEnvelope, FaPhone,
  FaMapMarkerAlt, FaUser, FaLock, FaEye, FaEyeSlash,
  FaChevronRight, FaChevronLeft
} from 'react-icons/fa';
import '../styles/AuthPages.css';

const STEPS = ['Account', 'Business', 'M-Pesa'];

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    adminUsername: '',
    adminPassword: '',
    adminFullName: '',
    businessEmail: '',
    businessName: '',
    businessPhone: '',
    businessAddress: '',
    mpesaTillNumber: '',
    mpesaPaybill: '',
    mpesaAccountNumber: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateStep = (s) => {
    const newErrors = {};
    if (s === 0) {
      if (!formData.adminFullName.trim()) newErrors.adminFullName = 'Full name is required';
      if (!formData.adminUsername.trim()) newErrors.adminUsername = 'Username is required';
      else if (formData.adminUsername.length < 3) newErrors.adminUsername = 'At least 3 characters';
      if (!formData.adminPassword) newErrors.adminPassword = 'Password is required';
      else if (formData.adminPassword.length < 8) newErrors.adminPassword = 'At least 8 characters';
      else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.adminPassword))
        newErrors.adminPassword = 'Must include uppercase, lowercase, number & special character';
    }
    if (s === 1) {
      if (!formData.businessName.trim()) newErrors.businessName = 'Business name is required';
      if (!formData.businessEmail.trim()) newErrors.businessEmail = 'Business email is required';
      else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) newErrors.businessEmail = 'Invalid email';
      if (!formData.businessPhone.trim()) newErrors.businessPhone = 'Phone is required';
      else if (!/^(\+254|0)[17]\d{8}$/.test(formData.businessPhone)) newErrors.businessPhone = 'Invalid Kenyan phone number';
      if (!formData.businessAddress.trim()) newErrors.businessAddress = 'Address is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(s => s + 1);
  };

  const prevStep = () => {
    setErrors({});
    setStep(s => s - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(step)) return;

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (result.success) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-container">

        {/* Left Panel */}
        <div className="auth-left">
          <div className="auth-left-content">
            <div className="auth-logo">
              <FaShoppingCart />
              <span>SmartPOS</span>
            </div>
            <h1 className="auth-left-title">Start Your Free Trial</h1>
            <p className="auth-left-description">
              Get your supermarket running in minutes. 5-day free trial — no credit card needed.
            </p>
            <div className="auth-features">
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>5-day free trial</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Setup fee: KSh 70,000</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Annual renewal: KSh 20,000</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>M-Pesa customer payments</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Full POS & inventory system</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="auth-right">
          <div className="auth-form-container">
            <h2 className="auth-title">Create Account</h2>
            <p className="auth-subtitle">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>

            {/* Step indicators */}
            <div className="reg-steps">
              {STEPS.map((label, i) => (
                <div key={label} className={`reg-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
                  <div className="reg-step-dot">{i < step ? '✓' : i + 1}</div>
                  <span className="reg-step-label">{label}</span>
                </div>
              ))}
            </div>

            <form onSubmit={step < STEPS.length - 1 ? (e) => { e.preventDefault(); nextStep(); } : handleSubmit} className="auth-form">

              {/* Step 0 — Login Credentials */}
              {step === 0 && (
                <>
                  <div className="input-group">
                    <label htmlFor="adminFullName">Full Name *</label>
                    <div className="input-with-icon">
                      <FaUser className="input-icon" />
                      <input
                        type="text"
                        id="adminFullName"
                        name="adminFullName"
                        placeholder="John Doe"
                        value={formData.adminFullName}
                        onChange={handleChange}
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    {errors.adminFullName && <span className="input-error">{errors.adminFullName}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="adminUsername">Username *</label>
                    <div className="input-with-icon">
                      <FaUser className="input-icon" />
                      <input
                        type="text"
                        id="adminUsername"
                        name="adminUsername"
                        placeholder="e.g. admin"
                        value={formData.adminUsername}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    {errors.adminUsername && <span className="input-error">{errors.adminUsername}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="adminPassword">Password *</label>
                    <div className="input-with-icon">
                      <FaLock className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="adminPassword"
                        name="adminPassword"
                        placeholder="Strong password"
                        value={formData.adminPassword}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      <button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)}>
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                    {errors.adminPassword && <span className="input-error">{errors.adminPassword}</span>}
                  </div>

                  <div className="signin-info-box">
                    You will sign in with your <strong>Business Email</strong> + <strong>Username</strong> + <strong>Password</strong>
                  </div>
                </>
              )}

              {/* Step 1 — Business Info */}
              {step === 1 && (
                <>
                  <div className="input-group">
                    <label htmlFor="businessEmail">Business Email *</label>
                    <div className="input-with-icon">
                      <FaEnvelope className="input-icon" />
                      <input
                        type="email"
                        id="businessEmail"
                        name="businessEmail"
                        placeholder="business@example.com"
                        value={formData.businessEmail}
                        onChange={handleChange}
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                    {errors.businessEmail && <span className="input-error">{errors.businessEmail}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="businessName">Business Name *</label>
                    <div className="input-with-icon">
                      <FaStore className="input-icon" />
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        placeholder="e.g. Nairobi Supermarket"
                        value={formData.businessName}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    {errors.businessName && <span className="input-error">{errors.businessName}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="businessPhone">Business Phone *</label>
                    <div className="input-with-icon">
                      <FaPhone className="input-icon" />
                      <input
                        type="tel"
                        id="businessPhone"
                        name="businessPhone"
                        placeholder="+254712345678"
                        value={formData.businessPhone}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    {errors.businessPhone && <span className="input-error">{errors.businessPhone}</span>}
                  </div>

                  <div className="input-group">
                    <label htmlFor="businessAddress">Business Address *</label>
                    <div className="input-with-icon">
                      <FaMapMarkerAlt className="input-icon" />
                      <input
                        type="text"
                        id="businessAddress"
                        name="businessAddress"
                        placeholder="e.g. Moi Avenue, Nairobi"
                        value={formData.businessAddress}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                    {errors.businessAddress && <span className="input-error">{errors.businessAddress}</span>}
                  </div>
                </>
              )}

              {/* Step 2 — M-Pesa (optional) */}
              {step === 2 && (
                <>
                  <p className="auth-subtitle" style={{ marginTop: 0, marginBottom: 24 }}>
                    Configure how your customers pay via M-Pesa at checkout. You can skip this and add it later in Settings.
                  </p>

                  <div className="input-group">
                    <label htmlFor="mpesaTillNumber">Till Number</label>
                    <div className="input-with-icon">
                      <FaStore className="input-icon" />
                      <input
                        type="text"
                        id="mpesaTillNumber"
                        name="mpesaTillNumber"
                        placeholder="e.g. 123456"
                        value={formData.mpesaTillNumber}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="mpesaPaybill">Paybill Number</label>
                    <div className="input-with-icon">
                      <FaStore className="input-icon" />
                      <input
                        type="text"
                        id="mpesaPaybill"
                        name="mpesaPaybill"
                        placeholder="e.g. 654321"
                        value={formData.mpesaPaybill}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="mpesaAccountNumber">Account Number</label>
                    <div className="input-with-icon">
                      <FaStore className="input-icon" />
                      <input
                        type="text"
                        id="mpesaAccountNumber"
                        name="mpesaAccountNumber"
                        placeholder="e.g. MyStore123"
                        value={formData.mpesaAccountNumber}
                        onChange={handleChange}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="pricing-banner">
                    After your 5-day trial, a setup fee of <strong>KSh 70,000</strong> applies, then <strong>KSh 20,000/year</strong> to renew.
                  </div>
                </>
              )}

              {/* Navigation buttons */}
              <div className="reg-nav">
                {step > 0 && (
                  <button type="button" className="btn btn-outline reg-back-btn" onClick={prevStep} disabled={loading}>
                    <FaChevronLeft /> Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button type="submit" className="btn btn-primary reg-next-btn" disabled={loading}>
                    Next <FaChevronRight />
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary reg-next-btn" disabled={loading}>
                    {loading ? <><div className="spinner-small"></div> Creating...</> : 'Create Account'}
                  </button>
                )}
              </div>
            </form>

            <p className="auth-footer">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RegisterPage;
