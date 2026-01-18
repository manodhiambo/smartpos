import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaShoppingCart, FaEnvelope, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../styles/AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    businessEmail: '',
    username: '',
    password: ''
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

    if (!formData.businessEmail) {
      newErrors.businessEmail = 'Business email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.businessEmail)) {
      newErrors.businessEmail = 'Please enter a valid email';
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    const result = await login(formData);
    setLoading(false);

    if (result.success) {
      // Redirect based on user role
      if (result.user.isSuperAdmin || result.user.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/dashboard');
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <div className="auth-left-content">
            <div className="auth-logo">
              <FaShoppingCart />
              <span>SmartPOS</span>
            </div>
            <h1 className="auth-left-title">Welcome Back!</h1>
            <p className="auth-left-description">
              Sign in to your SmartPOS account and continue managing your supermarket efficiently.
            </p>
            <div className="auth-features">
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Fast & Secure</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Real-time Analytics</span>
              </div>
              <div className="auth-feature-item">
                <div className="feature-check">✓</div>
                <span>Multi-user Support</span>
              </div>
            </div>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-form-container">
            <h2 className="auth-title">Sign In</h2>
            <p className="auth-subtitle">Enter your credentials to access your account</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label htmlFor="businessEmail">Business Email</label>
                <div className="input-with-icon">
                  <FaEnvelope className="input-icon" />
                  <input
                    type="email"
                    id="businessEmail"
                    name="businessEmail"
                    placeholder="your-business@example.com"
                    value={formData.businessEmail}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                {errors.businessEmail && <span className="input-error">{errors.businessEmail}</span>}
              </div>

              <div className="input-group">
                <label htmlFor="username">Username</label>
                <div className="input-with-icon">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    id="username"
                    name="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                  />
                </div>
                {errors.username && <span className="input-error">{errors.username}</span>}
              </div>

              <div className="input-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <FaLock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {errors.password && <span className="input-error">{errors.password}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="auth-footer">
              Don't have an account? <Link to="/register">Register here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
