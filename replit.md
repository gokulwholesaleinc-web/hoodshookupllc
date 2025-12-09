# Hoods Hookups - Lead Generation Platform

## Overview
A drop servicing lead generation platform with a React/Vite frontend and Express backend. Customers can request quotes for home services, and leads are managed through an admin interface.

## Project Architecture
```
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   └── styles/         # CSS styles
│   └── vite.config.js      # Vite configuration
├── server/
│   └── index.js            # Express API server
└── package.json            # Root package with dev scripts
```

## Development Setup
- **Frontend**: React + Vite on port 5000 (0.0.0.0)
- **Backend**: Express API on port 3001 (localhost)
- **Run command**: `npm run dev` (runs both concurrently)

## API Endpoints
- `GET /api/health` - Health check
- `POST /api/leads` - Create new lead
- `GET /api/leads` - Get all leads (admin)
- `GET /api/leads/:id` - Get single lead
- `PATCH /api/leads/:id` - Update lead status
- `POST /api/leads/forward` - Forward lead to provider
- `POST /api/providers` - Add service provider
- `GET /api/providers` - Get all providers

---

## Feature Development Rules

1. **Always make a feature branch** named `<name_of_feature>/features` and merge it before starting a new feature

2. **Keep the code DRY** - always read and search for related methods before composing them

3. **ALL NEW ENDPOINTS AND METHODS MUST HAVE ONE OR MORE TEST CASES** to validate functionality and **MUST NOT MOCK ANYTHING**

4. **Always git push on feature completion** and follow KISS coding principles (no spaghetti code)

5. **Keep commit messages detailed** and **MUST NOT WRITE UNNECESSARY MD FILES** for commits and new features

---

## Recent Changes
- 2024-12-09: Initial Replit setup - configured Vite for port 5000 with proxy to backend, added production static file serving
