const { queryMain, queryTenant, transactionTenant } = require('../config/database');
const { generateTenantSchema } = require('../utils/helpers');

class Tenant {
  /**
   * Create a new tenant
   */
  static async create(tenantData) {
    const {
      businessName,
      businessEmail,
      businessPhone,
      businessAddress,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    } = tenantData;

    // Generate unique schema name
    const tenantSchema = generateTenantSchema(businessName);

    // Insert tenant
    const result = await queryMain(
      `INSERT INTO public.tenants (
        tenant_name, tenant_schema, business_name, business_email,
        business_phone, business_address, mpesa_till_number,
        mpesa_paybill, mpesa_account_number, subscription_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        businessName,
        tenantSchema,
        businessName,
        businessEmail,
        businessPhone,
        businessAddress,
        mpesaTillNumber || null,
        mpesaPaybill || null,
        mpesaAccountNumber || null,
        'active'
      ]
    );

    return result.rows[0];
  }

  /**
   * Get tenant by ID
   */
  static async findById(tenantId) {
    const result = await queryMain(
      'SELECT * FROM public.tenants WHERE id = $1',
      [tenantId]
    );
    return result.rows[0];
  }

  /**
   * Get tenant by schema name
   */
  static async findBySchema(tenantSchema) {
    const result = await queryMain(
      'SELECT * FROM public.tenants WHERE tenant_schema = $1',
      [tenantSchema]
    );
    return result.rows[0];
  }

  /**
   * Get tenant by email
   */
  static async findByEmail(businessEmail) {
    const result = await queryMain(
      'SELECT * FROM public.tenants WHERE business_email = $1',
      [businessEmail]
    );
    return result.rows[0];
  }

  /**
   * Update tenant information
   */
  static async update(tenantId, updateData) {
    const {
      businessName,
      businessPhone,
      businessAddress,
      mpesaTillNumber,
      mpesaPaybill,
      mpesaAccountNumber
    } = updateData;

    const result = await queryMain(
      `UPDATE public.tenants 
       SET business_name = COALESCE($1, business_name),
           business_phone = COALESCE($2, business_phone),
           business_address = COALESCE($3, business_address),
           mpesa_till_number = COALESCE($4, mpesa_till_number),
           mpesa_paybill = COALESCE($5, mpesa_paybill),
           mpesa_account_number = COALESCE($6, mpesa_account_number),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [businessName, businessPhone, businessAddress, mpesaTillNumber, 
       mpesaPaybill, mpesaAccountNumber, tenantId]
    );

    return result.rows[0];
  }

  /**
   * Update subscription status
   */
  static async updateSubscription(tenantId, status, plan) {
    const result = await queryMain(
      `UPDATE public.tenants 
       SET subscription_status = $1, 
           subscription_plan = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [status, plan, tenantId]
    );

    return result.rows[0];
  }

  /**
   * Delete tenant (soft delete by deactivating)
   */
  static async delete(tenantId) {
    const result = await queryMain(
      `UPDATE public.tenants 
       SET subscription_status = 'inactive',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [tenantId]
    );

    return result.rows[0];
  }

  /**
   * Get all tenants with pagination
   */
  static async findAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await queryMain(
      `SELECT * FROM public.tenants 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await queryMain('SELECT COUNT(*) FROM public.tenants');
    const total = parseInt(countResult.rows[0].count);

    return {
      tenants: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get tenant statistics
   */
  static async getStats(tenantId) {
    const tenant = await this.findById(tenantId);
    if (!tenant) return null;

    // Get user count
    const userCount = await queryMain(
      'SELECT COUNT(*) FROM public.tenant_users WHERE tenant_id = $1',
      [tenantId]
    );

    return {
      ...tenant,
      userCount: parseInt(userCount.rows[0].count)
    };
  }
}

module.exports = Tenant;
