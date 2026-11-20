import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Building2,
  KeyRound,
  Fingerprint,
  HelpCircle,
  X,
  ExternalLink,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';

interface LoginPageProps {
  onSuccessLogin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccessLogin }) => {
  const { login, users, roles, resetUserPassword } = useHRIS();
  const { isDark, toggleTheme } = useTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<{
    user: any;
    defaultPassword: string;
  } | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [ssoProcessing, setSsoProcessing] = useState<string | null>(null);

  // Quick preset personas for instant RBAC demo testing
  const demoPersonas = [
    {
      userId: 'user_owner',
      roleBadge: 'Owner / CEO',
      badgeColor: 'border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
      description: 'Akses penuh tanpa batas, master matrix & seluruh approval',
    },
    {
      userId: 'user_hrd',
      roleBadge: 'HR Administrator',
      badgeColor: 'border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
      description: 'Kelola data karyawan, kuota cuti, klaim & persetujuan HRD',
    },
    {
      userId: 'user_mgr_it',
      roleBadge: 'Dept Manager (IT)',
      badgeColor: 'border-indigo-300 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
      description: 'Approval cuti/klaim departemen & manajemen tugas kanban',
    },
    {
      userId: 'user_staff_it',
      roleBadge: 'Staff / Karyawan',
      badgeColor: 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
      description: 'Pengajuan cuti, klaim reimbursement & tugas tim mandiri',
    },
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(identifier, password, 'credentials');
      if (!res.success) {
        setErrorMessage(res.error || 'Identitas atau password tidak sesuai.');
      } else {
        if (onSuccessLogin) onSuccessLogin();
      }
    } catch {
      setErrorMessage('Terjadi gangguan jaringan saat memproses autentikasi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPersonaLogin = async (userId: string) => {
    setErrorMessage(null);
    setIsLoading(true);
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    setIdentifier(target.email);

    try {
      const res = await login(target.email, 'demo-password', 'quick_persona');
      if (res.success && onSuccessLogin) {
        onSuccessLogin();
      }
    } catch {
      setErrorMessage('Gagal masuk dengan akun demo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSOLogin = async (provider: 'Google Workspace' | 'Microsoft Entra ID') => {
    setErrorMessage(null);
    setSsoProcessing(provider);
    try {
      // Pick first active user or owner as simulated SSO identity
      const defaultUser = users[0];
      await new Promise((resolve) => setTimeout(resolve, 600));
      const res = await login(
        defaultUser.email,
        'sso-token',
        provider === 'Google Workspace' ? 'sso_google' : 'sso_microsoft'
      );
      if (res.success && onSuccessLogin) {
        onSuccessLogin();
      }
    } catch {
      setErrorMessage(`Gagal melakukan autentikasi Single Sign-On dengan ${provider}.`);
    } finally {
      setSsoProcessing(null);
    }
  };

  const handleOpenResetModal = () => {
    setResetIdentifier(identifier || users[0]?.email || '');
    setResetError(null);
    setResetSuccess(null);
    setShowResetModal(true);
  };

  const handleExecuteReset = async (targetIdInput?: string) => {
    const targetQuery = targetIdInput || resetIdentifier;
    if (!targetQuery.trim()) {
      setResetError('Harap masukkan email kantor atau NIP karyawan.');
      return;
    }

    setResetLoading(true);
    setResetError(null);

    try {
      const res = await resetUserPassword(targetQuery);
      if (!res.success || !res.user) {
        setResetError(res.error || 'Akun tidak ditemukan di sistem NexaHR.');
      } else {
        setResetSuccess({
          user: res.user,
          defaultPassword: res.defaultPassword,
        });
        // Pre-fill the login form
        setIdentifier(res.user.email);
        setPassword(res.defaultPassword);
      }
    } catch {
      setResetError('Gagal memproses reset kata sandi.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLoginWithResetPassword = async () => {
    if (!resetSuccess?.user) return;
    setIsLoading(true);
    setShowResetModal(false);
    try {
      const res = await login(
        resetSuccess.user.email,
        resetSuccess.defaultPassword,
        'credentials'
      );
      if (res.success && onSuccessLogin) {
        onSuccessLogin();
      }
    } catch {
      setErrorMessage('Gagal masuk otomatis setelah reset password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col justify-between antialiased text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation Bar on Login Page */}
      <header className="shrink-0 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                Nexa<span className="text-indigo-600 dark:text-indigo-400">HR</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                ENTERPRISE RBAC
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              PT. Nexa Digital Persada &bull; Portal Autentikasi Terpusat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            aria-label="Toggle tema gelap/terang"
            title={isDark ? 'Mode Terang' : 'Mode Gelap'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          <button
            type="button"
            onClick={handleOpenResetModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer"
            title="Reset kata sandi pegawai ke nilai default (123456)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Reset Password (123456)</span>
          </button>
        </div>
      </header>

      {/* Main Login Card Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3 flex items-center justify-center min-h-0 overflow-y-auto lg:overflow-visible">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-2xl overflow-hidden my-auto">
          
          {/* Left Column: Brand Hero & Security Value Proposition (Visible on Desktop) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-6 lg:p-7 flex-col justify-between text-white relative overflow-hidden">
            {/* Background Ambient Decorative Accents */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>NexaHR Security Gateway v2.4</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight text-white">
                  Sistem Informasi SDM &amp; Dynamic RBAC Terpadu
                </h1>
                <p className="text-xs sm:text-sm text-indigo-200/90 mt-3 leading-relaxed">
                  Kelola siklus kerja karyawan, pengajuan cuti berjenjang, klaim pengeluaran (reimbursement), serta penandatanganan dokumen resmi secara real-time dan aman.
                </p>
              </div>

              {/* Feature Value Badges */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Dynamic RBAC Permission</h4>
                    <p className="text-[11px] text-indigo-200/80 mt-0.5">
                      Matriks hak akses dinamis per-role hingga tingkat modul &amp; aksi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
                    <Fingerprint className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Digital Signature &amp; Audit</h4>
                    <p className="text-[11px] text-indigo-200/80 mt-0.5">
                      Tanda tangan digital berotentikasi &amp; jejak rekam audit aktivitas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Offline Sync &amp; Socket Live</h4>
                    <p className="text-[11px] text-indigo-200/80 mt-0.5">
                      Data tetap aman diakses &amp; tersinkronisasi otomatis saat terhubung.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Certifications & Compliance */}
            <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-indigo-300">
              <span className="flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5" />
                PT. Nexa Digital Persada
              </span>
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                ISO 27001 Certified
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Login Form & RBAC Quick Persona Switcher */}
          <div className="lg:col-span-7 p-5 sm:p-7 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-3.5 sm:space-y-4">
              
              {/* Heading */}
              <div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-400 uppercase tracking-wider border border-indigo-200 dark:border-indigo-800">
                  Portal Autentikasi Pegawai
                </span>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">
                  Masuk ke Akun Anda
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Masukkan email resmi atau NIP untuk mengakses sistem HRIS perusahaan.
                </p>
              </div>

              {/* Error Alert Box */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                  <div className="flex-1 leading-relaxed">
                    <strong className="font-bold">Gagal Masuk: </strong>
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-rose-500 hover:text-rose-700 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Standard Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="identifier"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Alamat Email Perusahaan / NIP Karyawan
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="identifier"
                      name="identifier"
                      type="text"
                      required
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="contoh: hendra.pratama@nexahr.co.id atau NX-001"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="password"
                      className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Kata Sandi (Password)
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenResetModal}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer flex items-center gap-1"
                      title="Atur ulang kata sandi ke default resmi: 123456"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Password (Default: 123456)</span>
                    </button>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 dark:focus:border-indigo-500 transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                      title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      Ingat sesi saya di perangkat ini
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memverifikasi Otorisasi Sesi...</span>
                    </>
                  ) : (
                    <>
                      <span>Masuk ke Sistem NexaHR</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Single Sign-On (SSO) Options */}
              <div className="space-y-3 pt-1">
                <div className="relative flex py-1 items-center">
                  <div className="grow border-t border-slate-200 dark:border-slate-800" />
                  <span className="shrink mx-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Atau Masuk dengan SSO Perusahaan
                  </span>
                  <div className="grow border-t border-slate-200 dark:border-slate-800" />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleSSOLogin('Google Workspace')}
                    disabled={Boolean(ssoProcessing) || isLoading}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Google Workspace</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSSOLogin('Microsoft Entra ID')}
                    disabled={Boolean(ssoProcessing) || isLoading}
                    className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 23 23">
                      <path fill="#f35325" d="M1 1h10v10H1z" />
                      <path fill="#81bc06" d="M12 1h10v10H12z" />
                      <path fill="#05a6f0" d="M1 12h10v10H1z" />
                      <path fill="#ffba08" d="M12 12h10v10H12z" />
                    </svg>
                    <span>Microsoft Entra</span>
                  </button>
                </div>
              </div>

              {/* Quick Persona Access for Testing (Crucial for RBAC evaluation) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Uji Coba Cepat Persona (Demo RBAC)
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    1-Klik Masuk Langsung
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {demoPersonas.map((persona) => {
                    const u = users.find((user) => user.id === persona.userId);
                    if (!u) return null;
                    return (
                      <button
                        key={persona.userId}
                        type="button"
                        onClick={() => handleQuickPersonaLogin(u.id)}
                        disabled={isLoading}
                        className="p-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-left flex items-center gap-2.5 group cursor-pointer"
                        title={`Masuk sebagai ${u.name} (${persona.roleBadge})`}
                      >
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300 dark:ring-slate-700 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {u.name.split(',')[0]}
                            </span>
                          </div>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase mt-0.5 ${persona.badgeColor}`}>
                            {persona.roleBadge}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>



      {/* Interactive Reset Password Modal (Default Password: 123456) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Reset Kata Sandi Pegawai</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      Default: 123456
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistem akan mengatur ulang kata sandi ke nilai standar default perusahaan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Default Password Highlight Card */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-700 shadow-2xs shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200">
                    Kata Sandi Default Baru:
                  </div>
                  <div className="font-mono text-base font-extrabold text-indigo-700 dark:text-indigo-300 tracking-wider">
                    123456
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard?.writeText('123456');
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  } catch {
                    // ignore
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all cursor-pointer shadow-2xs"
                title="Salin password 123456"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {/* Success State */}
            {resetSuccess ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                      Kata Sandi Berhasil Direset ke 123456!
                    </h4>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 leading-relaxed">
                      Kata sandi untuk <strong className="font-bold">{resetSuccess.user.name}</strong> ({resetSuccess.user.email}) telah diubah ke default: <code className="font-mono px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/80 font-bold">123456</code>.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleLoginWithResetPassword}
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>Masuk Langsung dengan 123456</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Tutup &amp; Gunakan Form
                  </button>
                </div>
              </div>
            ) : (
              /* Reset Form */
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="reset-identifier"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Masukkan Email Kantor atau NIP Pegawai
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-identifier"
                      type="text"
                      value={resetIdentifier}
                      onChange={(e) => setResetIdentifier(e.target.value)}
                      placeholder="contoh: hendra.pratama@nexahr.co.id atau NX-001"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {/* Quick select employee chips */}
                <div>
                  <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Atau pilih akun pegawai untuk reset cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                    {users.slice(0, 6).map((u) => {
                      const isSelected = resetIdentifier.toLowerCase() === u.email.toLowerCase();
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setResetIdentifier(u.email)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                              : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <img
                            src={u.avatar}
                            alt={u.name}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="truncate max-w-[130px]">{u.name.split(',')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecuteReset()}
                    disabled={resetLoading || !resetIdentifier.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {resetLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Mereset Kata Sandi...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Kata Sandi ke 123456</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
