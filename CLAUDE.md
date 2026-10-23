Presensi Yuk | Siswa — Vite + React + TypeScript PWA.

- Data lokal: Dexie/IndexedDB (`src/repositories/dexie`).
- Backend: Supabase (auth email OTP, Postgres + RLS, project `ikemxrcimsqsbbnuhkld`) dan Vercel serverless di `api/*.js` (service role, lisensi, OTP lewat Resend, admin, affiliate, absen mandiri).
- Perubahan skema/RLS dicatat sebagai SQL di `scripts/`.
- Cek sebelum push: `npx tsc --noEmit` dan `npx vite build`.
