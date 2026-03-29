/**
 * printReceipt — generates a thermal-style receipt in a popup window and triggers print.
 *
 * @param {object} sale        Sale object returned by salesAPI.create / salesAPI.getById
 * @param {object} tenantInfo  Tenant info from tenantAPI.getInfo (data payload)
 */
export function printReceipt(sale, tenantInfo = {}) {
  const {
    businessName = 'SmartPOS',
    businessPhone = '',
    businessAddress = '',
    receiptHeader = '',
    receiptFooter = 'Thank you for shopping with us!',
    receiptTagline = '',
    receiptKraPin = '',
    receiptShowVat = true,
    receiptCopies = 1,
  } = tenantInfo;

  const copies = Math.max(1, parseInt(receiptCopies) || 1);

  const fmt = (n) => {
    const num = parseFloat(n) || 0;
    return `KSh ${num.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (d) => {
    const date = d ? new Date(d) : new Date();
    return date.toLocaleString('en-KE', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const escHtml = (str) =>
    String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Payment summary line(s)
  const renderPayments = () => {
    const method = (sale.payment_method || '').toLowerCase();
    if (method === 'split' && Array.isArray(sale.payments) && sale.payments.length > 0) {
      return sale.payments.map(p => {
        const label = p.method === 'mpesa' ? 'M-Pesa' : p.method === 'card' ? 'Card' : 'Cash';
        const ref = p.reference ? ` <span style="color:#555;font-size:10px">(${escHtml(p.reference)})</span>` : '';
        return `<tr><td>  ${label}${ref}</td><td style="text-align:right">${fmt(p.amount)}</td></tr>`;
      }).join('');
    }
    const label = method === 'mpesa' ? 'M-Pesa' : method === 'card' ? 'Card' : 'Cash';
    const ref = sale.mpesa_code ? ` (${escHtml(sale.mpesa_code)})` : '';
    return `<tr><td>${label}${ref}</td><td style="text-align:right">${fmt(sale.amount_paid)}</td></tr>`;
  };

  const renderChange = () => {
    const change = parseFloat(sale.change_amount) || 0;
    if (change <= 0) return '';
    return `<tr><td>Change</td><td style="text-align:right">${fmt(change)}</td></tr>`;
  };

  const renderVatRow = () => {
    if (!receiptShowVat) return '';
    const vat = parseFloat(sale.vat_amount) || 0;
    return `<tr><td>VAT (16%)</td><td style="text-align:right">${fmt(vat)}</td></tr>`;
  };

  const buildOneCopy = () => `
    <div class="receipt">
      ${receiptHeader ? `<div class="receipt-header-text">${escHtml(receiptHeader)}</div>` : ''}
      <div class="business-name">${escHtml(businessName)}</div>
      ${receiptTagline ? `<div class="tagline">${escHtml(receiptTagline)}</div>` : ''}
      ${businessAddress ? `<div class="meta">${escHtml(businessAddress)}</div>` : ''}
      ${businessPhone ? `<div class="meta">Tel: ${escHtml(businessPhone)}</div>` : ''}
      ${receiptKraPin ? `<div class="meta">KRA PIN: ${escHtml(receiptKraPin)}</div>` : ''}
      <div class="divider">================================</div>
      <div class="meta">Receipt: <strong>${escHtml(sale.receipt_no || '-')}</strong></div>
      <div class="meta">Date: ${formatDate(sale.created_at)}</div>
      ${sale.cashier_name ? `<div class="meta">Cashier: ${escHtml(sale.cashier_name)}</div>` : ''}
      ${sale.customer_name ? `<div class="meta">Customer: ${escHtml(sale.customer_name)}</div>` : ''}
      <div class="divider">================================</div>
      <table class="items-table">
        <thead>
          <tr>
            <th style="text-align:left">Item</th>
            <th style="text-align:center">Qty</th>
            <th style="text-align:right">Price</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${(sale.items || []).map(item => `
            <tr>
              <td>${escHtml(item.product_name || item.productName || '-')}</td>
              <td style="text-align:center">${item.quantity}</td>
              <td style="text-align:right">${fmt(item.unit_price ?? item.unitPrice)}</td>
              <td style="text-align:right">${fmt(item.total ?? ((item.quantity || 0) * (item.unit_price ?? item.unitPrice ?? 0)))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="divider">================================</div>
      <table class="totals-table">
        <tr><td>Subtotal</td><td style="text-align:right">${fmt(sale.subtotal)}</td></tr>
        ${sale.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${fmt(sale.discount)}</td></tr>` : ''}
        ${renderVatRow()}
        <tr class="grand-total"><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>${fmt(sale.total_amount)}</strong></td></tr>
      </table>
      <div class="divider">================================</div>
      <table class="totals-table">
        ${renderPayments()}
        ${renderChange()}
      </table>
      <div class="divider">================================</div>
      ${receiptFooter ? `<div class="footer-msg">${escHtml(receiptFooter)}</div>` : ''}
      <div class="powered-by">Powered by SmartPOS</div>
    </div>
  `;

  const copiesHtml = Array.from({ length: copies }, (_, i) =>
    i < copies - 1
      ? `${buildOneCopy()}<div class="page-break"></div>`
      : buildOneCopy()
  ).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Receipt ${escHtml(sale.receipt_no || '')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: 12px; background: #fff; color: #000; }
    .receipt { width: 80mm; margin: 0 auto; padding: 4mm 2mm; }
    .receipt-header-text { text-align: center; font-size: 11px; margin-bottom: 4px; white-space: pre-line; }
    .business-name { text-align: center; font-size: 16px; font-weight: bold; margin: 4px 0 2px; }
    .tagline { text-align: center; font-size: 11px; font-style: italic; margin-bottom: 4px; }
    .meta { font-size: 11px; text-align: center; line-height: 1.5; }
    .divider { text-align: center; font-size: 10px; color: #777; margin: 4px 0; letter-spacing: 1px; }
    .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 11px; }
    .items-table th { font-size: 10px; border-bottom: 1px dashed #999; padding-bottom: 2px; }
    .items-table td { padding: 2px 0; vertical-align: top; }
    .totals-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .totals-table td { padding: 2px 0; }
    .grand-total td { font-size: 14px; border-top: 1px solid #000; padding-top: 4px; }
    .footer-msg { text-align: center; font-size: 11px; margin-top: 6px; font-style: italic; white-space: pre-line; }
    .powered-by { text-align: center; font-size: 9px; color: #aaa; margin-top: 8px; }
    .page-break { page-break-after: always; break-after: page; height: 0; }
    @media print {
      body { margin: 0; }
      .page-break { page-break-after: always; }
    }
  </style>
</head>
<body>
  ${copiesHtml}
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
  if (!win) {
    alert('Popup blocked. Please allow popups for this site to print receipts.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
