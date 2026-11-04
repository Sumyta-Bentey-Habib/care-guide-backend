# Doctor Tracker — Backend API (care-guide-backend)

## Description

Doctor Tracker Backend (`care-guide-backend`) is a secure, high-performance RESTful API service engineered with Node.js, Express, TypeScript, and MongoDB. It acts as the core administrative data hub for managing doctors and their corresponding patients, featuring robust JWT-based HTTP-only cookie authentication, optimized MongoDB aggregation pipelines for real-time dashboard analytics, schema-enforced validation via Zod, and performant indexed queries for searching, filtering, and pagination.

## Setup Guide

Follow these steps to set up and run the backend locally:

### Prerequisites

- Node.js (v20+ recommended)
- pnpm (v11+ or latest)
- A running MongoDB instance or MongoDB Atlas cluster connection string

### 1. Clone & Navigate to Project

```bash
git clone https://github.com/Sumyta-Bentey-Habib/care-guide-backend.git
cd care-guide-backend
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

Create your `.env` configuration file from the provided `.env.example`:

```bash
cp .env.example .env
```

Ensure the following variables are defined in `.env`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# MongoDB Configuration
DB_URL=mongodb+srv://<cluster-url>
DB_USER=<db-username>
DB_PASS=<db-password>

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Initial Admin Seeding Credentials
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_strong_admin_password_min_12_chars
```

### 4. Seed the Initial Admin Account

Run the administrative seed script to provision the default administrator in the database:

```bash
pnpm run seed:admin
```

### 5. Start the Development Server

```bash
pnpm run dev
```

The server will initialize and listen on `http://localhost:5000`.

### 6. Build and Production Run

To compile TypeScript and run the production build:

```bash
pnpm run build
pnpm start
```

To run type checking:

```bash
pnpm run typecheck
```

---

## System Architecture

The following diagram illustrates the high-level data flow, security boundary, and service interactions:

```text
┌─────────────────────────┐
│     Next.js Client      │
│   (Doctor Tracker UI)   │
└────────────┬────────────┘
             │ HTTP REST (JSON)
             │ Credentials: include (HTTP-only JWT Cookie)
             ▼
┌─────────────────────────────────────────────────────────┐
│                 Express Application                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │  Global Middleware: CORS, CookieParser, Express.JSON │ │
│ └─────────────────────────┬───────────────────────────┘ │
│                           │                             │
│                           ▼                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Auth Middleware (JWT Verification from Cookie)      │ │
│ └─────────────────────────┬───────────────────────────┘ │
│                           │                             │
│                           ▼                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Zod Request Validation Middleware                   │ │
│ └─────────────────────────┬───────────────────────────┘ │
│                           │                             │
│                           ▼                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Controllers & Route Handlers                        │ │
│ │ • /api/auth       (Login, Logout, Me)               │ │
│ │ • /api/doctors    (CRUD, Search, Filter, Paginate)  │ │
│ │ • /api/patients   (CRUD, Date Filter, Paginate)     │ │
│ │ • /api/dashboard  (Concurrent Analytics Aggregation)│ │
│ └─────────────────────────┬───────────────────────────┘ │
│                           │ Mongoose ODM                │
│                           ▼                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ MongoDB Database (Indexed Collections)              │ │
│ │ • users (unique email)                              │ │
│ │ • doctors (specialization, hospital, createdAt)     │ │
│ │ • patients (doctorId+createdAt, condition, date)    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### REST API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/api/auth/login` | Authenticate admin & issue HTTP-only cookie | No |
| `POST` | `/api/auth/logout` | Clear auth cookie | Yes |
| `GET` | `/api/auth/me` | Fetch authenticated admin details | Yes |
| `GET` | `/api/doctors` | List doctors (search, filter, date-wise, paginate) | Yes |
| `POST` | `/api/doctors` | Register a new doctor | Yes |
| `GET` | `/api/doctors/:id` | Fetch single doctor by ID | Yes |
| `PUT` | `/api/doctors/:id` | Update doctor details | Yes |
| `DELETE` | `/api/doctors/:id` | Delete doctor (blocked if has assigned patients) | Yes |
| `GET` | `/api/doctors/:doctorId/patients` | Retrieve patients assigned to doctor | Yes |
| `POST` | `/api/doctors/:doctorId/patients` | Register patient under doctor | Yes |
| `GET` | `/api/doctors/:doctorId/patients/:patientId` | Retrieve doctor's patient by ID | Yes |
| `PUT` | `/api/doctors/:doctorId/patients/:patientId` | Update doctor's patient | Yes |
| `DELETE` | `/api/doctors/:doctorId/patients/:patientId` | Delete patient from doctor's list | Yes |
| `GET` | `/api/patients` | List all patients (search, condition, date-wise) | Yes |
| `GET` | `/api/patients/:id` | Fetch single patient by ID | Yes |
| `PUT` | `/api/patients/:id` | Update patient | Yes |
| `DELETE` | `/api/patients/:id` | Delete patient | Yes |
| `GET` | `/api/dashboard/stats` | Aggregated dashboard metrics & charts | Yes |

