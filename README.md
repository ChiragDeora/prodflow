# Production Scheduler

A comprehensive production scheduling system built with Next.js, Supabase, and TypeScript.

## Features

- **Machine Master Management**: Comprehensive equipment tracking with categories (IM, Robot, Aux, Utility)
- **Excel Import/Export**: Smart parsing of machine data with serial number handling
- **Production Scheduling**: Advanced scheduling with approval workflows
- **User Management**: Role-based access control (Admin, Operator, User)
- **Authentication System**: Secure login/signup with password reset functionality
- **Real-time Updates**: Live data synchronization
- **Edge Functions**: Rate limiting and domain protection

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account
- Docker (for local development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see `.env.example`)

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser

## Database Setup

### Quick Setup
Run the complete database setup script:
```sql
-- Copy and paste the contents of scripts/setup_fresh_database.sql
-- into your Supabase SQL Editor and execute
```

### Manual Setup
1. **Clear existing data**: Use `scripts/purge_tables.sql`
2. **Add machine fields**: Use `scripts/apply_machine_fields.sql`
3. **Complete reset**: Use `scripts/setup_fresh_database.sql`

See [scripts/README.md](scripts/README.md) for detailed documentation.

## Project Structure

```
production-scheduler/
├── src/                    # Next.js application
│   ├── app/               # App router pages
│   │   ├── admin/         # Admin dashboard
│   │   ├── auth/          # Authentication pages
│   │   │   ├── login/     # Login page
│   │   │   ├── signup/    # Signup page
│   │   │   └── forgot-password/ # Password reset
│   │   └── unauthorized/  # Unauthorized access page
│   ├── components/        # React components
│   │   ├── admin/         # Admin-specific components
│   │   ├── auth/          # Authentication components
│   │   ├── ExcelFileReader.tsx # Excel import/export
│   │   └── ProductionSchedulerERP.tsx # Main scheduler
│   └── lib/              # Utilities and API
│       ├── auth.ts       # Authentication utilities
│       └── supabase.ts   # Supabase client and utilities
├── supabase/             # Database and Edge Functions
│   ├── functions/        # Edge Functions
│   │   ├── auth-domain-guard/ # Domain protection
│   │   └── login-rate-limiter/ # Rate limiting
│   └── migrations/       # SQL migration files
├── scripts/              # Database management scripts
├── public/              # Static assets
└── docs/                # Documentation
    ├── AUTH_SETUP.md    # Authentication setup guide
    ├── DEPLOYMENT.md    # Deployment instructions
    ├── DOCKER_GUIDE.md  # Docker setup guide
    └── SETUP.md         # General setup guide
```

## Machine Master Structure

The system supports comprehensive equipment tracking:

- **Categories**: IM (Injection Molding), Robot, Aux (Auxiliary), Utility
- **Serial Numbers**: Smart parsing of CLM/Inj format or single serials
- **Dimensions**: LxBxH format storage
- **Additional Fields**: Manufacturing date, installation date, nameplate details

## Authentication System

The application includes a complete authentication system:

- **User Registration**: Signup with email verification
- **Login/Logout**: Secure session management
- **Password Reset**: Email-based password recovery
- **Role-based Access**: Admin, Operator, and User roles
- **Session Management**: Automatic session handling with warnings

## Edge Functions

The system includes Supabase Edge Functions for enhanced security:

- **Login Rate Limiter**: Prevents brute force attacks
- **Auth Domain Guard**: Protects against unauthorized domain access

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Project Setup Guide](SETUP.md)
- [Authentication Setup](AUTH_SETUP.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Docker Setup Guide](DOCKER_GUIDE.md)
