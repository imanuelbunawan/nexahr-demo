# 🚀 NexaHR — Live Demo Version

> **Versi demo siap pakai** dari NexaHR Enterprise HRIS. Berjalan sepenuhnya di browser menggunakan **mock data** — tidak memerlukan backend atau database.

---

## ✨ Tentang Demo Ini

Ini adalah build **frontend-only** dari NexaHR Enterprise HRIS:
- ✅ Semua fitur UI dapat dijelajahi
- ✅ Data karyawan, payroll, leave, attendance, dll. menggunakan mock data
- ✅ Tidak memerlukan server backend / MySQL
- ✅ Dapat di-deploy langsung ke **Vercel** atau **Netlify** dalam hitungan menit
- ⚠️ Data tidak persisten — reset setiap refresh (kecuali ada localStorage)

---

## 🔐 Kredensial Login

Gunakan akun berikut untuk masuk ke sistem demo:

| Employee ID | Nama | Role | Password |
|------------|------|------|----------|
| NX-001 | Admin Utama | Super Admin | `123456` |
| NX-002 | Budi Santoso | HR Manager | `123456` |
| NX-003 | Siti Rahayu | HR Staff | `123456` |
| NX-004 | Agus Wijaya | Finance Manager | `123456` |
| NX-005 | Dewi Lestari | Finance Staff | `123456` |
| NX-006 | Eko Prasetyo | Department Head | `123456` |
| NX-007 | Fitri Handayani | Team Lead | `123456` |
| NX-008 | Gunawan Hadi | Senior Employee | `123456` |
| NX-009 | Hana Pertiwi | Employee | `123456` |
| NX-010 | Irfan Maulana | Employee | `123456` |
| NX-011 | Joko Susilo | Employee | `123456` |
| NX-012 | Kartika Sari | Employee | `123456` |

> Semua password default: **123456**

---

## ⚡ Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Jalankan dev server
npm run dev

# 3. Buka browser
# http://localhost:3000
```

### Requirements
- Node.js 18+
- npm 9+

---

## 🌐 Deploy ke Vercel

File `vercel.json` sudah tersedia di root project — konfigurasi sudah siap!

**Langkah deploy:**
1. Push folder ini ke repository GitHub
2. Buka [vercel.com](https://vercel.com) → **New Project**
3. Import repo GitHub tersebut
4. Vercel otomatis mendeteksi konfigurasi Vite
5. Klik **Deploy** — selesai! 🎉

**Environment variables** (opsional, sudah ada di `.env`):
```
VITE_APP_NAME=NexaHR Enterprise HRIS — Live Demo
VITE_IS_DEMO=true
```

---

## 🌐 Deploy ke Netlify

```bash
# Build dulu
npm run build

# Deploy dist/ ke Netlify (via CLI)
npx netlify deploy --dir=dist --prod
```

Atau drag-and-drop folder `dist/` ke [app.netlify.com](https://app.netlify.com/drop).

---

## 🏗️ Build Production

```bash
npm run build
# Output ada di folder dist/
```

---

## 📁 Struktur Project

```
nexahr-demo/
├── src/
│   ├── components/     # UI components
│   ├── pages/          # Halaman-halaman HRIS
│   ├── hooks/          # Custom React hooks
│   ├── store/          # State management
│   ├── data/           # Mock data
│   └── types/          # TypeScript types
├── public/             # Static assets
├── .env                # Environment variables demo
├── vercel.json         # Konfigurasi deploy Vercel
├── vite.config.ts      # Vite + PWA config
└── package.json
```

---

## 🔧 Tech Stack

| Teknologi | Versi |
|-----------|-------|
| React | 19 |
| TypeScript | 5+ |
| Tailwind CSS | v4 |
| Vite | 8 |
| PWA | ✅ |

---

## 📌 Catatan Penting

> **Versi Full dengan Backend MySQL**
>
> Untuk versi production lengkap dengan:
> - REST API backend (Node.js/Express)
> - Database MySQL
> - Autentikasi JWT real
> - Multi-tenant support
>
> Gunakan folder **`nexahr-sell`** yang berisi full-stack version.

---

## 📄 Lisensi

Lihat file [LICENSE](./LICENSE) untuk informasi lisensi.

---

*NexaHR Enterprise HRIS — Solusi manajemen SDM modern untuk perusahaan Indonesia* 🇮🇩
