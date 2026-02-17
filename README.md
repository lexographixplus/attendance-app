# TrainTrack (Vite + React + PHP + MySQL)

This project now uses:
- Frontend: React + Vite
- Backend API: PHP (`api/index.php`)
- Database: MySQL

## Local build

1. Install dependencies:
   - `npm install`
2. Build frontend:
   - `npm run build`

## cPanel deployment (PHP + MySQL)

### 1) Create MySQL resources in cPanel
- Create a MySQL database.
- Create a MySQL user.
- Assign the user to the database with all privileges.

### 2) Configure API database connection
Edit:
- `api/config.php`

Set:
- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`

Use `api/config.example.php` as reference.

### 3) Upload files
Upload these to your domain document root (`public_html` or subdomain root):

- Frontend build output (`dist` contents):
  - `index.html`
  - `assets/` folder
- Backend:
  - `api/index.php`
  - `api/config.php`

Final structure should look like:

```text
public_html/
├── index.html
├── assets/
│   └── index-*.js
└── api/
    ├── index.php
    └── config.php
```

### 4) First run
Open your site once.  
The app calls `init` automatically and creates required tables.

## API base URL

Frontend uses:
- `/api/index.php` by default

Optional override:
- Set `VITE_API_BASE_URL` before build if your API is on another path/domain.

## Notes

- Attendance/public links are hash-based:
  - `#/auth`, `#/signup`
  - `#/register/:workspaceId/:trainingId`
  - `#/attend/:workspaceId/:trainingId`
- No Apache rewrite rules are required for these hash routes.
