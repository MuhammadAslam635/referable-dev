# Referable - Referral Automation Platform

## Overview

Referable is a multi-tenant SaaS application that helps local service businesses (cleaning, landscaping, mobile detailing, etc.) automate referral programs and customer communication through SMS. The platform enables businesses to send automated thank-you messages, track referrals, and manage customer relationships with minimal manual effort.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: User strongly prefers balanced, professional designs over oversized elements.

## Recent Changes

### January 2025 - Form Builder UI/UX Improvements
- Fixed input typing issues in form field editor by adding proper React keys
- Completely redesigned embedded forms with modern gradient backgrounds and professional styling
- Added smooth animations, loading spinners, and mobile-responsive design
- Improved dropdown option management with easy add/edit/delete controls
- Enhanced embed code dialog with clear step-by-step instructions
- Forms now feature beautiful gradient designs suitable for professional websites

### January 2025 - Comprehensive Design Customization System
- Added complete visual customization system for embedded forms in Form Builder
- Implemented "Design & Style" tab with font selection, color pickers, button shapes, and field border styles
- Created real-time style preview showing exactly how customizations will appear
- Enhanced database schema to store custom styling options with sensible defaults
- Updated embed code generation to use CSS variables for dynamic styling
- Added advanced customization documentation in embed dialog with CSS variable overrides
- Forms now support complete brand matching with professional design flexibility

### August 2025 - TypeScript Error Resolution & Data Integrity
- Fixed critical TypeScript compilation errors in server routes that prevented app startup
- Added missing Business type import and global referral code lookup functionality
- Corrected SMS service integration with proper parameter structure
- Resolved null safety issues in form deletion operations
- Confirmed lead generation system uses only authentic data sources (manual entries and form submissions)
- No mock or synthetic data generation - all leads come from real user interactions

### August 2025 - Navigation Simplification
- Removed Dashboard from navigation menus (both mobile and desktop)
- Updated root path "/" to redirect directly to Leads page
- Streamlined navigation flow with Leads as the primary entry point
- Fixed mobile navigation routing issues

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon (serverless PostgreSQL)
- **Session Management**: Express sessions with in-memory storage

### Multi-Tenancy
- All data is scoped by `businessId` to ensure tenant isolation
- Each business has its own clients, bookings, SMS messages, and settings
- Authentication middleware ensures users only access their own data

## Key Components

### Authentication System
- **Signup/Login**: bcrypt for password hashing
- **Password Reset**: Token-based system with email verification via Resend
- **Session Management**: Express sessions with business ID tracking
- **Multi-tenant Security**: All database queries filtered by business ID
- **Email Service**: Resend integration with custom domain (referable.live) for password reset and welcome emails

### SMS Infrastructure
- **Provider**: Twilio API integration
- **Auto-Assignment**: Automatic local phone number assignment based on area code and ZIP code
- **Two-Way Messaging**: Inbound webhook handling and reply forwarding
- **Relay System**: Forward client replies to business owner's personal phone
- **Templates**: Customizable message templates with placeholder support

### Data Ingestion
- **CSV Upload**: Support for historical appointment data with flexible column mapping
- **Zapier Integration**: Real-time webhook processing for booking system integrations
- **Field Aliasing**: Flexible field mapping to handle different booking system formats

### Referral System
- **Auto-Generated Codes**: Unique referral codes for each client
- **Tracking**: Complete referral chain tracking from referrer to referee
- **Conversion Tracking**: Monitor when referrals become paying customers
- **Reward Management**: Track and manage referral rewards

## Data Flow

### Client Onboarding
1. Business signs up and completes profile setup
2. Area code and ZIP code collected for local number assignment
3. Twilio number automatically assigned and purchased
4. Historical data imported via CSV upload or Zapier connection
5. SMS templates customized for business branding

### SMS Workflow
1. **Outbound**: Business sends messages via templates or manual compose
2. **Inbound**: Client replies received via Twilio webhook
3. **Forwarding**: Replies forwarded to business owner's personal phone
4. **Context Management**: 60-minute reply windows tracked for proper routing
5. **Logging**: All messages stored with full audit trail

### Referral Workflow
1. **Trigger**: New completed booking creates referral opportunity
2. **Code Generation**: Unique referral code assigned to client
3. **Message Dispatch**: Thank-you message with referral link sent
4. **Tracking**: Referral usage and conversions monitored
5. **Rewards**: Automatic reward tracking for successful referrals

## External Dependencies

### Core Services
- **Twilio**: SMS messaging and phone number management
- **Neon**: Serverless PostgreSQL database hosting
- **Replit**: Development and deployment platform

### Third-Party Integrations
- **Zapier**: Real-time webhook integration with booking systems
- **ZenMaid**: Primary booking system integration
- **Jobber**: Secondary booking system support
- **Housecall Pro**: Additional booking system support

### NPM Dependencies
- **Authentication**: bcrypt, express-session
- **Database**: drizzle-orm, @neondatabase/serverless
- **SMS**: twilio
- **Email**: resend
- **File Processing**: multer, csv-parser, xlsx
- **Validation**: zod, drizzle-zod
- **Utilities**: nanoid, uuid, memoizee

## Deployment Strategy

### Development Environment
- **Platform**: Replit with hot reload via Vite
- **Database**: Neon development instance
- **Build Process**: TypeScript compilation with esbuild
- **Environment Variables**: Managed through Replit secrets

### Production Deployment
- **Build Command**: `npm run build` - Creates optimized frontend and backend bundles
- **Start Command**: `npm start` - Serves production build
- **Database**: Neon production instance with connection pooling
- **Static Assets**: Served via Express static middleware

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string for Neon
- **TWILIO_ACCOUNT_SID**: Twilio authentication
- **TWILIO_AUTH_TOKEN**: Twilio authentication
- **RESEND_API_KEY**: Email service API key (optional, falls back to console logging)
- **SESSION_SECRET**: Express session encryption key
- **NODE_ENV**: Environment flag for development/production

### Database Management
- **Migrations**: Drizzle-kit for schema management
- **Schema**: Centralized schema definitions in `shared/schema.ts`
- **Seeding**: Manual data seeding for development via CSV uploads
- **Backup**: Neon handles automated backups and point-in-time recovery