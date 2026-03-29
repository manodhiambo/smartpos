const axios = require('axios');

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortCode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL;
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    
    this.baseUrl = this.environment === 'production' 
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
  }

  /**
   * Get OAuth access token (uses system credentials by default)
   */
  async getAccessToken(consumerKey, consumerSecret, env) {
    const key = consumerKey || this.consumerKey;
    const secret = consumerSecret || this.consumerSecret;
    const baseUrl = (env || this.environment) === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    try {
      const auth = Buffer.from(`${key}:${secret}`).toString('base64');
      const response = await axios.get(
        `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        { headers: { Authorization: `Basic ${auth}` } }
      );
      return response.data.access_token;
    } catch (error) {
      console.error('M-Pesa auth error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  /**
   * Generate password for STK Push
   */
  generatePassword(shortCode, passkey) {
    const sc = shortCode || this.shortCode;
    const pk = passkey || this.passkey;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${sc}${pk}${timestamp}`).toString('base64');
    return { password, timestamp };
  }

  /**
   * Format phone number to 254XXXXXXXXX
   */
  formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Initiate STK Push (system credentials)
   */
  async stkPush(phone, amount, accountReference, description) {
    return this._stkPush(
      this.consumerKey, this.consumerSecret,
      this.shortCode, this.passkey, this.environment,
      phone, amount, accountReference, description
    );
  }

  /**
   * Initiate STK Push using tenant credentials (falls back to system if not configured)
   */
  async stkPushForTenant(tenant, phone, amount, reference) {
    const consumerKey = tenant.mpesa_consumer_key || this.consumerKey;
    const consumerSecret = tenant.mpesa_consumer_secret || this.consumerSecret;
    const shortCode = tenant.mpesa_paybill || tenant.mpesa_till_number || this.shortCode;
    const passkey = tenant.mpesa_passkey || this.passkey;
    const env = tenant.mpesa_environment || this.environment;

    if (!consumerKey || !consumerSecret || !shortCode || !passkey) {
      return {
        success: false,
        error: 'M-Pesa STK Push is not configured. Go to Settings → Daraja API to set up your credentials.'
      };
    }

    return this._stkPush(
      consumerKey, consumerSecret, shortCode, passkey, env,
      phone, amount, reference, `Payment ${reference}`
    );
  }

  async _stkPush(consumerKey, consumerSecret, shortCode, passkey, env, phone, amount, accountReference, description) {
    const baseUrl = env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    try {
      const accessToken = await this.getAccessToken(consumerKey, consumerSecret);
      const { password, timestamp } = this.generatePassword(shortCode, passkey);
      const formattedPhone = this.formatPhoneNumber(phone);

      const payload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: shortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: description
      };

      const response = await axios.post(
        `${baseUrl}/mpesa/stkpush/v1/processrequest`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
        customerMessage: response.data.CustomerMessage
      };
    } catch (error) {
      console.error('STK Push error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || 'Failed to initiate payment'
      };
    }
  }

  /**
   * Query STK Push status (system credentials)
   */
  async queryStkPush(checkoutRequestId) {
    return this._queryStkPush(
      this.consumerKey, this.consumerSecret,
      this.shortCode, this.passkey, this.environment,
      checkoutRequestId
    );
  }

  /**
   * Query STK Push status using tenant credentials
   */
  async queryStkPushForTenant(tenant, checkoutRequestId) {
    const consumerKey = tenant.mpesa_consumer_key || this.consumerKey;
    const consumerSecret = tenant.mpesa_consumer_secret || this.consumerSecret;
    const shortCode = tenant.mpesa_paybill || tenant.mpesa_till_number || this.shortCode;
    const passkey = tenant.mpesa_passkey || this.passkey;
    const env = tenant.mpesa_environment || this.environment;
    return this._queryStkPush(consumerKey, consumerSecret, shortCode, passkey, env, checkoutRequestId);
  }

  async _queryStkPush(consumerKey, consumerSecret, shortCode, passkey, env, checkoutRequestId) {
    const baseUrl = env === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    try {
      const accessToken = await this.getAccessToken(consumerKey, consumerSecret);
      const { password, timestamp } = this.generatePassword(shortCode, passkey);

      const payload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(
        `${baseUrl}/mpesa/stkpushquery/v1/query`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const resultCode = String(response.data.ResultCode);
      return {
        success: resultCode === '0',
        resultCode,
        resultDesc: response.data.ResultDesc,
        mpesaReceiptNumber: response.data.MpesaReceiptNumber || null,
        data: response.data
      };
    } catch (error) {
      console.error('STK Query error:', error.response?.data || error.message);
      // Return pending status instead of throwing — frontend will keep polling
      return { success: false, resultCode: 'pending', resultDesc: 'Pending' };
    }
  }

  /**
   * Process M-Pesa callback
   */
  processCallback(callbackData) {
    const { Body } = callbackData;
    const { stkCallback } = Body;

    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const metadata = stkCallback.CallbackMetadata.Item.reduce((acc, item) => {
        acc[item.Name] = item.Value;
        return acc;
      }, {});

      return {
        success: true,
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc,
        amount: metadata.Amount,
        mpesaReceiptNumber: metadata.MpesaReceiptNumber,
        transactionDate: metadata.TransactionDate,
        phoneNumber: metadata.PhoneNumber
      };
    } else {
      // Payment failed or cancelled
      return {
        success: false,
        merchantRequestId: stkCallback.MerchantRequestID,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        resultCode: stkCallback.ResultCode,
        resultDesc: stkCallback.ResultDesc
      };
    }
  }
}

module.exports = new MpesaService();
