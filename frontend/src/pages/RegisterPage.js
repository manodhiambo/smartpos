import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShoppingCart, FaStore, FaEnvelope, FaPhone, FaMapMarkerAlt, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/AuthPages.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessEmail: '',
    businessPhone: '',
    businessAddress: '',
    adminUsername: '',
    adminPassword: '',
    adminFullName: '',
    mpesaTillNumber: '',
    mpesaPaybill: '',
    mpesaAccountNumber: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Business Information
    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessEmail.trim()) {
      newErrors.businessEmail = 'Business email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) {
      newErrors.businessEmail = 'Invalid email format';
    }

    if (!formData.businessPhone.trim()) {
      newErrors.businessPhone = 'Business phone is required';
    } else if (!/^(\+254|0)[17]\d{8}$/.test(formData.businessPhone)) {
      newErrors.businessPhone = 'Invalid Kenyan phone number';
    }

    if (!formData.businessAddress.trim()) {
      newErrors.businessAddress = 'Business address is required';
    }

    // Admin Information
    if (!formData.adminUsername.trim()) {
      newErrors.adminUsername = 'Admin username is required';
    } else if (formData.adminUsername.length < 3) {
      newErrors.adminUsername = 'Username must be at least 3 characters';
    }

    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password is required';
    } else if (formData.adminPassword.length < 8) {
      newErrors.adminPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.adminPassword)) {
      newErrors.adminPassword = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (!formData.adminFullName.trim()) {
      newErrors.adminFullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container register-container">
        <div className="auth-left">
          <div className="auth-left-content">
            <div className="auth-logo">
              <FaShoppingCart />
              <span>SmartPOS</span>
            </div>
            <h1 className="auth-left-title">Start Your Free Trial</h1>
            <p className="auth-left-description">
              Join hundreds of supermarkets using SmartPOS to streamline their operations.
            </p>
            <div className="auth-features">
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>30-day free trial</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>No credit card required</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Setup in 5 minutes</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>24/7 support</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <h2 className="auth-form-title">Create Your Account</h2>
            <p className="auth-form-subtitle">Fill in your details to get started</p>

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Business Information */}
              <div className="form-section">
                <h3 className="form-section-title">Business Information</h3>
                
                <div className="input-group">
                  <label htmlFor="businessName">Business Name *</label>
                  <div className="input-with-icon">
                    <FaStore className="input-icon" />
                    <input
                      type="text"
                      id="businessName"
                      name="businessName"
                      placeholder="e.g., Nairobi Supermarket"
                      value={formData.businessName}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  {errors.businessName && <span className="input-error">{errors.businessName}</span>}
                </div>

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
                    />
                  </div>
                  {errors.businessEmail && <span className="input-error">{errors.businessEmail}</span>}
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
                      placeholder="e.g., Moi Avenue, Nairobi"
                      value={formData.businessAddress}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  {errors.businessAddress && <span className="input-error">{errors.businessAddress}</span>}
                </div>
              </div>

              {/* Admin Account */}
              <div className="form-section">
                <h3 className="form-section-title">Admin Account</h3>

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
                      placeholder="admin"
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
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.adminPassword && <span className="input-error">{errors.adminPassword}</span>}
                </div>
              </div>

              {/* M-Pesa Settings (Optional) */}
              <div className="form-section">
                <h3 className="form-section-title">M-Pesa Settings (Optional)</h3>
                <p className="form-section-description">You can add this later in settings</p>

                <div className="input-group">
                  <label htmlFor="mpesaTillNumber">Till Number</label>
                  <input
                    type="text"
                    id="mpesaTillNumber"
                    name="mpesaTillNumber"
                    placeholder="e.g., 123456"
                    value={formData.mpesaTillNumber}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="mpesaPaybill">Paybill Number</label>
                  <input
                    type="text"
                    id="mpesaPaybill"
                    name="mpesaPaybill"
                    placeholder="e.g., 654321"
                    value={formData.mpesaPaybill}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="mpesaAccountNumber">Account Number</label>
                  <input
                    type="text"
                    id="mpesaAccountNumber"
                    name="mpesaAccountNumber"
                    placeholder="e.g., MyStore123"
                    value={formData.mpesaAccountNumber}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner-small"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            <div className="auth-divider">
              <span>Already have an account?</span>
            </div>

            <Link to="/login" className="btn btn-outline btn-block">
              Sign In
            </Link>

            <div className="auth-footer-links">
              <Link to="/" className="auth-link">← Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
