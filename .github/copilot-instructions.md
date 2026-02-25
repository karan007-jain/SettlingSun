# SettlingSun Management System

A complete Next.js 16+ application with comprehensive role-based access control and database management.

## Tech Stack
- **Framework**: Next.js 16+ (App Router, TypeScript, React 19)
- **API Layer**: tRPC v11 with end-to-end type safety
- **Database**: PostgreSQL with Prisma 5.22 ORM
- **Authentication**: NextAuth with JWT strategy and RBAC
- **Styling**: Tailwind CSS with shadcn/ui components
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Autocomplete**: Headless UI Combobox

## Database Models

### User
- Authentication with email/password (bcrypt hashed)
- Roles: ADMIN, MANAGER, USER
- Full session management with NextAuth

### PartyMaster
- partyCode: 6 characters (primary key, uppercase)
- partyName: max 15 characters
- ref: optional reference field
- Relations: Used in Exch and IdMaster

### Exch (Exchange)
- idName, shortCode, rate, idComm
- Foreign keys: partyCode, idAc (both link to PartyMaster)
- Manages exchange rates and commissions

### IdMaster
- userId: unique identifier (max 15 chars)
- Relationships: partyCode, idCode (Exch), partner (PartyMaster FK, optional)
- Financial fields: credit (limit), comm (commission), rate, pati (numeric, optional)
- Partner mapping: partner field links to PartyMaster for profit sharing
- Upline management: isUpline flag, self-referencing uplineId
- Active/inactive status tracking

## DBF File Field Mappings

Actual DBF structure from legacy system:
- **PARTYMST.DBF**: P_CODE → partyCode, P_NAME → partyName, P_REF → ref
- **ITEMMAST.DBF**: IDNAME → idName, PCODE → partyCode, SHORT → shortCode, RATE → rate, IDCOMM → idComm, IDAC → idAc
- **IDMASTER.DBF**: USERID → userId, PCODE → partyCode, IDNAME → idCode, CREDIT → credit, COMMISSION → comm, RATE → rate, PATI → pati (numeric), PARTNER → partner (party code), ACTIVE → active, UPLINE → isUpline

## Key Features

### Authentication & Authorization
- Secure login/registration with bcrypt password hashing
- JWT-based session management
- Three procedure types:
  - `publicProcedure`: Unauthenticated access
  - `protectedProcedure`: Requires authentication
  - `adminProcedure`: Requires ADMIN role
- Middleware protection for dashboard routes

## Key Features

### Authentication & Authorization
- Secure login/registration with bcrypt password hashing
- JWT-based session management
- Three procedure types:
  - `publicProcedure`: Unauthenticated access
  - `protectedProcedure`: Requires authentication
  - `adminProcedure`: Requires ADMIN role
- Middleware protection for dashboard routes

### CRUD Operations
- Full Create, Read, Update, Delete for all models
- ADMIN-only write access
- All authenticated users have read access
- Optimistic updates with React Query

### Reports
- **Exchange-wise Report**: Drill-down from exchanges → uplines → downlines
- **Party-wise Report**: Drill-down from parties → ID masters
- Server-side pagination (10 items per page)
- Multi-select filters with checkboxes
- Real-time search functionality

### User Management (ADMIN Only)
- Create, edit, delete users
- Assign roles (ADMIN, MANAGER, USER)
- Update passwords and email addresses
- Self-protection (cannot delete own account)

### DBF File Sync
- Command-line tool for syncing data from DBF (dBase/FoxPro) files
- Three sync strategies: UPSERT, REPLACE, INSERT_ONLY
- Validation endpoints before syncing
- Batch processing with error handling
- Foreign key validation
- Match by different fields (ID, shortCode, userId)
- Located in `tools/` directory
- **Bidirectional sync**: Export PostgreSQL data back to DBF files
- **Incremental export**: Sync only changed records
- **Full export**: Replace entire DBF files
- **Two-way automation**: Scripts for complete sync workflow
- **Duplicate checking**: Prevents duplicate records during export (DBF files lack primary key constraints)
  - PARTYMST: Checks `PARTY_CODE` (P_CODE)
  - ITEMMAST: Checks both `ID_NAME` and `SHORT_CODE`
  - IDMASTER: Checks `USER_ID`
  - Duplicates are skipped with warnings during incremental sync

