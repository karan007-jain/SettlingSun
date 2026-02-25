# SettlingSun Application

Welcome to the SettlingSun Management System!

## Quick Start

1. **Update your `.env` file** with your PostgreSQL database connection string
2. **Install dependencies**: Already done! ✓
3. **Setup database**: 
   ```bash
   npm run db:push
   npm run db:seed
   ```
4. **Start development server**:
   ```bash
   npm run dev
   ```

## Default Login Credentials

After running the seed script:
- **Email**: admin@example.com
- **Password**: admin123
- **Role**: ADMIN

## Next Steps

1. Update the `DATABASE_URL` in your `.env` file with your PostgreSQL connection string
2. Update the `NEXTAUTH_SECRET` with a secure random string (run: `openssl rand -base64 32`)
3. Run `npm run db:push` to create the database schema
4. Run `npm run db:seed` to create the initial admin user
5. Run `npm run dev` to start the development server
6. Open http://localhost:3000 and login with the default credentials

## Features

- ✅ Complete authentication system with NextAuth
- ✅ Role-based access control (RBAC)
- ✅ Full CRUD operations for all models
- ✅ Searchable autocomplete dropdowns
- ✅ Form validation with Zod
- ✅ Beautiful UI with shadcn/ui and Tailwind CSS
- ✅ Type-safe API with tRPC
- ✅ PostgreSQL database with Prisma ORM

## Available Pages

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Dashboard home (protected)
- `/dashboard/party-master` - Manage Party Masters (protected)
- `/dashboard/exch` - Manage Exchanges (protected)
- `/dashboard/id-master` - Manage ID Masters (protected)

## Project Structure

See the full README.md for detailed documentation about:
- Project structure
- Database models
- API procedures
- Deployment instructions
- Troubleshooting

Happy coding! 🚀
