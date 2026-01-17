import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShoppingCart, FaChartLine, FaBoxes, FaUsers, FaMobile, FaShieldAlt, FaArrowRight, FaCheckCircle } from 'react-icons/fa';
import '../styles/WelcomePage.css';

const WelcomePage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <FaShoppingCart />,
      title: 'Fast Checkout',
      description: 'Lightning-fast POS system with barcode scanning and multiple payment methods'
    },
    {
      icon: <FaBoxes />,
      title: 'Inventory Management',
      description: 'Real-time stock tracking, low stock alerts, and automatic reordering'
    },
    {
      icon: <FaChartLine />,
      title: 'Sales Analytics',
      description: 'Comprehensive reports and insights to grow your business'
    },
    {
      icon: <FaUsers />,
      title: 'Customer Loyalty',
      description: 'Build lasting relationships with customer loyalty programs'
    },
    {
      icon: <FaMobile />,
      title: 'M-Pesa Integration',
      description: 'Accept M-Pesa payments seamlessly at your store'
    },
    {
      icon: <FaShieldAlt />,
      title: 'Secure & Reliable',
      description: 'Bank-level security with automatic backups and 99.9% uptime'
    }
  ];

  const benefits = [
    'Reduce checkout time by 50%',
    'Never run out of stock',
    'Track every sale in real-time',
    'Multiple stores, one system',
    'Staff management made easy',
    'VAT & KRA compliant'
  ];

  return (
    <div className="welcome-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-text">
            <div className="logo-section">
              <div className="logo-icon">
                <FaShoppingCart />
              </div>
              <h1 className="logo-text">SmartPOS</h1>
            </div>
            <h2 className="hero-title">
              Modern Point of Sale for <span className="highlight">Supermarkets</span>
            </h2>
            <p className="hero-description">
              Transform your supermarket with our powerful, easy-to-use POS system. 
              Manage sales, inventory, and customers all in one place.
            </p>
            <div className="hero-buttons">
              <button className="btn btn-primary btn-large" onClick={() => navigate('/register')}>
                Get Started Free <FaArrowRight />
              </button>
              <button className="btn btn-outline btn-large" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
            <p className="hero-subtext">
              ✨ No credit card required • 30-day free trial • Cancel anytime
            </p>
          </div>
          <div className="hero-image">
            <div className="hero-image-grid">
              <div className="hero-img-card">
                <img src="https://images.unsplash.com/photo-1556740758-90de374c12ad?w=400" alt="Supermarket checkout" />
                <div className="img-card-label">Fast Checkout</div>
              </div>
              <div className="hero-img-card">
                <img src="https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=400" alt="Fresh produce" />
                <div className="img-card-label">Fresh Products</div>
              </div>
              <div className="hero-img-card">
                <img src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400" alt="Shopping baskets" />
                <div className="img-card-label">Happy Customers</div>
              </div>
              <div className="hero-img-card">
                <img src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=400" alt="Store shelves" />
                <div className="img-card-label">Organized Inventory</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Run Your Store</h2>
            <p className="section-subtitle">
              Powerful features designed specifically for supermarkets and grocery stores
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-image">
              <img src="https://images.unsplash.com/photo-1556740714-a8395b3bf30f?w=600" alt="Store management" />
            </div>
            <div className="benefits-text">
              <h2 className="benefits-title">Why Choose SmartPOS?</h2>
              <p className="benefits-description">
                Join hundreds of supermarkets already using SmartPOS to streamline their operations 
                and boost their profits.
              </p>
              <ul className="benefits-list">
                {benefits.map((benefit, index) => (
                  <li key={index} className="benefit-item">
                    <FaCheckCircle className="check-icon" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button className="btn btn-primary btn-large" onClick={() => navigate('/register')}>
                Start Your Free Trial <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">500+</div>
              <div className="stat-label">Active Stores</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Transactions/Month</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-content">
            <h2 className="cta-title">Ready to Transform Your Supermarket?</h2>
            <p className="cta-description">
              Start your free 30-day trial today. No credit card required.
            </p>
            <button className="btn btn-primary btn-large" onClick={() => navigate('/register')}>
              Get Started Now <FaArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="welcome-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <FaShoppingCart />
              <span>SmartPOS</span>
            </div>
            <p className="footer-text">© 2025 SmartPOS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default WelcomePage;
