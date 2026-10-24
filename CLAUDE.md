Presensi Yuk | Siswa — Vite + React + TypeScript PWA.

- Data lokal: Dexie/IndexedDB (`src/repositories/dexie`).
- Backend: Supabase (auth email OTP, Postgres + RLS, project `ikemxrcimsqsbbnuhkld`) dan Vercel serverless di `api/*.js` (service role, lisensi, OTP lewat Resend, admin, affiliate, absen mandiri).
- Perubahan skema/RLS dicatat sebagai SQL di `scripts/`.
- Cek sebelum push: `npx tsc --noEmit` dan `npx vite build`.

## Hemat deploy Vercel

- Kuota deploy Vercel (Hobby) 100 per hari untuk seluruh tim, dipakai bersama project Siswa, Guru, dan Store.
- Branch selain `main` tidak di-build (Ignored Build Step). Pakai branch kerja untuk perubahan yang belum final.
- Gabungkan perubahan kecil jadi satu push ke `main`. Jangan push per commit kecil.
- Push ke `main` hanya untuk perubahan yang siap tayang. Perbaikan teks atau rapi-rapi ditunda dan digabung dengan perubahan berikutnya, kecuali ada masalah mendesak.
- Jangan memicu deploy ulang tanpa kebutuhan (commit kosong, redeploy berulang).
