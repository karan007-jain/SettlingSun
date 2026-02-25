# SettlingSun - Management System

A complete Next.js 16+ application with tRPC, Prisma, PostgreSQL, and NextAuth featuring role-based access control (RBAC).

## Tech Stack

- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript
- **API Layer**: tRPC v11
- **Database**: PostgreSQL with Prisma v7
- **Authentication**: NextAuth with JWT strategy
- **UI Components**: shadcn/ui, Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query (React Query)

## Features

- 🔐 **Authentication & RBAC**: Secure login with role-based access (ADMIN, MANAGER, USER)
- 📝 **CRUD Operations**: Full create, read, update, delete for all models
- 🔍 **Autocomplete**: Searchable dropdowns for foreign key relationships
- ✅ **Validation**: Comprehensive Zod schemas with error handling
- 📱 **Responsive Design**: Mobile-first Tailwind CSS styling
- 🎨 **Modern UI**: Beautiful shadcn/ui components
- 🚀 **Type-Safe**: End-to-end TypeScript with tRPC
- 📊 **Reports**: Exchange-wise and Party-wise drill-down reports with pagination
- 👥 **User Management**: Admin dashboard for managing users and permissions
- 🔄 **DBF Sync**: Command-line tool to sync data from DBF (dBase/FoxPro) files

## Database Models

### User
- Authentication with email/password (bcrypt)
- Roles: ADMIN, MANAGER, USER
- ADMIN-only CRUD operations

### PartyMaster
- Party code (6 chars, primary key)
- Party name and reference

### Exch (Exchange)
- Exchange information with rates and commissions
- Foreign keys to PartyMaster

### IdMaster
- User ID management
- Upline relationships (self-referencing)
- Active/inactive status
- Foreign keys to PartyMaster and Exch

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SettlingSun
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/settingsun?schema=public"
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
   NEXTAUTH_URL="http://localhost:3000"
   NODE_ENV="development"
   ```

   To generate `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**
   ```bash
   # Push the schema to the database
   npm run db:push

   # Generate Prisma Client
   npm run db:generate

   # Seed the database with initial data (creates admin user)
   npm run db:seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

After seeding the database, you can login with:

- **Email**: admin@example.com
- **Password**: admin123
- **Role**: ADMIN

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   └── register/page.tsx       # Registration page
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout with sidebar
│   │   └── dashboard/
│   │       ├── page.tsx            # Dashboard home
│   │       ├── party-master/       # PartyMaster CRUD
│   │       ├── exch/               # Exchange CRUD
│   │       └── id-master/          # IdMaster CRUD
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth API routes
│   │   └── trpc/[trpc]/            # tRPC API handler
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing page
│   └── providers.tsx               # Client providers
├── components/
│   ├── forms/
│   │   ├── AutocompleteInput.tsx   # Reusable autocomplete
│   │   ├── PartyMasterForm.tsx     # PartyMaster form
│   │   ├── ExchForm.tsx            # Exchange form
│   │   └── IdMasterForm.tsx        # IdMaster form
│   ├── ui/                         # shadcn/ui components
│   └── Navbar.tsx                  # Navigation bar
├── server/
│   └── api/
│       ├── routers/
│       │   ├── auth.ts             # Auth router
│       │   ├── partyMaster.ts      # PartyMaster router
│       │   ├── exch.ts             # Exchange router
│       │   └── idMaster.ts         # IdMaster router
│       ├── trpc.ts                 # tRPC setup
│       └── root.ts                 # Root router
├── lib/
│   ├── prisma.ts                   # Prisma client
│   ├── auth.ts                     # NextAuth config
│   ├── trpc.ts                     # tRPC client
│   └── utils.ts                    # Utility functions
└── middleware.ts                   # Route protection
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma Client
- `npm run db:seed` - Seed database with initial data

## DBF File Sync

This project includes command-line tools for bidirectional sync with DBF (dBase/FoxPro) files.

### Quick Start

```bash
cd tools
npm install
cp .env.example .env
# Edit .env with your admin credentials
node dbf-sync.js status
```

### Import from DBF to PostgreSQL

```bash
# Validate data
node dbf-sync.js validate party path/to/party.dbf
node dbf-sync.js validate exch path/to/exchange.dbf

