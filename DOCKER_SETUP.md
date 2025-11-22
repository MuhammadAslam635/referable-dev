# Docker Setup Guide

This guide will help you set up and run the Referable application using Docker Compose with PostgreSQL, pgAdmin, and Nginx.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v3.8 or higher

## Quick Start

1. **Update your `.env` file** with the local PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/referable
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations** (if needed):
   ```bash
   npm run db:push
   ```

4. **Access the services**:
   - Application: http://localhost:3000
   - pgAdmin: http://localhost:5050
   - Nginx (if configured): http://localhost:80

## Services

### PostgreSQL Database
- **Container**: `referable-postgres`
- **Port**: `5432`
- **Credentials**:
  - Username: `postgres`
  - Password: `postgres`
  - Database: `referable`

### pgAdmin
- **Container**: `referable-pgadmin`
- **Port**: `5050`
- **Credentials**:
  - Email: `admin@referable.com`
  - Password: `admin`

### Application
- **Container**: `referable-app`
- **Port**: `3000`
- **Health Check**: http://localhost:3000/api/health

### Nginx
- **Container**: `referable-nginx`
- **Ports**: `80`, `443`

## Connecting to PostgreSQL

### From your local machine:
```bash
psql -h localhost -U postgres -d referable
# Password: postgres
```

### From pgAdmin:
1. Open http://localhost:5050
2. Login with `admin@referable.com` / `admin`
3. Right-click "Servers" → "Create" → "Server"
4. General tab:
   - Name: `Referable DB`
5. Connection tab:
   - Host: `postgres` (container name)
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres`
   - Save password: ✓

## Environment Variables

### For Local Development (outside Docker):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/referable
```

### For Docker Compose (inside container):
```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/referable
```

## Common Commands

### Start services:
```bash
docker-compose up -d
```

### Stop services:
```bash
docker-compose down
```

### View logs:
```bash
docker-compose logs -f app
docker-compose logs -f postgres
```

### Restart a service:
```bash
docker-compose restart app
```

### Remove all data (⚠️ deletes database):
```bash
docker-compose down -v
```

### Build and start:
```bash
docker-compose up -d --build
```

## Database Migrations

Run migrations from your local machine (not inside Docker):
```bash
npm run db:push
```

Or use Drizzle Studio:
```bash
npm run db:studio
```

## Troubleshooting

### Database connection errors:
- Ensure PostgreSQL container is running: `docker-compose ps`
- Check PostgreSQL logs: `docker-compose logs postgres`
- Verify DATABASE_URL in `.env` matches your setup

### Port conflicts:
- If port 5432 is already in use, change it in `docker-compose.yml`:
  ```yaml
  ports:
    - "5433:5432"  # Use 5433 instead
  ```
- Update DATABASE_URL accordingly: `postgresql://postgres:postgres@localhost:5433/referable`

### Application won't start:
- Check application logs: `docker-compose logs app`
- Verify all environment variables are set
- Ensure database is healthy: `docker-compose ps`

## Data Persistence

All database data is stored in Docker volumes:
- `postgres_data`: PostgreSQL data files
- `pgadmin_data`: pgAdmin configuration

To backup your database:
```bash
docker-compose exec postgres pg_dump -U postgres referable > backup.sql
```

To restore:
```bash
docker-compose exec -T postgres psql -U postgres referable < backup.sql
```

