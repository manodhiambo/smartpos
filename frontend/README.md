# SmartPOS Frontend

Modern React-based frontend for SmartPOS multi-tenant point of sale system.

## ✨ Features

- ✅ Beautiful, responsive UI with Tailwind-inspired design
- ✅ Real-time POS interface with barcode scanning
- ✅ Comprehensive dashboard with analytics
- ✅ Complete product management
- ✅ Sales tracking and history
- ✅ Customer loyalty management
- ✅ Supplier and purchase tracking
- ✅ Expense management
- ✅ Financial reports and insights
- ✅ User and staff management
- ✅ Business settings configuration

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running on http://localhost:5000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your API URL if different from default

4. Start development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build for Production
```bash
npm run build
```

## 📱 Pages & Features

### Public Pages
- **Welcome Page**: Beautiful landing page with feature showcase
- **Login**: Secure authentication
- **Register**: Multi-step tenant registration

### Protected Pages
- **Dashboard**: Real-time overview, sales stats, inventory alerts
- **POS**: Fast checkout with barcode scanning, multiple payment methods
- **Products**: Full inventory management with categories
- **Sales**: Transaction history with filtering and export
- **Purchases**: Supplier purchases and stock management
- **Suppliers**: Vendor management with payment tracking
- **Customers**: Customer database with loyalty points
- **Expenses**: Business expense tracking by category
- **Reports**: Sales analytics, financial summaries, staff performance
- **Users**: Staff management with role-based access
- **Settings**: Business info, M-Pesa integration, profile settings

## 🎨 Tech Stack

- **React 18**: Modern React with hooks
- **React Router v6**: Client-side routing
- **Axios**: HTTP client for API calls
- **React Hot Toast**: Beautiful notifications
- **React Icons**: Icon library
- **Date-fns**: Date formatting (optional)

## 📁 Project Structure
```
src/
├── components/
│   ├── common/          # Reusable components
│   │   └── ProtectedRoute.js
│   └── layout/          # Layout components
│       ├── Layout.js
│       ├── Navbar.js
│       └── Sidebar.js
├── context/
│   └── AuthContext.js   # Authentication context
├── pages/
│   ├── WelcomePage.js
│   ├── LoginPage.js
│   ├── RegisterPage.js
│   ├── DashboardPage.js
│   ├── POSPage.js
│   ├── ProductsPage.js
│   ├── SalesPage.js
│   ├── PurchasesPage.js
│   ├── SuppliersPage.js
│   ├── CustomersPage.js
│   ├── ExpensesPage.js
│   ├── ReportsPage.js
│   ├── UsersPage.js
│   └── SettingsPage.js
├── services/
│   └── api.js           # API service layer
├── styles/              # CSS files
│   ├── index.css
│   ├── WelcomePage.css
│   ├── AuthPages.css
│   ├── Dashboard.css
│   ├── POS.css
│   ├── Products.css
│   ├── Sales.css
│   ├── Reports.css
│   ├── Settings.css
│   └── Layout.css
├── utils/
│   └── helpers.js       # Utility functions
├── App.js               # Main app component
└── index.js             # Entry point
```

## 🔐 Authentication

The app uses JWT tokens stored in localStorage. Protected routes redirect to login if not authenticated. Role-based access control restricts certain pages to admin/manager roles.

## 🎯 Key Features

### POS System
- Barcode scanning support
- Product search
- Real-time stock validation
- Multiple payment methods (Cash, M-Pesa, Card, Bank Transfer)
- Change calculation
- Customer selection
- Receipt generation

### Dashboard
- Today's sales summary
- Payment method breakdown
- Inventory status
- Recent transactions
- Quick access to POS

### Product Management
- CRUD operations
- Category management
- Stock tracking
- Low stock alerts
- Barcode support
- VAT configuration

### Reports
- Sales reports (daily, weekly, monthly)
- Top products analysis
- Staff performance tracking
- Financial summaries (P&L)
- Payment method breakdown
- Export capabilities

## 🌐 API Integration

All API calls are centralized in `src/services/api.js`:
```javascript
import { productsAPI, salesAPI, customersAPI } from '../services/api';

// Example usage
const products = await productsAPI.getAll();
const sale = await salesAPI.create(saleData);
```

## 🎨 Styling

Custom CSS with CSS variables for theming. Main colors:
- Primary: #4F46E5 (Indigo)
- Success: #10B981 (Green)
- Danger: #EF4444 (Red)
- Warning: #F59E0B (Amber)

## 📄 License

Proprietary - SmartPOS © 2025. All rights reserved.

## 📞 Support

For support, email: support@smartpos.com
