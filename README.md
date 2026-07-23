# Physiotherapy Clinic

React/Vite, Express, Supabase Auth, and Supabase PostgreSQL clinic platform with isolated patient, physiotherapist, and administrator portals.

## Setup

1. In the Supabase SQL editor, run migrations in order:
   - `supabase/migrations/202607210001_create_profiles.sql`
   - `supabase/migrations/202607220001_clinic_management.sql`
   - `supabase/migrations/202607220002_replace_administrator.sql`
   - `supabase/migrations/202607220003_reconcile_physiotherapist_schema.sql`
   - `supabase/migrations/202607230001_gender_aware_booking.sql`
   Existing profiles keep a null gender until completed. Patients are prompted
   on their dashboard; administrators can set legacy clinician genders in the
   Care Team screen.
2. Confirm the Auth user `omarmassoud27076@gmail.com` exists before running the administrator migration. It promotes that profile to the single active administrator and disables any previous administrator profile. Passwords are never stored in this repository or in PostgreSQL.
3. Create `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_BACKEND_ONLY_SERVICE_ROLE_KEY
# Or use SUPABASE_SECRET_KEY for a newer sb_secret_... key.
ADMIN_EMAIL=omarmassoud27076@gmail.com
```

4. Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in the frontend environment.

## Install and run

```bash
npm install
npm run install-all
npm run dev
```

Or run `npm run backend` and `npm run frontend` separately. Frontend: `http://localhost:5173`; backend: `http://localhost:5000`.

## Routes

Frontend routes:

- `/admin/dashboard` — administrator only
- `/patient/dashboard` — patient only
- `/physiotherapist/dashboard` — physiotherapist only

Backend endpoints:

- Auth/profile: `POST /api/auth/signup`, `POST /api/auth/signin`, `GET|PATCH /api/profile/me`
- Admin: `GET /api/admin/dashboard`, `GET|POST /api/admin/physiotherapists`, `PATCH|DELETE /api/admin/physiotherapists/:id`, `GET /api/admin/patients`, `GET|PATCH|DELETE /api/admin/patients/:id`, `GET|POST /api/admin/patient-assignments`, `PATCH|DELETE /api/admin/patient-assignments/:id`
- Directory/booking: `GET /api/physiotherapists`, `GET /api/physiotherapists/:id`, `GET /api/physiotherapists/:id/available-slots`, `GET /api/appointments/availability`, `POST /api/appointments`, `GET /api/appointments/my`, `PATCH /api/appointments/:id/cancel`, `PATCH /api/appointments/:id/reschedule`
- Physiotherapist: `GET|PATCH /api/physiotherapist/me`, `GET|POST /api/physiotherapist/availability`, `PATCH|DELETE /api/physiotherapist/availability/:id`, `GET|POST /api/physiotherapist/time-off`, `DELETE /api/physiotherapist/time-off/:id`, `GET /api/physiotherapist/appointments`, `PATCH /api/physiotherapist/appointments/:id/status`, `GET /api/physiotherapist/patients`, `GET /api/physiotherapist/patients/:id`

Every protected endpoint verifies the bearer token, reloads the user's active profile, checks the database role/ownership, and uses the backend-only service client. RLS provides an additional isolation layer. Disabling accounts preserves clinical history.

## Manual verification

1. **Admin login:** sign in with the existing administrator credentials and confirm redirect to `/admin/dashboard`; verify summary cards load.
2. **Create physiotherapist:** in Care Team, enter all required fields and a temporary password of at least eight characters. Confirm the new Auth user and both database rows exist and no password appears in the API response.
3. **Update/disable physiotherapist:** sign in as that clinician and edit the professional profile. As admin, disable it and confirm sign-in/API access is rejected and the clinician disappears from patient booking.
4. **Assign patient:** register a patient, select that patient and an active clinician in Assignments, then create the assignment. Attempting a second active assignment must return `409`.
5. **Patient directory and booking:** sign in as the patient, confirm the month calendar shows times generated from active working hours. Select a clinician or leave the selector on “Any available physiotherapist”; the latter randomly assigns an eligible free clinician when the request is submitted. Confirm female patients only receive female clinicians in the directory, calendar, and final booking. A concurrent duplicate booking must return `409`.
6. **Physiotherapist appointment:** sign in as the booked clinician, confirm the appointment appears, then transition pending → confirmed → completed.
7. **Authorized patient:** confirm the clinician can view the assigned/booked patient's limited treatment profile.
8. **Isolation:** reuse patient tokens against `/api/admin/*` and `/api/physiotherapist/*` (expect `403`); use one patient against another patient's appointment (expect `404`); use one clinician against another clinician's appointment, patient, availability, or status endpoint (expect `404`); omit/alter the bearer token (expect `401`).

## Checks

```bash
npm test --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
```
