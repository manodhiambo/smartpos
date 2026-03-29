import React, { useState, useEffect, useRef, useCallback } from 'react';
import { productsAPI, salesAPI, customersAPI } from '../services/api';
import {
  FaBarcode, FaSearch, FaShoppingCart, FaTrash, FaPlus, FaMinus,
  FaUser, FaCashRegister, FaMobileAlt, FaCreditCard, FaMoneyBill,
  FaExchangeAlt, FaSpinner, FaCheckCircle, FaTimesCircle, FaRedo
} from 'react-icons/fa';
import { formatCurrency, calculateVAT } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import '../styles/POS.css';

const POSPage = () => {
  const { tenant } = useAuth();

  // Cart
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);

  // Payment
  const [paymentMode, setPaymentMode] = useState('single'); // 'single' | 'split'
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [mpesaCode, setMpesaCode] = useState('');
  const [mpesaInputMode, setMpesaInputMode] = useState('prompt'); // 'prompt' | 'manual'
  const [customerPhone, setCustomerPhone] = useState('');

  // Split payment
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', mpesa: '', card: '' });
  const [splitMpesaCode, setSplitMpesaCode] = useState('');
  const [splitMpesaInputMode, setSplitMpesaInputMode] = useState('prompt');

  // STK Push state
  const [stkState, setStkState] = useState(null); // null | 'prompting' | 'waiting' | 'confirmed' | 'failed'
  const [stkContext, setStkContext] = useState('single'); // 'single' | 'split'
  const [stkCheckoutId, setStkCheckoutId] = useState(null);
  const [stkCountdown, setStkCountdown] = useState(60);
  const stkPollRef = useRef(null);
  const stkCountdownRef = useRef(null);

  const barcodeInputRef = useRef(null);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchProducts();
    } else if (searchTerm.length === 0) {
      setProducts([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      searchCustomers();
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  // Cleanup STK polling on unmount
  useEffect(() => {
    return () => {
      clearInterval(stkPollRef.current);
      clearInterval(stkCountdownRef.current);
    };
  }, []);

  const searchProducts = async () => {
    try {
      const response = await productsAPI.search(searchTerm);
      setProducts(response.data.data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const searchCustomers = async () => {
    try {
      const response = await customersAPI.search(customerSearch);
      setCustomerResults(response.data.data || []);
    } catch (error) {
      console.error('Customer search error:', error);
    }
  };

  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    try {
      const response = await productsAPI.getByBarcode(barcode.trim());
      addToCart(response.data.data);
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
      if (existingItem.quantity + 1 > product.stock_quantity) {
        toast.error('Insufficient stock');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      if (product.stock_quantity < 1) {
        toast.error('Product out of stock');
        return;
      }
      setCart(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        barcode: product.barcode,
        unitPrice: parseFloat(product.selling_price),
        quantity: 1,
        vatType: product.vat_type,
        maxStock: product.stock_quantity
      }]);
      toast.success(`${product.name} added`);
    }
    setProducts([]);
    setSearchTerm('');
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) { removeFromCart(productId); return; }
    setCart(cart.map(item => {
      if (item.productId !== productId) return item;
      if (newQuantity > item.maxStock) { toast.error('Insufficient stock'); return item; }
      return { ...item, quantity: newQuantity };
    }));
  };

  const removeFromCart = (productId) => setCart(cart.filter(item => item.productId !== productId));

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setPaymentMode('single');
    setPaymentMethod('cash');
    setAmountPaid('');
    setMpesaCode('');
    setCustomerPhone('');
    setSplitAmounts({ cash: '', mpesa: '', card: '' });
    setSplitMpesaCode('');
    cancelStkPush();
  };

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
    return { subtotal, totalVat, total, change: change > 0 ? change : 0 };
  };

  const totals = calculateTotals();

  // ── STK Push ────────────────────────────────────────────────────────────────

  const handleStkPush = async (context = 'single') => {
    if (!customerPhone || customerPhone.length < 9) {
      toast.error('Enter a valid customer phone number');
      return;
    }

    const amount = context === 'split'
      ? (parseFloat(splitAmounts.mpesa) || 0)
      : totals.total;

    if (amount <= 0) {
      toast.error('Enter M-Pesa amount first');
      return;
    }

    setStkContext(context);
    setStkState('prompting');

    try {
      const response = await salesAPI.initiateMpesaPrompt({
        phone: customerPhone,
        amount,
        reference: `SALE-${Date.now()}`
      });

      if (!response.data.success || !response.data.data?.checkoutRequestId) {
        throw new Error(response.data.message || response.data.data?.error || 'Failed to initiate');
      }

      setStkCheckoutId(response.data.data.checkoutRequestId);
      setStkState('waiting');
      setStkCountdown(60);

      // Countdown timer
      stkCountdownRef.current = setInterval(() => {
        setStkCountdown(prev => {
          if (prev <= 1) {
            clearInterval(stkCountdownRef.current);
            clearInterval(stkPollRef.current);
            setStkState('failed');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Poll status every 3 seconds
      stkPollRef.current = setInterval(async () => {
        try {
          const statusRes = await salesAPI.checkMpesaStatus(response.data.data.checkoutRequestId);
          const status = statusRes.data.data;

          if (status.success) {
            clearInterval(stkPollRef.current);
            clearInterval(stkCountdownRef.current);
            setStkState('confirmed');
            const code = status.mpesaReceiptNumber || 'CONFIRMED';
            if (context === 'split') {
              setSplitMpesaCode(code);
            } else {
              setMpesaCode(code);
            }
            toast.success('M-Pesa payment confirmed!');
          } else if (status.resultCode === '1032' || status.resultCode === '1037') {
            clearInterval(stkPollRef.current);
            clearInterval(stkCountdownRef.current);
            setStkState('failed');
            toast.error('Payment cancelled by customer');
          }
          // resultCode 'pending' → keep polling
        } catch { /* keep polling */ }
      }, 3000);

    } catch (error) {
      setStkState('failed');
      toast.error(error.response?.data?.message || error.message || 'Failed to send prompt');
    }
  };

  const cancelStkPush = useCallback(() => {
    clearInterval(stkPollRef.current);
    clearInterval(stkCountdownRef.current);
    setStkState(null);
    setStkCheckoutId(null);
    setStkCountdown(60);
  }, []);

  const resetStkPush = () => {
    cancelStkPush();
    setStkState(null);
  };

  // ── Checkout ─────────────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }

    let splitPaymentsData = null;

    if (paymentMode === 'split') {
      const cashAmt = parseFloat(splitAmounts.cash) || 0;
      const mpesaAmt = parseFloat(splitAmounts.mpesa) || 0;
      const cardAmt = parseFloat(splitAmounts.card) || 0;
      const splitTotal = cashAmt + mpesaAmt + cardAmt;

      if (splitTotal <= 0) { toast.error('Enter payment amounts'); return; }
      if (Math.abs(splitTotal - totals.total) > 0.01) {
        toast.error(`Split total ${formatCurrency(splitTotal)} ≠ sale total ${formatCurrency(totals.total)}`);
        return;
      }
      if (mpesaAmt > 0 && !splitMpesaCode) {
        toast.error('Enter M-Pesa code for the M-Pesa portion');
        return;
      }

      splitPaymentsData = [];
      if (cashAmt > 0) splitPaymentsData.push({ method: 'cash', amount: cashAmt });
      if (mpesaAmt > 0) splitPaymentsData.push({ method: 'mpesa', amount: mpesaAmt, reference: splitMpesaCode });
      if (cardAmt > 0) splitPaymentsData.push({ method: 'card', amount: cardAmt });
    } else {
      if (paymentMethod === 'cash') {
        if (!amountPaid) { toast.error('Enter amount paid'); return; }
        if (parseFloat(amountPaid) < totals.total) { toast.error('Insufficient payment'); return; }
      }
      if (paymentMethod === 'mpesa' && !mpesaCode) {
        toast.error('Enter M-Pesa confirmation code (or use STK Push)');
        return;
      }
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
        paymentMethod: paymentMode === 'split' ? 'split' : paymentMethod,
        amountPaid: paymentMode === 'split' ? totals.total : (parseFloat(amountPaid) || totals.total),
        mpesaCode: paymentMethod === 'mpesa' ? mpesaCode : null,
        splitPayments: splitPaymentsData,
        notes: null
      };

      const response = await salesAPI.create(saleData);
      toast.success(`Sale complete! Receipt: ${response.data.data.receipt_no}`);
      clearCart();
      barcodeInputRef.current?.focus();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Sale failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Computed ──────────────────────────────────────────────────────────────────

  const splitCovered = (parseFloat(splitAmounts.cash) || 0) +
    (parseFloat(splitAmounts.mpesa) || 0) +
    (parseFloat(splitAmounts.card) || 0);
  const splitRemaining = totals.total - splitCovered;

  const mpesaConfigured = tenant?.mpesaTillNumber || tenant?.mpesaPaybill;
  const isStkActive = stkState === 'prompting' || stkState === 'waiting';

  // ── Render ────────────────────────────────────────────────────────────────────

  const renderStkPushSection = (context = 'single') => {
    const isActive = isStkActive && stkContext === context;
    const isConfirmed = stkState === 'confirmed' && stkContext === context;
    const isFailed = stkState === 'failed' && stkContext === context;
    const amount = context === 'split' ? (parseFloat(splitAmounts.mpesa) || 0) : totals.total;

    if (isConfirmed) {
      return (
        <div className="stk-status stk-confirmed">
          <FaCheckCircle />
          <span>M-Pesa payment confirmed!</span>
          <button className="stk-reset-btn" onClick={resetStkPush}>Change</button>
        </div>
      );
    }

    if (isActive) {
      return (
        <div className="stk-status stk-waiting">
          <FaSpinner className="spin" />
          <div className="stk-waiting-text">
            <strong>Waiting for customer...</strong>
            <small>Prompt sent to {customerPhone} · {stkCountdown}s</small>
          </div>
          <button className="stk-cancel-btn" onClick={cancelStkPush}>Cancel</button>
        </div>
      );
    }

    if (isFailed) {
      return (
        <div className="stk-status stk-failed">
          <FaTimesCircle />
          <span>Payment not confirmed</span>
          <button className="stk-reset-btn" onClick={() => handleStkPush(context)}>
            <FaRedo /> Retry
          </button>
        </div>
      );
    }

    return (
      <div className="stk-prompt-section">
        <div className="stk-phone-row">
          <input
            type="tel"
            placeholder="Customer phone (07xx...)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="stk-phone-input"
          />
          <button
            className="btn btn-mpesa"
            onClick={() => handleStkPush(context)}
            disabled={!customerPhone || amount <= 0}
          >
            <FaMobileAlt /> Send Prompt
          </button>
        </div>
        <div className="stk-amount-preview">
          {amount > 0 ? `Will prompt for ${formatCurrency(amount)}` : 'Enter amount above first'}
        </div>
      </div>
    );
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
        {/* ── Left: Scanner + Search + Cart ── */}
        <div className="pos-left">
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
                      <button className="qty-btn" onClick={() => updateQuantity(item.productId, item.quantity - 1)}>
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
                      <button className="qty-btn" onClick={() => updateQuantity(item.productId, item.quantity + 1)}>
                        <FaPlus />
                      </button>
                      <button className="remove-btn" onClick={() => removeFromCart(item.productId)}>
                        <FaTrash />
                      </button>
                    </div>
                    <div className="cart-item-total">{formatCurrency(item.quantity * item.unitPrice)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Summary + Payment ── */}
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

            {/* Customer */}
            <div className="customer-section">
              <label>Customer (Optional)</label>
              {customer ? (
                <div className="selected-customer">
                  <FaUser />
                  <span>{customer.name}</span>
                  <button onClick={() => setCustomer(null)}>×</button>
                </div>
              ) : (
                <div>
                  <div className="input-with-icon" style={{ marginBottom: 6 }}>
                    <FaSearch className="input-icon" />
                    <input
                      type="text"
                      placeholder="Search customer..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="search-input"
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  {customerResults.length > 0 && (
                    <div className="search-results" style={{ maxHeight: 150 }}>
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          className="product-result-item"
                          onClick={() => { setCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}
                        >
                          <span className="product-result-name">{c.name}</span>
                          <span className="product-result-barcode">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Payment Mode Toggle */}
            <div className="payment-section">
              <div className="payment-mode-tabs">
                <button
                  className={`payment-mode-tab ${paymentMode === 'single' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('single')}
                >
                  Single Payment
                </button>
                <button
                  className={`payment-mode-tab ${paymentMode === 'split' ? 'active' : ''}`}
                  onClick={() => setPaymentMode('split')}
                >
                  <FaExchangeAlt style={{ marginRight: 4 }} /> Split Payment
                </button>
              </div>

              {/* ── Single Payment ── */}
              {paymentMode === 'single' && (
                <>
                  <div className="payment-methods" style={{ marginTop: 12 }}>
                    <button
                      className={`payment-method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('cash'); resetStkPush(); }}
                    >
                      <FaMoneyBill style={{ marginRight: 4 }} /> Cash
                    </button>
                    <button
                      className={`payment-method-btn ${paymentMethod === 'mpesa' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('mpesa'); resetStkPush(); }}
                    >
                      <FaMobileAlt style={{ marginRight: 4 }} /> M-Pesa
                    </button>
                    <button
                      className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => { setPaymentMethod('card'); resetStkPush(); }}
                    >
                      <FaCreditCard style={{ marginRight: 4 }} /> Card
                    </button>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="input-group" style={{ marginTop: 12 }}>
                      <label>Amount Paid</label>
                      <input
                        type="number"
                        placeholder={`Min. ${formatCurrency(totals.total)}`}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        step="0.01"
                      />
                      {amountPaid && totals.change > 0 && (
                        <div className="change-display">Change: {formatCurrency(totals.change)}</div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'mpesa' && (
                    <div className="mpesa-payment-section" style={{ marginTop: 12 }}>
                      {mpesaConfigured && (
                        <div className="mpesa-prompt-box">
                          <div className="mpesa-prompt-title">Customer Payment Details</div>
                          <div className="mpesa-prompt-details">
                            {tenant?.mpesaTillNumber && (
                              <div className="mpesa-detail-row">
                                <span className="mpesa-label">Till Number:</span>
                                <span className="mpesa-value">{tenant.mpesaTillNumber}</span>
                              </div>
                            )}
                            {tenant?.mpesaPaybill && (
                              <div className="mpesa-detail-row">
                                <span className="mpesa-label">Paybill:</span>
                                <span className="mpesa-value">{tenant.mpesaPaybill}</span>
                              </div>
                            )}
                            {tenant?.mpesaPaybill && tenant?.mpesaAccountNumber && (
                              <div className="mpesa-detail-row">
                                <span className="mpesa-label">Account:</span>
                                <span className="mpesa-value">{tenant.mpesaAccountNumber}</span>
                              </div>
                            )}
                            <div className="mpesa-amount-row">
                              <span className="mpesa-label">Amount:</span>
                              <span className="mpesa-amount-value">{formatCurrency(totals.total)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STK Push / Manual tabs */}
                      <div className="mpesa-input-tabs">
                        <button
                          className={`mpesa-tab ${mpesaInputMode === 'prompt' ? 'active' : ''}`}
                          onClick={() => { setMpesaInputMode('prompt'); resetStkPush(); }}
                        >
                          <FaMobileAlt /> STK Push
                        </button>
                        <button
                          className={`mpesa-tab ${mpesaInputMode === 'manual' ? 'active' : ''}`}
                          onClick={() => { setMpesaInputMode('manual'); cancelStkPush(); }}
                        >
                          Enter Code
                        </button>
                      </div>

                      {mpesaInputMode === 'prompt' ? (
                        renderStkPushSection('single')
                      ) : (
                        <div className="input-group">
                          <label>M-Pesa Confirmation Code</label>
                          <input
                            type="text"
                            placeholder="e.g. QJH5XXXXX"
                            value={mpesaCode}
                            onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
                            style={{ textTransform: 'uppercase' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="input-group" style={{ marginTop: 12 }}>
                      <label>Card Reference (optional)</label>
                      <input
                        type="text"
                        placeholder="Transaction reference"
                        value={mpesaCode}
                        onChange={(e) => setMpesaCode(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              {/* ── Split Payment ── */}
              {paymentMode === 'split' && (
                <div className="split-payment-section">
                  <div className="split-row">
                    <div className="split-method-label">
                      <FaMoneyBill className="split-icon cash-icon" /> Cash
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitAmounts.cash}
                      onChange={(e) => setSplitAmounts(p => ({ ...p, cash: e.target.value }))}
                      className="split-amount-input"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="split-row">
                    <div className="split-method-label">
                      <FaMobileAlt className="split-icon mpesa-icon" /> M-Pesa
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitAmounts.mpesa}
                      onChange={(e) => setSplitAmounts(p => ({ ...p, mpesa: e.target.value }))}
                      className="split-amount-input"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  {parseFloat(splitAmounts.mpesa) > 0 && (
                    <div className="split-mpesa-detail">
                      <div className="mpesa-input-tabs" style={{ marginBottom: 8 }}>
                        <button
                          className={`mpesa-tab ${splitMpesaInputMode === 'prompt' ? 'active' : ''}`}
                          onClick={() => { setSplitMpesaInputMode('prompt'); resetStkPush(); }}
                        >
                          <FaMobileAlt /> STK Push
                        </button>
                        <button
                          className={`mpesa-tab ${splitMpesaInputMode === 'manual' ? 'active' : ''}`}
                          onClick={() => { setSplitMpesaInputMode('manual'); cancelStkPush(); }}
                        >
                          Enter Code
                        </button>
                      </div>
                      {splitMpesaInputMode === 'prompt' ? (
                        renderStkPushSection('split')
                      ) : (
                        <input
                          type="text"
                          placeholder="M-Pesa code e.g. QJH5XXXXX"
                          value={splitMpesaCode}
                          onChange={(e) => setSplitMpesaCode(e.target.value.toUpperCase())}
                          style={{ textTransform: 'uppercase', width: '100%' }}
                        />
                      )}
                    </div>
                  )}

                  <div className="split-row">
                    <div className="split-method-label">
                      <FaCreditCard className="split-icon card-icon" /> Card
                    </div>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={splitAmounts.card}
                      onChange={(e) => setSplitAmounts(p => ({ ...p, card: e.target.value }))}
                      className="split-amount-input"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className={`split-total-bar ${Math.abs(splitRemaining) < 0.01 ? 'balanced' : splitRemaining < 0 ? 'over' : ''}`}>
                    <span>Covered: {formatCurrency(splitCovered)}</span>
                    <span>
                      {Math.abs(splitRemaining) < 0.01
                        ? '✓ Balanced'
                        : splitRemaining > 0
                          ? `Remaining: ${formatCurrency(splitRemaining)}`
                          : `Over by: ${formatCurrency(-splitRemaining)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary btn-block btn-large checkout-btn"
              onClick={handleCheckout}
              disabled={cart.length === 0 || loading}
            >
              {loading ? (
                <><FaSpinner className="spin" style={{ marginRight: 8 }} /> Processing...</>
              ) : (
                <><FaCashRegister /> Complete Sale</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPage;
