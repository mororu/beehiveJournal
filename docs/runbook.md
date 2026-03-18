# beehiveJournal — Production Deployment Runbook

**Version:** 1.0  
**Last updated:** 2026-03  
**Target platform:** Infomaniak VPS Lite (Ubuntu 22.04 LTS)

This runbook covers: initial deployment from scratch, routine updates, certificate renewal, database backup, and recovery from common failure scenarios.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Initial Server Setup](#2-initial-server-setup)
3. [First Deploy & TLS Certificate](#3-first-deploy--tls-certificate)
4. [Create the Initial User](#4-create-the-initial-user)
5. [Routine Maintenance](#5-routine-maintenance)
6. [Updating the App](#6-updating-the-app)
7. [Recovery Scenarios](#7-recovery-scenarios)
8. [Reference: Useful Commands](#8-reference-useful-commands)

---

## 1. Prerequisites

### VPS requirements

- Ubuntu 22.04 LTS (or any modern Debian-based Linux)
- Minimum 1 vCPU, 1 GB RAM, 10 GB disk
- Public IPv4 address
- Ports 80 and 443 open in the firewall/security group

### DNS

Before running Certbot, the domain must resolve to the VPS public IP:

```
A  journal.example.com  →  <VPS_IP>
```

Verify with:

```bash
dig +short journal.example.com
# Should return your VPS IP
```

DNS propagation can take up to 24 hours, though usually under 10 minutes.

### Install Docker Engine

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (avoids sudo for every command)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version          # Docker 24.x or later
docker compose version    # Docker Compose v2.x or later
```

---

## 2. Initial Server Setup

### Clone the repository

```bash
cd /opt
git clone https://github.com/mororu/beehiveJournal.git beehivejournal
cd beehivejournal
```

### Create the production `.env` file

```bash
cp .env.example .env
nano .env
```

Fill in the required values:

```dotenv
DATABASE_PATH=/data/db.sqlite
JWT_SECRET=<generate with: openssl rand -base64 32>
PORT=3000
NODE_ENV=production
```

Generate a strong `JWT_SECRET`:

```bash
openssl rand -base64 32
```

Copy the output and paste it as the `JWT_SECRET` value. **Never commit this file.**

### Update `nginx/conf.d/app.conf`

Replace every occurrence of `YOURDOMAIN` with the actual domain:

```bash
sed -i 's/YOURDOMAIN/journal.example.com/g' nginx/conf.d/app.conf
```

Verify:

```bash
grep server_name nginx/conf.d/app.conf
# Should show: server_name journal.example.com;
```

---

## 3. First Deploy & TLS Certificate

Certificates must be issued before the HTTPS server block in Nginx can start. The process is:

1. Start Nginx in HTTP-only mode (temporarily)
2. Issue the certificate via Certbot webroot
3. Restart Nginx with the full HTTPS config

### Step 3.1 — Start the app and Nginx (HTTP only)

On the first run, Nginx will fail to start because the certificate files don't exist yet. Use a temporary HTTP-only config:

```bash
# Comment out the HTTPS server block temporarily
# Edit nginx/conf.d/app.conf and remove or comment the 'server { listen 443 ssl; ... }' block.
# Leave only the HTTP server block (with the /.well-known/acme-challenge/ location).

docker compose up -d app nginx
```

Verify Nginx is serving the ACME challenge path:

```bash
curl -I http://journal.example.com/.well-known/acme-challenge/test
# Should return 404 (directory exists, no file there — that's correct)
```

### Step 3.2 — Issue the Let's Encrypt certificate

```bash
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --domain journal.example.com \
  --email you@example.com \
  --agree-tos \
  --no-eff-email
```

Expected output ends with:

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/journal.example.com/fullchain.pem
```

### Step 3.3 — Re-enable the HTTPS server block

Restore the full `nginx/conf.d/app.conf` (undo the temporary edit from Step 3.1), then restart Nginx:

```bash
git checkout nginx/conf.d/app.conf
docker compose restart nginx
```

### Step 3.4 — Verify HTTPS

```bash
curl -I https://journal.example.com
# HTTP/2 200
```

```bash
# Check certificate expiry
echo | openssl s_client -connect journal.example.com:443 2>/dev/null \
  | openssl x509 -noout -dates
```

---

## 4. Create the Initial User

The app has no registration UI. The first (and only) user is created via a CLI script inside the running container.

```bash
docker exec -it beehivejournal-app node scripts/create-user.js
```

The script will prompt for a username and password. The password is hashed with Argon2id — the plain-text password is never stored.

To verify the user was created:

```bash
docker exec beehivejournal-app sqlite3 /data/db.sqlite \
  "SELECT id, username, created_at FROM users;"
```

---

## 5. Routine Maintenance

### Certificate renewal (automated)

Let's Encrypt certificates expire after 90 days. Set up a cron job on the **VPS host** to renew automatically:

```bash
crontab -e
```

Add the following line (runs at 03:00 on the 1st and 15th of each month):

```cron
0 3 1,15 * * cd /opt/beehivejournal && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload >> /var/log/beehivejournal-certbot.log 2>&1
```

Manual renewal (if needed):

```bash
cd /opt/beehivejournal
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### Database backup (automated)

The backup script (`scripts/backup.sh`) uses SQLite's `.backup` command — safe to run against a live database. It retains the last 30 daily backups.

Set up a daily cron job on the **VPS host**:

```bash
crontab -e
```

Add:

```cron
0 2 * * * docker exec beehivejournal-app sh /app/scripts/backup.sh /data/db.sqlite /data/backups >> /var/log/beehivejournal-backup.log 2>&1
```

This runs at 02:00 daily. Backups are stored in the `app-data` Docker volume at `/data/backups/`.

Manual backup:

```bash
docker exec beehivejournal-app sh /app/scripts/backup.sh
```

List existing backups:

```bash
docker exec beehivejournal-app ls -lh /data/backups/
```

Copy a backup to the host:

```bash
docker cp beehivejournal-app:/data/backups/db-2026-03-18_020000.sqlite ./db-backup.sqlite
```

---

## 6. Updating the App

App updates preserve all data — the SQLite database lives in a named Docker volume, not inside the container image.

### Standard update procedure

```bash
cd /opt/beehivejournal

# Pull latest code
git pull

# Rebuild the app image
docker compose build app

# Restart only the app container (nginx stays running — zero downtime for static assets)
docker compose up -d app
```

Drizzle migrations run automatically at server startup (`migrate()` call in `src/lib/server/db/index.ts`). No manual migration step is required.

### Verify the update

```bash
# Check the container is running
docker compose ps

# Check startup logs for errors
docker logs beehivejournal-app --tail=50

# Confirm the app responds
curl -I https://journal.example.com
```

### Rollback

If the new version is broken:

```bash
# Go back to the previous commit
git log --oneline -5       # identify the last-good commit hash
git checkout <commit-hash>

# Rebuild and restart
docker compose build app
docker compose up -d app
```

---

## 7. Recovery Scenarios

### Scenario A: App container crash / restart loop

**Symptoms:** `docker compose ps` shows the app container as `Restarting` or `Exited`.

**Diagnosis:**

```bash
# View last 100 lines of startup logs
docker logs beehivejournal-app --tail=100

# Common causes:
# - JWT_SECRET missing from .env
# - DATABASE_PATH pointing to a non-existent file
# - Migration failed due to schema conflict
```

**Resolution:**

```bash
# Check .env values are correct
cat .env

# If the database file is missing (first run or volume not mounted):
docker compose down
docker compose up -d  # volume is re-created automatically

# If a migration failed:
# See "Failed migration" sub-scenario below.

# Force restart after fixing the issue:
docker compose restart app
```

### Scenario B: Failed database migration requiring rollback

**Symptoms:** App fails to start with an error like `SQLiteError: table already exists` or `column does not exist`.

**Diagnosis:**

```bash
docker logs beehivejournal-app --tail=50 | grep -i "migration\|error\|sqlite"
```

**Resolution — restore from backup:**

```bash
# 1. Stop the app
docker compose stop app

# 2. List available backups
docker exec beehivejournal-nginx ls /dev/null  # nginx is still running — ok
docker run --rm -v beehivejournal_app-data:/data alpine ls -lh /data/backups/

# 3. Copy the last known-good backup over the current database
docker run --rm -v beehivejournal_app-data:/data alpine \
  sh -c "cp /data/backups/db-<TIMESTAMP>.sqlite /data/db.sqlite"

# 4. Check out the code version that matches the backup
git log --oneline -10
git checkout <commit-hash>

# 5. Rebuild and restart
docker compose build app
docker compose up -d app

# 6. Verify
docker logs beehivejournal-app --tail=30
curl -I https://journal.example.com
```

**Prevention:** Always take a manual backup before deploying a version with schema changes:

```bash
docker exec beehivejournal-app sh /app/scripts/backup.sh
```

### Scenario C: Nginx not serving HTTPS (certificate expired)

**Symptoms:** Browser shows "certificate expired" or `curl` returns SSL error.

**Resolution:**

```bash
# Check certificate expiry
docker exec beehivejournal-nginx \
  openssl x509 -noout -dates -in /etc/letsencrypt/live/journal.example.com/cert.pem

# Renew
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload

# Verify
curl -I https://journal.example.com
```

---

## 8. Reference: Useful Commands

```bash
# View live app logs
docker logs -f beehivejournal-app

# View Nginx access logs
docker logs -f beehivejournal-nginx

# Open a shell in the app container
docker exec -it beehivejournal-app sh

# Run a SQLite query against the live database
docker exec beehivejournal-app sqlite3 /data/db.sqlite "<SQL>"

# List all inspections
docker exec beehivejournal-app sqlite3 /data/db.sqlite \
  "SELECT id, hive_id, inspected_at, health_score FROM inspections ORDER BY inspected_at DESC LIMIT 20;"

# Check Docker volume usage
docker system df -v | grep app-data

# Full stack status
docker compose ps

# Graceful full stop (data preserved)
docker compose down

# Full stop + delete volumes (DESTROYS DATABASE — only for complete reset)
docker compose down -v

# Rebuild everything from scratch
docker compose down
docker compose build --no-cache
docker compose up -d
```

---

## Checklist: First-Time Setup

- [ ] VPS provisioned, SSH access confirmed
- [ ] Docker Engine installed (`docker --version` OK)
- [ ] DNS A record pointing to VPS IP, propagation confirmed
- [ ] Repository cloned to `/opt/beehivejournal`
- [ ] `.env` created with `JWT_SECRET` (32+ chars), `DATABASE_PATH=/data/db.sqlite`
- [ ] `YOURDOMAIN` replaced in `nginx/conf.d/app.conf`
- [ ] `docker compose up -d app nginx` started successfully
- [ ] Let's Encrypt certificate issued via Certbot webroot
- [ ] Nginx restarted with full HTTPS config
- [ ] `curl -I https://journal.example.com` returns HTTP 200
- [ ] Initial user created via `docker exec -it beehivejournal-app node scripts/create-user.js`
- [ ] Logged in at `https://journal.example.com/login` with the new credentials
- [ ] Cron jobs configured for certificate renewal (twice monthly) and backup (daily)
- [ ] Manual backup taken: `docker exec beehivejournal-app sh /app/scripts/backup.sh`
- [ ] Backup verified: `docker exec beehivejournal-app ls -lh /data/backups/`