---

## Technical Decisions

### 1. HTTP-Only Cookie JWT Authentication vs. LocalStorage Authorization Header

Rather than having the frontend store bearer tokens in browser `localStorage` or `sessionStorage` and transmitting them manually in `Authorization: Bearer <token>` headers, the backend sets an `httpOnly`, `sameSite: 'lax'` cookie on login.

- **Why this was chosen:** Client-accessible storage is vulnerable to token exfiltration if any third-party script, dependency, or Cross-Site Scripting (XSS) vulnerability is introduced. HTTP-only cookies cannot be inspected or altered by JavaScript running in the browser.
- **Implementation Trade-off:** Requires configuring explicit CORS headers with `credentials: true` and an exact `origin: process.env.CLIENT_URL` whitelist, while disabling wildcard origins (`*`). This guarantees tight security isolation between the client and backend.

### 2. Native MongoDB Aggregation Pipelines with Parallel Execution vs. Client-Side Aggregation

For the dashboard analytics endpoint (`/api/dashboard/stats`), five distinct metrics are fetched:
1. Total doctor count (`Doctor.countDocuments()`)
2. Total patient count (`Patient.countDocuments()`)
3. Patients-per-doctor breakdown (via `Doctor.aggregate` with `$lookup` to `Patient` collection)
4. Registration trends grouped by calendar day (via `Patient.aggregate` with `$dateToString`)
5. Recent patients list (via `Patient.find().sort().limit(5)`)

- **Why this was chosen:** Moving analytics computations to MongoDB aggregation pipelines delegates grouping, counting, and transformations directly to the database engine. Executing all five queries concurrently using `Promise.all` prevents head-of-line blocking, eliminates network overhead of transferring raw documents to the server or client, and provides $O(1)$ response payloads regardless of dataset scale.
- **Index Optimization:** Compound indexes on `{ doctorId: 1, createdAt: -1 }` and single field indexes on `{ specialization: 1 }`, `{ hospital: 1 }`, and `{ createdAt: -1 }` ensure that both aggregation pipelines and paginated filter queries run efficiently without table scans.

---

## Visual Evidence

The backend API services the Doctor Tracker web client. Key verified views include:

1. **Admin Authentication & Route Protection:**
   - Secure login screen dispatching credentials to `/api/auth/login` and verifying session persistence via `/api/auth/me`.
2. **Interactive Analytics Dashboard:**
   - Real-time data visualization driven by `/api/dashboard/stats` displaying registration trends (Recharts AreaChart) and patient distribution per doctor (Recharts BarChart).
3. **Doctor Directory & Associated Patients:**
   - Server-side paginated, searchable, and filtered table with modals for doctor creation and updates.
4. **Patient Management:**
   - Dedicated records directory with condition and date-based filtering, editing, and deletion.

