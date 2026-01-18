const bcrypt = require('bcryptjs');
const { queryMain, queryTenant } = require('../config/database');

class User {
  /**
   * Create a new user
   */
  static async create(userData) {
    const {
      tenantId,
      username,
      password,
      fullName,
      email,
      role
    } = userData;

    // Hash password
    const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Get tenant schema
    const tenantResult = await queryMain(
      'SELECT tenant_schema FROM public.tenants WHERE id = $1',
      [tenantId]
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenantSchema = tenantResult.rows[0].tenant_schema;

    // Insert into public.tenant_users
    const publicUserResult = await queryMain(
      `INSERT INTO public.tenant_users (
        tenant_id, username, password_hash, full_name, email, role, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, tenant_id, username, full_name, email, role, status, created_at`,
      [tenantId, username, passwordHash, fullName, email || null, role, 'active']
    );

    const publicUser = publicUserResult.rows[0];

    // Also insert into tenant schema users table
    try {
      await queryTenant(
        tenantSchema,
        `INSERT INTO users (
          username, password_hash, full_name, email, role, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [username, passwordHash, fullName, email || null, role, 'active', publicUser.created_at]
      );
    } catch (error) {
      console.error('Error creating user in tenant schema:', error);
      // Don't fail the whole operation if tenant schema insert fails
      // The public.tenant_users record is the source of truth
    }

    return publicUser;
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    const result = await queryMain(
      `SELECT tu.*, t.tenant_schema, t.business_name
       FROM public.tenant_users tu
       JOIN public.tenants t ON tu.tenant_id = t.id
       WHERE tu.id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Find user by username and tenant
   */
  static async findByUsername(username, tenantId) {
    const result = await queryMain(
      `SELECT tu.*, t.tenant_schema, t.business_name, t.subscription_status
       FROM public.tenant_users tu
       JOIN public.tenants t ON tu.tenant_id = t.id
       WHERE tu.username = $1 AND tu.tenant_id = $2`,
      [username, tenantId]
    );
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const result = await queryMain(
      `SELECT tu.*, t.tenant_schema, t.business_name
       FROM public.tenant_users tu
       JOIN public.tenants t ON tu.tenant_id = t.id
       WHERE tu.email = $1`,
      [email]
    );
    return result.rows[0];
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Update user
   */
  static async update(userId, updateData) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.fullName) {
      fields.push(`full_name = $${paramCount++}`);
      values.push(updateData.fullName);
    }

    if (updateData.email) {
      fields.push(`email = $${paramCount++}`);
      values.push(updateData.email);
    }

    if (updateData.role) {
      fields.push(`role = $${paramCount++}`);
      values.push(updateData.role);
    }

    if (updateData.status) {
      fields.push(`status = $${paramCount++}`);
      values.push(updateData.status);
    }

    if (updateData.password) {
      const passwordHash = await bcrypt.hash(updateData.password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
      fields.push(`password_hash = $${paramCount++}`);
      values.push(passwordHash);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const result = await queryMain(
      `UPDATE public.tenant_users
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, tenant_id, username, full_name, email, role, status, updated_at`,
      values
    );

    return result.rows[0];
  }

  /**
   * Update last login
   */
  static async updateLastLogin(userId) {
    await queryMain(
      'UPDATE public.tenant_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  /**
   * Get all users for a tenant
   */
  static async findByTenant(tenantId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await queryMain(
      `SELECT id, username, full_name, email, role, status, last_login, created_at
       FROM public.tenant_users
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );

    const countResult = await queryMain(
      'SELECT COUNT(*) FROM public.tenant_users WHERE tenant_id = $1',
      [tenantId]
    );

    return {
      users: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
      }
    };
  }

  /**
   * Delete user (soft delete)
   */
  static async delete(userId) {
    const result = await queryMain(
      `UPDATE public.tenant_users
       SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Check if username exists for tenant
   */
  static async usernameExists(username, tenantId, excludeUserId = null) {
    let query = 'SELECT id FROM public.tenant_users WHERE username = $1 AND tenant_id = $2';
    const params = [username, tenantId];

    if (excludeUserId) {
      query += ' AND id != $3';
      params.push(excludeUserId);
    }

    const result = await queryMain(query, params);
    return result.rows.length > 0;
  }
}

module.exports = User;