# Sync data (in order)
node dbf-sync.js sync party path/to/party.dbf --strategy UPSERT
node dbf-sync.js sync exch path/to/exchange.dbf --strategy UPSERT
node dbf-sync.js sync idmaster path/to/idmaster.dbf --strategy UPSERT
```

### Export from PostgreSQL to DBF

```bash
# Export all data
node dbf-export.js export party party_master.dbf
node dbf-export.js export exch exchange.dbf
node dbf-export.js export idmaster id_master.dbf

# Export recent changes (incremental)
node dbf-export.js sync-back party party_master.dbf --mode incremental --since 2024-01-01
node dbf-export.js sync-back exch exchange.dbf --mode incremental --since 2024-01-01
node dbf-export.js sync-back idmaster id_master.dbf --mode incremental --since 2024-01-01
```

### Two-Way Sync

Automated bidirectional synchronization:

```bash
# Linux/Mac
./bidirectional-sync.sh

# Windows
bidirectional-sync.bat
```

### Sync Strategies

- **UPSERT** (default): Insert new records, update existing ones
- **REPLACE**: Delete all existing records, then insert all
- **INSERT_ONLY**: Only insert new records, skip existing ones

**Complete documentation:**
- Import guide: [tools/README.md](tools/README.md)
- Export guide: [tools/DBF_EXPORT_GUIDE.md](tools/DBF_EXPORT_GUIDE.md)
- API reference: [DBF_SYNC_GUIDE.md](DBF_SYNC_GUIDE.md)

## Role-Based Access Control

### ADMIN
- Full access to all features
- Can create, edit, and delete all records
- Manage users and configurations

### MANAGER
- View all records
- Cannot create, edit, or delete

### USER
- View all records
- Cannot create, edit, or delete

## API Procedures

### Public Procedures
- `auth.register` - User registration
- `auth.getSession` - Get current session

### Protected Procedures (Authenticated Users)
- All `getAll` and `getById` queries
- View access to all models

### Admin Procedures (ADMIN Role Only)
- All `create`, `update`, and `delete` mutations
- Full CRUD operations

## Form Validation Rules

### PartyMaster
- `partyCode`: Exactly 6 characters, uppercase
- `partyName`: Max 15 characters
- `ref`: Max 15 characters (optional)

### Exchange
- `idName`: Max 15 characters
- `partyCode`: 6 characters (from PartyMaster)
- `shortCode`: Max 8 characters
- `rate`: Decimal(8,2)
- `idComm`: Decimal(8,2)
- `idAc`: 6 characters (from PartyMaster)

### IdMaster
- `userId`: Max 15 characters, unique
- `partyCode`: 6 characters (from PartyMaster)
- `idCode`: String (from Exch)
- `credit`: Decimal(10,2) - Credit limit (default: 0)
- `comm`: Decimal(8,2) - Commission
- `rate`: Decimal(8,2) - Rate
- `pati`: Decimal(10,2) - Pati numeric value (optional)
- `partner`: 6 characters (from PartyMaster, optional) - Partner party code
- `active`: Boolean
- `isUpline`: Boolean
- `uplineId`: Max 15 characters (conditional, from IdMaster where isUpline=true)

## Database Management

### Prisma Studio
View and edit your database with a GUI:
```bash
npm run db:studio
```

### Schema Changes
After modifying `prisma/schema.prisma`:
```bash
npm run db:push
npm run db:generate
```

## Deployment

### Prerequisites
- PostgreSQL database (e.g., Railway, Supabase, Neon)
- Node.js hosting (e.g., Vercel, Railway, Render)

### Steps
1. Set environment variables in your hosting platform
2. Build the application: `npm run build`
3. Run database migrations: `npm run db:push`
4. Seed the database: `npm run db:seed`
5. Start the server: `npm run start`

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL is running
- Check firewall/network settings

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear browser cookies and try again

### Build Errors
- Delete `node_modules` and `.next` folders
- Run `npm install` again
- Ensure all environment variables are set

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues and questions, please open an issue on the GitHub repository.

## Acknowledgments

- Next.js team for the amazing framework
- tRPC for type-safe APIs
- Prisma for the excellent ORM
- shadcn for beautiful UI components