### Form Components
- **PartyMasterForm**: Simple text inputs with validation
- **ExchForm**: Includes autocomplete for foreign keys, decimal inputs
- **IdMasterForm**: Complex form with conditional fields (uplineId shows only when isUpline is false)
- All forms use React Hook Form + Zod validation

### UI/UX Features
- Responsive mobile-first design
- Searchable autocomplete dropdowns using Headless UI
- Toast notifications for all actions
- Loading states and error handling
- Data tables with edit/delete actions (ADMIN only)
- Modal dialogs for create/edit operations

## Project Structure
```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth pages (login, register)
│   ├── (dashboard)/         # Protected dashboard pages
│   ├── api/                 # API routes (NextAuth, tRPC)
│   ├── layout.tsx           # Root layout with providers
│   ├── page.tsx             # Landing page
│   └── providers.tsx        # Client providers wrapper
├── components/
│   ├── forms/               # Form components with validation
│   ├── ui/                  # shadcn/ui components
│   └── Navbar.tsx           # Navigation with session info
├── server/api/
│   ├── routers/             # tRPC routers (auth, partyMaster, exch, idMaster)
│   ├── trpc.ts              # tRPC configuration & procedures
│   └── root.ts              # Root router combining all routers
├── lib/
│   ├── auth.ts              # NextAuth configuration
│   ├── prisma.ts            # Prisma client singleton
│   ├── trpc.ts              # tRPC client setup
│   └── utils.ts             # Utility functions (cn, etc.)
├── hooks/
│   └── use-toast.ts         # Toast notification hook
└── middleware.ts            # Route protection middleware
```

## Development Guidelines

### Adding New Models
1. Update `prisma/schema.prisma`
2. Create router in `src/server/api/routers/`
3. Add router to `src/server/api/root.ts`
4. Create form component in `src/components/forms/`
5. Create page in `src/app/(dashboard)/dashboard/`

### Code Style
- Use TypeScript for all files
- Follow Next.js App Router conventions
- Client components must have "use client" directive
- Server components by default (no directive needed)
- Use tRPC hooks for data fetching: `api.model.query.useQuery()`
- Use tRPC mutations for writes: `api.model.mutate.useMutation()`

### State Management
- Server state: TanStack Query (via tRPC)
- Form state: React Hook Form
- UI state: React useState/useEffect
- Global state: React Context (via providers)

## Common Tasks

### Update Database Schema
1. Modify `prisma/schema.prisma`
2. Run `npm run db:push` to sync database
3. Run `npm run db:generate` to update Prisma Client

### Add New Route
1. Create folder in appropriate route group
2. Create `page.tsx` with default export
3. Add link in dashboard layout sidebar

### Add New Form Field
1. Update Zod schema in form component
2. Add form field with proper validation
3. Update tRPC router schema if needed

## Security Notes
- All passwords are hashed with bcrypt (10 rounds)
- JWT tokens stored in HTTP-only cookies
- CSRF protection via NextAuth
- Role-based middleware protection
- Input validation on both client and server (Zod)
- SQL injection protection (Prisma parameterized queries)

## Performance Optimizations
- Server components for static content
- Client components only when needed
- Automatic code splitting
- Image optimization (Next.js built-in)
- Database query optimization (Prisma)
- React Query caching
- Incremental Static Regeneration ready

## Deployment Checklist
1. Set environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL)
2. Build: `npm run build`
3. Database: `npm run db:push`
4. Seed: `npm run db:seed`
5. Verify production build works
6. Monitor logs for errors

## Troubleshooting
- Clear `.next` folder if build fails
- Check environment variables are set correctly
- Verify database connection with `npm run db:studio`
- Check browser console for client errors
- Check terminal for server errors
- Ensure PostgreSQL is running and accessible
