import React, { useState, useEffect, useRef } from 'react';
import { productsAPI, salesAPI, customersAPI } from '../services/api';
import { FaBarcode, FaSearch, FaShoppingCart, FaTrash, FaPlus, FaMinus, FaUser, FaCashRegister } from 'react-icons/fa';
import { formatCurrency, calculateVAT } from '../utils/helpers';
import toast from 'react-hot-toast';
import '../styles/POS.css';

const POSPage = () => {
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    // Focus on barcode input on mount
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProducts();
    } else if (searchTerm.length === 0) {
      setProducts([]);
    }
  }, [searchTerm]);

  const searchProducts = async () => {
    try {
      const response = await productsAPI.search(searchTerm);
      setProducts(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      const response = await productsAPI.getByBarcode(barcode.trim());
      const product = response.data.data;
      addToCart(product);
      setBarcode('');
      barcodeInputRef.current?.focus();
    } catch (error) {
      toast.error('Product not found');
      setBarcode('');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      // Check stock
      if (existingItem.quantity + 1 > product.stock_quantity) {
        toast.error('Insufficient stock');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Check stock
      if (product.stock_quantity < 1) {
        toast.error('Product out of stock');
        return;
      }

      const newItem = {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        unitPrice: parseFloat(product.selling_price),
        quantity: 1,
        vatType: product.vat_type,
        maxStock: product.stock_quantity
      };
      setCart([...cart, newItem]);
      toast.success(`${product.name} added to cart`);
    }

    setProducts([]);
    setSearchTerm('');
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.productId === productId) {
        if (newQuantity > item.maxStock) {
          toast.error('Insufficient stock');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setPaymentMethod('cash');
    setAmountPaid('');
    setMpesaCode('');
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalVat = 0;

    cart.forEach(item => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      if (item.vatType === 'vatable') {
        const vatCalc = calculateVAT(itemTotal, true);
        totalVat += vatCalc.vatAmount;
      }
    });

    const total = subtotal;
    const change = amountPaid ? parseFloat(amountPaid) - total : 0;

    return {
      subtotal,
      totalVat,
      total,
      change: change > 0 ? change : 0
    };
  };

  const totals = calculateTotals();

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (paymentMethod === 'cash' && !amountPaid) {
      toast.error('Please enter amount paid');
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaCode) {
      toast.error('Please enter M-Pesa code');
      return;
    }

    const paid = parseFloat(amountPaid) || totals.total;

    if (paymentMethod === 'cash' && paid < totals.total) {
      toast.error('Insufficient payment');
      return;
    }

    setLoading(true);

    try {
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatType: item.vatType
        })),
        customerId: customer?.id || null,
        discount: 0,
        paymentMethod,
        amountPaid: paid,
        mpesaCode: paymentMethod === 'mpesa' ? mpesaCode : null,
        notes: null
      };

      const response = await salesAPI.create(saleData);
      
      toast.success(`Sale completed! Receipt: ${response.data.data.receipt_no}`);
      
      // Print receipt or show print dialog
      // printReceipt(response.data.data);
      
      clearCart();
      setShowCheckout(false);
      barcodeInputRef.current?.focus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pos-page">
      <div className="pos-header">
        <h1 className="pos-title">Point of Sale</h1>
        <button className="btn btn-outline" onClick={clearCart}>
          <FaTrash /> Clear Cart
        </button>
      </div>

      <div className="pos-container">
        {/* Left Side - Product Search & Cart */}
        <div className="pos-left">
          {/* Barcode Scanner */}
          <div className="pos-section">
            <form onSubmit={handleBarcodeSubmit} className="barcode-form">
              <div className="input-with-icon">
                <FaBarcode className="input-icon" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan barcode or enter manually..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="barcode-input"
                />
              </div>
            </form>
          </div>

          {/* Product Search */}
          <div className="pos-section">
            <div className="input-with-icon">
              <FaSearch className="input-icon" />
              <input
                type="text"
                placeholder="Search products by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Search Results */}
            {products.length > 0 && (
              <div className="search-results">
                {products.map((product) => (
                  <button
                    key={product.id}
                    className="product-result-item"
                    onClick={() => addToCart(product)}
                  >
                    <div className="product-result-info">
                      <span className="product-result-name">{product.name}</span>
                      <span className="product-result-barcode">{product.barcode}</span>
                    </div>
                    <div className="product-result-right">
                      <span className="product-result-price">{formatCurrency(product.selling_price)}</span>
                      <span className="product-result-stock">Stock: {product.stock_quantity}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div className="pos-section cart-section">
            <h3 className="section-title">
              <FaShoppingCart /> Cart ({cart.length} items)
            </h3>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <FaShoppingCart />
                <p>Cart is empty</p>
                <span>Scan or search products to add</span>
              </div>
            ) : (
              <div className="cart-items">
                {cart.map((item, index) => (
                  <div key={index} className="cart-item">
                    <div className="cart-item-info">
                      <span className="cart-item-name">{item.productName}</span>
                      <span className="cart-item-price">{formatCurrency(item.unitPrice)}</span>
                    </div>
                    <div className="cart-item-controls">
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <FaMinus />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                        className="qty-input"
                        min="1"
                        max={item.maxStock}
                      />
                      <button
                        className="qty-btn"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      >
                        <FaPlus />
                      </button>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <FaTrash />
                      </button>
                    </div>
                    <div className="cart-item-total">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Totals & Checkout */}
        <div className="pos-right">
          <div className="pos-section">
            <h3 className="section-title">Order Summary</h3>

            <div className="order-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>VAT (16%):</span>
                <span>{formatCurrency(totals.totalVat)}</span>
              </div>
              <div className="summary-row total-row">
                <span>Total:</span>
                <span className="total-amount">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="customer-section">
              <label>Customer (Optional)</label>
              {customer ? (
                <div className="selected-customer">
                  <FaUser />
                  <span>{customer.name}</span>
                  <button onClick={() => setCustomer(null)}>×</button>
                </div>
              ) : (
                <button className="btn btn-outline btn-block" onClick={() => {}}>
                  <FaUser /> Add Customer
                </button>
              )}
            </div>

            {/* Payment Method */}
            <div className="payment-section">
              <label>Payment Method</label>
              <div className="payment-methods">
                <button
                  className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('cash')}
                >
                  Cash
                </button>
                <button
                  className={`payment-method-btn ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('mpesa')}
                >
                  M-Pesa
                </button>
                <button
                  className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('card')}
                >
                  Card
                </button>
              </div>

              {paymentMethod === 'cash' && (
                <div className="input-group">
                  <label>Amount Paid</label>
                  <input
                    type="number"
                    placeholder="Enter amount"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    step="0.01"
                  />
                  {amountPaid && totals.change > 0 && (
                    <div className="change-display">
                      Change: {formatCurrency(totals.change)}
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'mpesa' && (
                <div className="input-group">
                  <label>M-Pesa Code</label>
                  <input
                    type="text"
                    placeholder="Enter M-Pesa code"
                    value={mpesaCode}
                    onChange={(e) => setMpesaCode(e.target.value)}
                  />
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-block btn-large checkout-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
            >
              {loading ? (
                <>
                  <div className="spinner-small"></div>
                  Processing...
                </>
              ) : (
                <>
                  <FaCashRegister /> Complete Sale
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPage;
