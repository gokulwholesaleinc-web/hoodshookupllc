# Hoods Hookups - Lead Generation Platform

## Overview
A drop servicing lead generation platform with a React/Vite frontend and Express backend. Customers can request quotes for home services, and leads are managed through an admin interface. Users are automatically created when requesting quotes and can log in via OTP (phone or email).

## Project Architecture
```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React context (AuthContext)
│   │   ├── pages/          # Page components (Admin, Login, Dashboard)
│   │   └── styles/         # CSS styles
│   └── vite.config.js      # Vite configuration
├── server/
│   ├── db/                 # Database (pool, schema, init, seed)
│   ├── middleware/         # Express middleware (auth)
│   ├── services/           # Business logic (auth service)
│   └── index.js            # Express API server
└── package.json            # Root package with dev scripts
```

## Development Setup
- **Frontend**: React + Vite on port 5000 (0.0.0.0)
- **Backend**: Express API on port 3001 (localhost)
- **Database**: PostgreSQL (Replit built-in)
- **Run command**: `npm run dev` (runs both concurrently)

## Authentication
- OTP-based login via phone number (no passwords)
- Users auto-created when submitting quotes
- **Admin account**: Phone `222` (bypasses OTP)
- **Test account**: Phone `333` (bypasses OTP)

## API Endpoints
### Public
- `GET /api/health` - Health check
- `POST /api/quotes` - Create quote (auto-creates user)
- `GET /api/services` - List available services
- `POST /api/auth/request-otp` - Request OTP code
- `POST /api/auth/verify-otp` - Verify OTP and login

### Protected (requires auth)
- `GET /api/users/me` - Get current user
- `GET /api/users/me/quotes` - Get user's quotes
- `GET /api/users/me/invoices` - Get user's invoices
- `GET /api/quotes/:id` - Get quote details
- `GET /api/invoices/:id` - Get invoice details

### Admin Only
- `GET /api/quotes` - Get all quotes
- `PATCH /api/quotes/:id` - Update quote status
- `POST /api/quotes/:id/forward` - Forward to provider
- `POST /api/invoices` - Create invoice
- `GET /api/providers` - Get all providers
- `POST /api/providers` - Add provider

## Database Schema
- **users**: id, role (customer/admin), timestamps
- **contact_methods**: phone/email with OTP bypass flag
- **quotes**: service requests with status tracking
- **services**: available service types
- **invoices**: billing with line items
- **payments**: payment tracking
- **otp_tokens**: OTP codes with expiry
- **sessions**: JWT session management

---

## Feature Development Rules

1. **Always make a feature branch** named `<name_of_feature>/features` and merge it before starting a new feature

2. **Keep the code DRY** - always read and search for related methods before composing them

3. **ALL NEW ENDPOINTS AND METHODS MUST HAVE ONE OR MORE TEST CASES** to validate functionality and **MUST NOT MOCK ANYTHING**

4. **Always git push on feature completion** and follow KISS coding principles (no spaghetti code)

5. **Keep commit messages detailed** and **MUST NOT WRITE UNNECESSARY MD FILES** for commits and new features

---

## Recent Changes
- 2024-12-09: Added PostgreSQL database with full schema (users, quotes, invoices, payments, OTP)
- 2024-12-09: Implemented OTP authentication system with admin/test bypass accounts
- 2024-12-09: Created user dashboard for viewing quotes and invoices
- 2024-12-09: Updated admin panel with auth protection
- 2024-12-09: Initial Replit setup - configured Vite for port 5000 with proxy to backend
