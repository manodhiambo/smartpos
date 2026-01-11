# SmartPOS Backend API

Multi-tenant Point of Sale system for supermarkets and grocery stores.

## Features

- ✅ Multi-tenant architecture (SaaS)
- ✅ Complete POS functionality
- ✅ Inventory management
- ✅ Sales tracking and reporting
- ✅ Supplier and purchase management
- ✅ Customer loyalty system
- ✅ Expense tracking
- ✅ M-Pesa payment integration support
- ✅ Role-based access control
- ✅ RESTful API

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Initialize database:
```bash
npm run init-db
```

4. Start the server:
```bash
# Development
npm run dev

# Production
npm start
```

## Default Credentials

- **Business Email**: demo@smartpos.com
- **Username**: Admin
- **Password**: Mycat@95

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new tenant
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/profile` - Update profile

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Sales
- `POST /api/sales` - Create sale
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale details
- `GET /api/sales/summary/today` - Today's summary

### Dashboard
- `GET /api/dashboard/overview` - Dashboard overview
- `GET /api/dashboard/sales-analytics` - Sales analytics
- `GET /api/dashboard/inventory-alerts` - Stock alerts

## Environment Variables

See `.env.example` for all available configuration options.

## Tech Stack

- Node.js + Express
- PostgreSQL
- JWT Authentication
- Bcrypt for password hashing
- Nodemailer for emails

## License

Proprietary - SmartPOS © 2025
