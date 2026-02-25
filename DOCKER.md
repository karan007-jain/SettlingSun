# Docker Setup for SettlingSun

This project includes a Docker Compose configuration for easy database setup.

## Quick Start

1. **Start the database**:
   ```bash
   docker-compose up -d
   ```

2. **Check database status**:
   ```bash
   docker-compose ps
   ```

3. **Setup database schema**:
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

## Database Configuration

- **Host**: localhost
- **Port**: 8888
- **Database**: db
- **User**: user
- **Password**: password

## Docker Commands

```bash
# Start database
docker-compose up -d

# Stop database
docker-compose down

# Stop and remove volumes (⚠️ deletes all data)
docker-compose down -v

# View logs
docker-compose logs postgres

# Follow logs
docker-compose logs -f postgres

# Restart database
docker-compose restart postgres

# Access PostgreSQL CLI
docker exec -it settl-postgres psql -U user -d db
```

## Prisma Studio

View and edit your database with a GUI:
```bash
npm run db:studio
```

## Troubleshooting

### Port Already in Use
If port 8888 is already in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Change 8888 to any available port
```

Then update `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5433/db?schema=public"
```

### Database Connection Issues
1. Ensure Docker is running
2. Check if container is healthy: `docker-compose ps`
3. View container logs: `docker-compose logs postgres`

### Reset Database
```bash
# Stop and remove all data
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-initialize schema
npm run db:push
npm run db:seed
```
