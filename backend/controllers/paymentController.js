const { queryMain } = require('../config/database');
const mpesaService = require('../services/mpesaService');
const subscriptionService = require('../services/subscriptionService');

/**
 * Initiate subscription payment
 * payment_type: 'setup' (KSh 70,000 one-time) | 'renewal' (KSh 20,000/year)
 */
exports.initiatePayment = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { payment_type, phone } = req.body;

    if (!payment_type || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Payment type and phone number are required'
      });
    }

    if (!['setup', 'renewal'].includes(payment_type)) {
      return res.status(400).json({
        success: false,
        message: 'payment_type must be "setup" or "renewal"'
      });
    }

    // Get standard plan
    const plan = await subscriptionService.getPlanByName('standard');
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Standard plan not found'
      });
    }

    // Validate state — can't pay setup fee twice
    if (payment_type === 'setup') {
      const tenantRow = await queryMain(
        'SELECT setup_fee_paid, is_trial FROM public.tenants WHERE id = $1',
        [tenantId]
      );
      if (tenantRow.rows[0]?.setup_fee_paid) {
        return res.status(400).json({
          success: false,
          message: 'Setup fee has already been paid. Use renewal instead.'
        });
      }
    }

    const amount = payment_type === 'setup' ? plan.setup_fee : plan.price_yearly;
    const description = payment_type === 'setup'
      ? 'SmartPOS Setup Fee (One-time)'
      : 'SmartPOS Annual Subscription Renewal';

    // Create payment record
    const paymentResult = await queryMain(
      `INSERT INTO public.payments
        (tenant_id, payment_method, amount, mpesa_phone, payment_for, subscription_period, subscription_months, status)
      VALUES ($1, 'mpesa', $2, $3, $4, 'standard', 12, 'pending')
      RETURNING id`,
      [tenantId, amount, phone, payment_type]
    );

    const paymentId = paymentResult.rows[0].id;

    // Initiate M-Pesa STK Push
    const stkResult = await mpesaService.stkPush(
      phone,
      amount,
      `SUB${paymentId}`,
      description
    );

    if (stkResult.success) {
      await queryMain(
        `UPDATE public.payments
        SET
          mpesa_checkout_request_id = $1,
          mpesa_merchant_request_id = $2,
          metadata = $3,
          updated_at = NOW()
        WHERE id = $4`,
        [
          stkResult.checkoutRequestId,
          stkResult.merchantRequestId,
          JSON.stringify(stkResult),
          paymentId
        ]
      );

      res.json({
        success: true,
        message: 'Payment request sent! Please check your phone to complete payment.',
        data: {
          paymentId,
          checkoutRequestId: stkResult.checkoutRequestId,
          customerMessage: stkResult.customerMessage,
          amount,
          payment_type
        }
      });
    } else {
      await queryMain(
        `UPDATE public.payments SET status = 'failed', metadata = $1, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(stkResult), paymentId]
      );

      res.status(400).json({
        success: false,
        message: stkResult.error || 'Failed to initiate payment'
      });
    }
  } catch (error) {
    console.error('Payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
};

/**
 * Check payment status
 */
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.user.tenantId;

    const result = await queryMain(
      `SELECT * FROM public.payments WHERE id = $1 AND tenant_id = $2`,
      [paymentId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = result.rows[0];

    if (payment.status === 'pending' && payment.mpesa_checkout_request_id) {
      const stkStatus = await mpesaService.queryStkPush(payment.mpesa_checkout_request_id);

      if (stkStatus.success) {
        await queryMain(
          `UPDATE public.payments
          SET
            status = 'completed',
            mpesa_result_code = '0',
            mpesa_result_desc = 'Success',
            payment_date = NOW(),
            verified_at = NOW(),
            updated_at = NOW()
          WHERE id = $1`,
          [paymentId]
        );

        // Activate or renew based on payment type
        if (payment.payment_for === 'setup') {
          await subscriptionService.activateAfterSetup(tenantId);
        } else {
          await subscriptionService.renewSubscription(tenantId);
        }

        payment.status = 'completed';
      } else if (stkStatus.resultCode !== '0' && stkStatus.resultCode !== '1032') {
        await queryMain(
          `UPDATE public.payments
          SET status = 'failed', mpesa_result_code = $1, mpesa_result_desc = $2, updated_at = NOW()
          WHERE id = $3`,
          [stkStatus.resultCode, stkStatus.resultDesc, paymentId]
        );
        payment.status = 'failed';
      }
    }

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        payment_type: payment.payment_for,
        createdAt: payment.created_at,
        completedAt: payment.payment_date
      }
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message
    });
  }
};

/**
 * M-Pesa callback handler
 */
exports.mpesaCallback = async (req, res) => {
  try {
    console.log('📲 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

    const callbackData = mpesaService.processCallback(req.body);

    const paymentResult = await queryMain(
      `SELECT * FROM public.payments WHERE mpesa_checkout_request_id = $1`,
      [callbackData.checkoutRequestId]
    );

    if (paymentResult.rows.length === 0) {
      console.log('⚠️  Payment not found for checkout request:', callbackData.checkoutRequestId);
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const payment = paymentResult.rows[0];

    if (callbackData.success) {
      await queryMain(
        `UPDATE public.payments
        SET
          status = 'completed',
          mpesa_transaction_id = $1,
          mpesa_result_code = $2,
          mpesa_result_desc = $3,
          payment_date = NOW(),
          verified_at = NOW(),
          metadata = $4,
          updated_at = NOW()
        WHERE id = $5`,
        [
          callbackData.mpesaReceiptNumber,
          callbackData.resultCode,
          callbackData.resultDesc,
          JSON.stringify(callbackData),
          payment.id
        ]
      );

      if (payment.payment_for === 'setup') {
        await subscriptionService.activateAfterSetup(payment.tenant_id);
      } else {
        await subscriptionService.renewSubscription(payment.tenant_id);
      }

      console.log(`✅ Payment successful for tenant ${payment.tenant_id} (${payment.payment_for})`);
    } else {
      await queryMain(
        `UPDATE public.payments
        SET status = 'failed', mpesa_result_code = $1, mpesa_result_desc = $2, metadata = $3, updated_at = NOW()
        WHERE id = $4`,
        [callbackData.resultCode, callbackData.resultDesc, JSON.stringify(callbackData), payment.id]
      );
      console.log(`❌ Payment failed for tenant ${payment.tenant_id}: ${callbackData.resultDesc}`);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Error processing callback' });
  }
};

/**
 * Get payment history
 */
exports.getPaymentHistory = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    const result = await queryMain(
      `SELECT
        id, amount, currency, status, payment_method, payment_for,
        subscription_period, mpesa_transaction_id, payment_date, created_at
      FROM public.payments
      WHERE tenant_id = $1
      ORDER BY created_at DESC`,
      [tenantId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
};

/**
 * Get subscription plans
 */
exports.getPlans = async (req, res) => {
  try {
    const plans = await subscriptionService.getPlans();
    res.json({ success: true, data: plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription plans',
      error: error.message
    });
  }
};

/**
 * Get current subscription info
 */
exports.getSubscriptionInfo = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const subscription = await subscriptionService.getTenantSubscription(tenantId);
    res.json({ success: true, data: subscription });
  } catch (error) {
    console.error('Get subscription info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription info',
      error: error.message
    });
  }
};
