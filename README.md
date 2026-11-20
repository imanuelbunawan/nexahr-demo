# 🚀 NexaHR — Live Demo Version

> **Versi Demo Siap Pakai** dari NexaHR Enterprise HRIS & Dynamic RBAC Suite.  
> Berjalan sepenuhnya di sisi klien (browser) menggunakan state simulasi & mock data — **tidak memerlukan database atau server backend**. Siap di-deploy langsung ke **Vercel** atau **Netlify**!

---

## 🌟 Fitur Demo
- **11 Modul Lengkap**: Dashboard, Leave, Reimbursement, Approval Desk, Employees, Roles Matrix, Reports, Kanban, Audit Logs, Attendance, dan Payroll.
- **Dynamic RBAC Matrix**: Uji hak akses antar 5 role pengguna secara real-time.
- **Tanda Tangan Digital**: Canvas drawing, kaligrafi, dan kode hash verifikasi `NX-SIG-XXXX-YYYY`.
- **Cetak Dokumen Resmi**: Slip Gaji, Surat Cuti, dan Voucher Reimbursement.
- **PWA Offline**: Dapat diinstal di desktop/mobile dan siap offline.

---

## 🔑 Kredensial Login Demo

Aplikasi menyediakan 5 akun bawaan dengan tombol **Quick Switcher** di halaman login:

| Role | Nama | NIP | Password | Hak Akses Utama |
|---|---|---|---|---|
| **Owner / Super Admin** | Ir. Hendra Pratama | `NX-001` | `123456` | Akses penuh 11 modul & Role Matrix |
| **HRD Manager** | Siti Rahmawati, S.Psi | `NX-002` | `123456` | Kelola Karyawan, Final Approval Cuti, Attendance, Payroll |
| **IT Manager** | Budi Santoso, S.T | `NX-003` | `123456` | Tier-1 Approval bawahan, Kanban, Laporan tim |
| **Finance Head** | Linda Kusuma, S.E. | `NX-005` | `123456` | Approval Reimbursement & Payroll |
| **Technical Staff** | Reza Aditya | `NX-012` | `123456` | Self-service: Pengajuan Cuti, Reimbursement, Absensi |

---

## ⚡ Panduan Menjalankan Secara Lokal

```bash
# 1. Masuk ke direktori
cd nexahr-demo

# 2. Instal dependensi
npm install --legacy-peer-deps

# 3. Jalankan server dev
npm run dev
```

Buka browser di: `http://localhost:3000`

---

## 🌐 Deploy ke Vercel (1-Click)

File [vercel.json](./vercel.json) sudah dikonfigurasi dengan SPA rewrite dan security headers.

1. Hubungkan repo ini ke GitHub / GitLab
2. Import project di dashboard [Vercel](https://vercel.com)
3. Framework Preset: **Vite**
4. Klik **Deploy** — selesai! Demo live dalam ~30 detik.

---

## 📦 Ingin Versi Full dengan Database MySQL?

Untuk versi komersial lengkap yang menyertakan **MySQL Database Schema, REST API Backend Express.js, Docker Compose, dan Seed Data**, silakan gunakan package **`nexahr-sell`**.
