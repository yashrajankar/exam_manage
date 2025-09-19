# AICN Deployment Guide

This guide provides step-by-step instructions for deploying the AI Classroom Network (AICN) application in a production environment.

## Prerequisites

1. **Node.js** v16 or higher
2. **MySQL** v5.7 or higher
3. **Python 3.x** (for auto-assignment features)
4. **Operating System**: Windows, macOS, or Linux
5. **At least 2GB RAM** for smooth operation
6. **500MB free disk space** for application files and logs

## Installation Steps

### 1. Database Setup

1. Ensure MySQL is installed and running
2. Create the database and user:
   ```sql
   CREATE DATABASE IF NOT EXISTS `aicn_app_db`;
   CREATE USER IF NOT EXISTS 'aicn_user'@'localhost' IDENTIFIED BY 'SecurePass123!';
   GRANT ALL PRIVILEGES ON `aicn_app_db`.* TO 'aicn_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Create the required tables:
   ```bash
   mysql -u aicn_user -pSecurePass123! aicn_app_db < tables.sql
   ```
4. Initialize the database with default data (optional):
   ```bash
   mysql -u aicn_user -pSecurePass123! aicn_app_db < setup.sql
   ```

### 2. Environment Configuration

Update the `.env` file with your database credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=aicn_user
DB_PASSWORD=SecurePass123!
DB_NAME=aicn_app_db
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Verify Installation

Before starting the application, verify that all components are working correctly:

```bash
node test-db.js
node test-api.js
```

### 5. Start the Application

For development:
```bash
npm start
```

For production (using PM2 process manager):
```bash
npm install -g pm2
pm2 start server.js --name aicn-app
pm2 startup
pm2 save
```

The application will be available at `http://localhost:3000`

## Accessing the Application

- **Admin Dashboard**: `http://localhost:3000/admin-features/dashboard/dashboard.html`
- **User Portal**: `http://localhost:3000/user.html`

## Production Deployment Considerations

### 1. Security

- Change the default database password in `.env`
- Use environment variables for sensitive configuration
- Implement proper authentication and authorization
- Use HTTPS in production with SSL certificates
- Set up a firewall to restrict access to only necessary ports
- Regularly update Node.js, MySQL, and other dependencies

### 2. Performance

- Configure appropriate connection pool settings in `config/db.js`
- Use a reverse proxy like Nginx for static file serving and load balancing
- Enable compression for API responses
- Implement caching for frequently accessed data
- Use a CDN for static assets in distributed deployments
- Monitor and optimize database queries

### 3. Monitoring

- Set up logging for application events
- Monitor database performance
- Implement health check endpoints (`/api/health`)
- Set up alerts for critical errors
- Use application performance monitoring (APM) tools
- Monitor server resources (CPU, memory, disk space)

### 4. Backup and Recovery

- Implement regular database backups (daily/hourly depending on data volume)
- Test backup restoration procedures regularly
- Store backups in secure, offsite locations
- Implement point-in-time recovery for critical data
- Set up automated backup verification

### 5. Scaling

- Use load balancers for high availability
- Implement database read replicas for read-heavy operations
- Use Redis or similar for session storage in clustered environments
- Consider microservices architecture for large-scale deployments

## Environment-Specific Configurations

### Development Environment

For development, use the default `.env` file with local database settings.

### Production Environment

Create a separate `.env.production` file with production-specific settings:

```
DB_HOST=your-production-db-host
DB_PORT=3306
DB_USER=your-production-db-user
DB_PASSWORD=your-secure-production-password
DB_NAME=your-production-db-name
PORT=80
NODE_ENV=production
```

## Troubleshooting

### Common Issues

1. **Port already in use**: The application will automatically try the next available port
   - The server will attempt ports 3000 through 3009 automatically
   - If you prefer to specify a port, configure it in `.env` file: `PORT=3001`
   - To manually kill the process using port 3000:
     - Find the process: `Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess`
     - Kill the process: `taskkill /F /PID <process_id>`
2. **Database connection failed**: Verify database credentials and ensure MySQL is running
3. **Permission denied**: Ensure the database user has proper privileges
4. **Module not found**: Run `npm install` to install dependencies
5. **Health endpoint returns 404**: Check that API routes are defined before static file middleware
6. **Static files not loading**: Verify that `express.static()` middleware is properly configured

### Logs

Check the console output for error messages and stack traces. The application logs database connection status and API request information.

For production deployments with PM2:
```bash
pm2 logs aicn-app
```

## API Endpoints

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create a new student
- `PUT /api/students/:id` - Update a student
- `DELETE /api/students/:id` - Delete a student

### Timetables
- `GET /api/timetables` - Get all timetables
- `POST /api/timetables` - Create a new timetable
- `PUT /api/timetables/:id` - Update a timetable
- `DELETE /api/timetables/:id` - Delete a timetable

### Rooms
- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create a new room
- `PUT /api/rooms/:id` - Update a room
- `DELETE /api/rooms/:id` - Delete a room

### Seating Plans
- `GET /api/seatingPlans` - Get all seating plans
- `POST /api/seatingPlans` - Create a new seating plan
- `PUT /api/seatingPlans/:id` - Update a seating plan
- `DELETE /api/seatingPlans/:id` - Delete a seating plan

### Notifications
- `GET /api/notifications` - Get all notifications
- `POST /api/notifications` - Create a new notification
- `PUT /api/notifications/:id` - Update a notification
- `DELETE /api/notifications/:id` - Delete a notification

### User Panel
- `GET /api/user/profile` - Get user profile
- `GET /api/user/exams` - Get user exams
- `GET /api/user/exams/upcoming` - Get upcoming exams
- `GET /api/user/seating` - Get seating arrangements
- `GET /api/user/notifications` - Get user notifications

## Testing and Verification

After deployment, verify that all components are working correctly:

1. **Database Connectivity**:
   ```bash
   node test-db.js
   ```

2. **API Endpoints**:
   ```bash
   node test-api.js
   ```

3. **Frontend Functionality**:
   - Access the admin dashboard at `http://localhost:3000/admin-features/dashboard/dashboard.html`
   - Access the user portal at `http://localhost:3000/user.html`
   - Verify that all navigation links work correctly
   - Test data loading in all dashboard components

4. **Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```

## Support

For issues or questions, please check the project documentation or contact the development team.