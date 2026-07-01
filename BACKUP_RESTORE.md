# Database Backup and Restoration Guide

This repository uses a scheduled GitHub Actions workflow to run custom `pg_dump` exports of the Neon PostgreSQL database daily at 2:00 AM UTC. Backups are stored externally in an S3-compatible bucket.

---

## 📦 Backup Storage

Backups are saved to S3-compatible bucket space with timestamps:
`datakhing-backup-YYYY-MM-DDTHH-MM-SSZ.bak`

### Required Credentials & Secrets
To view or download backups, check the repository credentials in GitHub Secrets:
- `BACKUP_STORAGE_ACCESS_KEY`
- `BACKUP_STORAGE_SECRET_KEY`
- `BACKUP_STORAGE_BUCKET`
- `BACKUP_STORAGE_ENDPOINT` (used for Cloudflare R2 / Backblaze B2)

### 🧹 Automatic Retention (30 Days)
To keep costs low and delete older backups automatically, configure a **Lifecycle Rule** directly in your storage provider dashboard (S3 / R2 / B2):
1. Create a rule named `Delete-Backups-After-30-Days`.
2. Apply to all objects.
3. Action: **Expire Current Versions of Objects** / **Delete Objects**.
4. Set Days after creation to `30`.

---

## 🔄 Restoration Procedure

> [!IMPORTANT]  
> If you need to recover data from the last few hours or days, using **Neon Console Point-in-Time Recovery (PITR)** is much faster and simpler. Use this `pg_dump` restoration guide for older states or for recovery on alternative database providers.

To restore a `.bak` backup file to a Postgres database, follow these steps:

### Step 1: Download the Backup File
Use the AWS CLI to download your desired backup:
```bash
# For custom endpoints (e.g. Cloudflare R2)
aws s3 cp s3://YOUR_BUCKET/datakhing-backup-2026-07-01T02-00-00Z.bak local-backup.bak --endpoint-url YOUR_ENDPOINT_URL

# For standard Amazon S3
aws s3 cp s3://YOUR_BUCKET/datakhing-backup-2026-07-01T02-00-00Z.bak local-backup.bak
```

### Step 2: Run pg_restore
Use `pg_restore` to restore the schema and data to your database:
```bash
pg_restore --clean --no-owner --no-privileges -h [db-host] -U [db-user] -d [db-name] local-backup.bak
```

#### Flag Explanations:
- `--clean`: Drops existing database objects before creating them.
- `--no-owner`: Skips setting ownership of objects to match the original database.
- `--no-privileges`: Skips restoring access privileges (prevents permissions errors).
