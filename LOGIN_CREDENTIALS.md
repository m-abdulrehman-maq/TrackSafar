# TrackSafar — Login Credentials & Testing Guide

This document contains credentials and instructions for testing the **Admin**, **Driver**, and **Passenger** panels in TrackSafar.

---

## 🔑 Login Credentials

All panels share the common login interface at `http://localhost:5173/login`, with role-specific tabs and dedicated URLs:

| Panel | Login URL | Role Tab | Email (Username) | Password | Associated Profile / Data |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administrator** | [http://localhost:5173/login/admin](http://localhost:5173/login/admin) | **Admin** | `admin@tracksafar.com` | `Admin@123456` | Full administrative access to fleet, drivers, routes, trips, incidents & audit |
| **Driver** | [http://localhost:5173/login/driver](http://localhost:5173/login/driver) | **Driver** | `driver@tracksafar.com` | `Driver@123456` | Driver Code: `DRV-001`<br>Active Trip on **Route R-01** (Bus **BUS-101**) |
| **Passenger** | [http://localhost:5173/login/passenger](http://localhost:5173/login/passenger) | **Passenger** | `passenger@tracksafar.com` | `Passenger@123456` | Primary passenger with saved alerts & nearby bus tracking |
| **Passenger (Secondary)** | [http://localhost:5173/login/passenger](http://localhost:5173/login/passenger) | **Passenger** | `ali.passenger@tracksafar.com` | `Passenger@123456` | Second test passenger account |

> **Note on Terms Checkbox**: For the **Admin** and **Driver** portals, remember to check the operational acknowledgment checkbox before clicking **Sign in**.

---

## 🚀 How to Run the Application

Both the **FastAPI backend** and the **Vite frontend** must be running simultaneously.

### 1. Start the Backend (Terminal 1)
From the project root:
```bash
npm run backend
```
*(Or alternatively: `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`)*

The backend will automatically start on `http://127.0.0.1:8000`. On first start, it automatically initializes database tables and seeds the dummy data.

### 2. Start the Frontend (Terminal 2)
From the project root:
```bash
npm run dev
```

Open your browser to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 📋 What to Explore in Each Panel

### 1. Administrator Panel (`/admin`)
- **Fleet Overview**: Live KPI counters (4 buses, 1 active trip, 1 driver, passengers, open incidents, fresh tracking).
- **Fleet — Buses**: List of configured buses (`BUS-101`, `BUS-102`, `BUS-103`, `BUS-104`) with registration, operator, capacity, and active status.
- **Drivers**: View provisioned drivers including code `DRV-001`, license number, and profile details.
- **Passengers**: View registered passengers (`Fatima Zahra`, `Ali Ahmed`) with account status controls.
- **Routes & Stops**: Inspect Route `R-01` (Railway Station ↔ Green Town) and `R-02`, and 8 stops with coordinates in Lahore.
- **Assignments & Trips**: Active assignment and live trip tracking for Bus `BUS-101`.
- **System Alerts & Incidents**: Published notifications and operational incidents.
- **Audit Logs**: Immutable log of privileged actions.

### 2. Driver Panel (`/driver`)
- **My Trip**: Displays active assignment to Bus `BUS-101` on Route `R-01`.
- **Controls**: Live trip status, GPS sample simulation / submission controls, and End Trip workflow.
- **Network**: Overview of active fleet buses.
- **Alerts & Account**: Operational guidelines and driver account information.

### 3. Passenger Panel (`/passenger`)
- **Live Map & Nearby Buses**: Real-time bus tracking showing `BUS-101` in Lahore (near Kalma Chowk).
- **Route & Bus Search**: Search routes and stops with origin/destination filtering.
- **Bus Catalog**: Filter by service type (All, Speedo, Electric).
- **Notifications**: System announcements and service alerts.

---

## 🛠️ Root Causes of Error 500 & Fixes Applied

1. **Vite Proxy ECONNREFUSED (Error 500)**:
   - When only `npm run dev` was run without the backend running, requests to `/api/*` were proxied by Vite to `127.0.0.1:8000`. Vite's default proxy error behavior returns HTTP 500 on socket connection failure (`ECONNREFUSED`), which the frontend rendered as `Request failed (500)`.
   - **Fix**: Added a proxy error handler in `frontend/admin-web/vite.config.js` to return a clear 503 response explaining that the backend is unavailable and needs to be started.

2. **Database Path & Table Mismatches**:
   - `DATABASE_URL` was configured as relative `./tracksafar_dev.db`. Running commands from the workspace root accessed a different file than running from `backend/`.
   - **Fix**: Updated `backend/app/core/config.py` to canonically resolve `tracksafar_dev.db` inside `backend/` regardless of execution directory, and load `.env` from both workspace root and `backend/`.

3. **Corrupted Initial Credentials**:
   - The preexisting SQLite file only contained an admin account with email `admin@tracksafar.local` (which failed Pydantic validation due to the `.local` TLD) and an invalid bcrypt salt that caused password checks to fail.
   - **Fix**: Replaced with clean bcrypt hashing and added error shielding in `check_password` (`backend/app/auth/__init__.py`).

4. **Missing Seed Data for Driver & Passenger**:
   - Neither Driver nor Passenger accounts existed in the database, and self-registration for drivers/admins was disabled.
   - **Fix**: Built `backend/app/seed_dummy_data.py` which seeds verified accounts, buses, routes, stops, assignments, live trips, and coordinates automatically on startup.

