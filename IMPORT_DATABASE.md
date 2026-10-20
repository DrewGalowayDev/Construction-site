# Database Import Guide for Coolify

## Step 1: Export Local Database

### On Your Local Machine (Windows PowerShell):

```powershell
# Navigate to your project
cd d:\ZerahGo\construction

# Export the database (update password if different)
mysqldump -u root -p topline > topline_export.sql

# Or if you have the old 'construction' database name:
mysqldump -u root -p construction > topline_export.sql
```

**Enter your local MySQL password when prompted.**

---

## Step 2: Upload SQL File to Server

### Option A: Using SCP (Secure Copy)
```powershell
# From your local machine
scp d:\ZerahGo\construction\topline_export.sql root@169.58.244.109:/root/
```

### Option B: Using SFTP Client
- Use WinSCP or FileZilla
- Connect to: 169.58.244.109
- Username: root
- Upload: topline_export.sql

---

## Step 3: Import to Coolify MySQL Container

### On the Server (SSH):

```bash
# 1. Find your MySQL container ID (you already have it)
docker ps | grep mysql

# Your MySQL container ID: zzmh8mpx0ldojmzuefvj2ips

# 2. Get the root password from Coolify UI or environment
# Check in Coolify: Databases > Your MySQL Database > Configuration

# 3. Create the 'topline' database
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS topline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Import the SQL file
docker exec -i zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p topline < /root/topline_export.sql

# Or if you need to copy the file into the container first:
docker cp /root/topline_export.sql zzmh8mpx0ldojmzuefvj2ips:/tmp/
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p topline < /tmp/topline_export.sql
```

---

## Step 4: Verify Import

```bash
# Connect to MySQL container
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p

# Inside MySQL:
SHOW DATABASES;
USE topline;
SHOW TABLES;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM job_posts;
EXIT;
```

---

## Step 5: Update Application Environment Variables

In Coolify UI, update your application's environment variables:

```env
DB_NAME=topline
```

Then redeploy your application.

---

## Quick Commands for Server

```bash
# List all databases in container
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p -e "SHOW DATABASES;"

# Create topline database
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS topline CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Import SQL file (if file is on server)
docker exec -i zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p topline < /root/topline_export.sql

# Verify tables
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p -e "USE topline; SHOW TABLES;"

# Check user count
docker exec -it zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p -e "USE topline; SELECT COUNT(*) as user_count FROM users;"
```

---

## Troubleshooting

### Error: "Access denied"
- Get the correct MySQL root password from Coolify UI
- In Coolify: Databases > Your MySQL > Configuration > Root Password

### Error: "Database exists"
- Drop and recreate: `DROP DATABASE topline; CREATE DATABASE topline;`

### Error: "File not found"
- Make sure the SQL file is uploaded to `/root/` on the server
- Use: `ls -lah /root/*.sql` to verify

### Large SQL file?
```bash
# If file is very large, use gzip
# On local machine:
mysqldump -u root -p topline | gzip > topline_export.sql.gz

# Upload to server
scp topline_export.sql.gz root@169.58.244.109:/root/

# Import on server:
gunzip < /root/topline_export.sql.gz | docker exec -i zzmh8mpx0ldojmzuefvj2ips mysql -uroot -p topline
```
