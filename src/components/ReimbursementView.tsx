import React, { useState } from 'react';
import { useHRIS } from '../context/HRISContext.tsx';
import { Reimbursement, ReimbursementCategory } from '../types/index.ts';
import { formatRupiah, parseRupiah } from '../utils/rbac.ts';
import {
  ReceiptText,
  PlusCircle,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  X,
  Search,
  Upload,
  AlertCircle,
  FileCheck,
  Building,
  DollarSign,
  Printer,
  PenTool,
} from 'lucide-react';
import { OfficialReimbursementVoucherModal } from './OfficialReimbursementVoucherModal.tsx';

interface ReimbursementViewProps {
  isModalOpen: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
}

const SAMPLE_RECEIPT_PRESETS = [
  {
    name: 'Nota Keyboard Ergonomis (Tokopedia)',
    url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
    amount: 1450000,
    category: 'Office Supplies & Alat Kerja' as ReimbursementCategory,
  },
  {
    name: 'Kuitansi Makan Malam Bisnis Menteng',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    amount: 685000,
    category: 'Makan Klien & Lembur' as ReimbursementCategory,
  },
  {
    name: 'Struk Pengisian BBM & Tol Bandara',
    url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
    amount: 450000,
    category: 'Transportasi & Bensin' as ReimbursementCategory,
  },
  {
    name: 'Faktur Medis Prodia & Resep Kacamata',
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    amount: 2750000,
    category: 'Kesehatan & Medis' as ReimbursementCategory,
  },
];

export const ReimbursementView: React.FC<ReimbursementViewProps> = ({
  isModalOpen,
  onCloseModal,
  onOpenModal,
}) => {
  const {
    currentUser,
    users,
    departments,
    roles,
    reimbursements,
    submitReimbursement,
    deleteReimbursement,
    hasUserPermission,
  } = useHRIS();

  // Form states
  const [category, setCategory] =
    useState<ReimbursementCategory>('Office Supplies & Alat Kerja');
  const [rawAmount, setRawAmount] = useState('1450000');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receiptUrl, setReceiptUrl] = useState(SAMPLE_RECEIPT_PRESETS[0].url);
  const [receiptName, setReceiptName] = useState(
    SAMPLE_RECEIPT_PRESETS[0].name
  );
  const [formError, setFormError] = useState<string | null>(null);

  // Filter states
  const [activeTab, setActiveTab] = useState<'all' | 'mine' | 'pending' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Receipt inspection preview modal and official voucher modal
  const [inspectReceiptItem, setInspectReceiptItem] =
    useState<Reimbursement | null>(null);
  const [selectedForVoucher, setSelectedForVoucher] =
    useState<Reimbursement | null>(null);

  const numericAmount = parseRupiah(rawAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (numericAmount <= 0) {
      setFormError('Nominal klaim wajib diisi dan lebih besar dari Rp 0.');
      return;
    }

    if (!title.trim()) {
      setFormError('Judul pengeluaran klaim wajib diisi.');
      return;
    }

    const res = submitReimbursement({
      category,
      amount: numericAmount,
      title: title.trim(),
      description: description.trim(),
      invoiceNumber: invoiceNumber.trim() || `INV-${Date.now().toString().slice(-6)}`,
      receiptName,
      receiptUrl,
      receiptDate: new Date().toISOString().split('T')[0],
    });

    if (!res.success) {
      setFormError(res.error || 'Gagal mengajukan klaim reimbursement.');
      return;
    }

    // Reset form
    setTitle('');
    setDescription('');
    setInvoiceNumber('');
    onCloseModal();
  };

  // Filter list
  const filteredList = reimbursements.filter((item) => {
    if (activeTab === 'mine' && item.userId !== currentUser.id) return false;
    if (
      activeTab === 'pending' &&
      !(item.status === 'PENDING_MANAGER' || item.status === 'PENDING_FINANCE')
    )
      return false;
    if (activeTab === 'approved' && item.status !== 'APPROVED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const applicant = users.find((u) => u.id === item.userId);
      const matchName = applicant?.name.toLowerCase().includes(q);
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchInvoice = item.invoiceNumber.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchInvoice) return false;
    }

    return true;
  });

  const totalApproved = reimbursements
    .filter((r) => r.status === 'APPROVED')
    .reduce((s, r) => s + r.amount, 0);

  const totalPending = reimbursements
    .filter(
      (r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_FINANCE'
    )
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-indigo-600" />
            Klaim Reimbursement &amp; Pengeluaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Unggah nota kuitansi dan lacak verifikasi keuangan multi-level.
          </p>
        </div>

        {hasUserPermission('create_reimbursement') && (
          <button
            onClick={onOpenModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02] self-start sm:self-auto"
            title="Klaim pengeluaran operasional baru"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Klaim Nota</span>
          </button>
        )}
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase">
            Total Klaim Diajukan
          </span>
          <div className="mt-2 text-2xl font-extrabold text-slate-900">
            {reimbursements.length} Transaksi
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Seluruh departemen</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase">
            Dalam Proses Verifikasi
          </span>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-amber-700">
            {formatRupiah(totalPending)}
          </div>
          <p className="text-[10px] text-amber-600 mt-1">Tahap Manajer &amp; Finance</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase">
            Telah Dicairkan (Approved)
          </span>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-700">
            {formatRupiah(totalApproved)}
          </div>
          <p className="text-[10px] text-emerald-600 mt-1">Ditransfer ke payroll BCA</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex overflow-x-auto no-scrollbar items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Semua ({reimbursements.length})
          </button>
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'mine'
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Klaim Saya ({reimbursements.filter((r) => r.userId === currentUser.id).length})
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Menunggu Review
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Disetujui
          </button>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari klaim / No. Invoice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Reimbursement Container: Mobile Cards (md:hidden) & Desktop Table (hidden md:block) */}
      <div className="space-y-3">
        {/* Mobile View: High-Touch Cards */}
        <div className="md:hidden space-y-3">
          {filteredList.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400">
              <ReceiptText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-medium text-slate-600 dark:text-slate-300 text-xs">
                Tidak ada data klaim reimbursement ditemukan.
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const applicant = users.find((u) => u.id === item.userId);
              const dept = departments.find((d) => d.id === applicant?.departmentId);

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs space-y-3 transition-all"
                >
                  {/* Top Bar: Applicant Info & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={applicant?.avatar}
                        alt={applicant?.name}
                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {applicant?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {dept?.name || 'Umum'} &bull; {new Date(item.createdAt).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Disetujui
                        </span>
                      )}
                      {item.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <X className="w-3 h-3" /> Ditolak
                        </span>
                      )}
                      {item.status === 'PENDING_MANAGER' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                          <Clock className="w-3 h-3" /> Review Manajer
                        </span>
                      )}
                      {item.status === 'PENDING_FINANCE' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
                          <Clock className="w-3 h-3" /> Review Finance
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Info Box: Amount, Invoice, Category */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                        {formatRupiah(item.amount)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px]">
                        {item.category}
                      </span>
                    </div>

                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        {item.invoiceNumber}
                      </div>
                    </div>

                    {/* Receipt thumbnail button */}
                    <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <button
                        onClick={() => setInspectReceiptItem(item)}
                        className="inline-flex items-center gap-1.5 py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium shadow-2xs hover:border-indigo-400"
                      >
                        <img
                          src={item.receiptUrl}
                          alt="Nota"
                          className="w-5 h-5 rounded object-cover"
                        />
                        <span>Lihat Bukti Nota</span>
                      </button>
                      <span className="text-[10px] text-slate-400">Tersedia Kuitansi</span>
                    </div>
                  </div>

                  {/* Bottom Actions Row */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <button
                      onClick={() => setSelectedForVoucher(item)}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Voucher Resmi &amp; Tanda Tangan</span>
                    </button>

                    {(item.userId === currentUser.id ||
                      hasUserPermission('delete_reimbursement')) && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Batalkan dan hapus pengajuan reimbursement ini?'
                            )
                          ) {
                            deleteReimbursement(item.id);
                          }
                        }}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors"
                        title="Hapus Klaim"
                        aria-label="Hapus Klaim"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View (Hidden on mobile) */}
        <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Karyawan &amp; Tanggal</th>
                  <th className="py-3 px-4">Deskripsi &amp; No. Invoice</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Nominal (IDR)</th>
                  <th className="py-3 px-4">Bukti Nota</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <ReceiptText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-600 dark:text-slate-300">
                        Tidak ada data klaim reimbursement ditemukan.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const applicant = users.find((u) => u.id === item.userId);

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={applicant?.avatar}
                              alt={applicant?.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">
                                {applicant?.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {new Date(item.createdAt).toLocaleDateString(
                                  'id-ID'
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">
                            {item.invoiceNumber}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                            {item.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white text-sm">
                          {formatRupiah(item.amount)}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => setInspectReceiptItem(item)}
                            className="flex items-center gap-1.5 p-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-white dark:bg-slate-800 shadow-2xs group transition-all"
                            title="Klik untuk melihat nota kuitansi"
                          >
                            <img
                              src={item.receiptUrl}
                              alt="Nota"
                              className="w-7 h-7 rounded object-cover"
                            />
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 pr-1">
                              Nota
                            </span>
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          {item.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Disetujui Penuh
                            </span>
                          )}
                          {item.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                              <X className="w-3 h-3" /> Ditolak
                            </span>
                          )}
                          {item.status === 'PENDING_MANAGER' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 animate-pulse">
                              <Clock className="w-3 h-3" /> Review Manajer
                            </span>
                          )}
                          {item.status === 'PENDING_FINANCE' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 animate-pulse">
                              <Clock className="w-3 h-3" /> Review Finance
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedForVoucher(item)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 border border-indigo-200 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Pratinjau Voucher Disposisi & Tanda Tangani Dokumen"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              Voucher
                            </button>

                            {(item.userId === currentUser.id ||
                              hasUserPermission('delete_reimbursement')) && (
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      'Batalkan dan hapus pengajuan reimbursement ini?'
                                    )
                                  ) {
                                    deleteReimbursement(item.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Hapus Klaim"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Reimbursement Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-indigo-400" />
                  Form Klaim Pengeluaran Reimbursement
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Lampirkan nota resmi untuk diproses bertahap ke divisi keuangan.
                </p>
              </div>
              <button
                onClick={onCloseModal}
                className="text-slate-400 hover:text-white p-1"
                aria-label="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Kategori */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kategori Pengeluaran
                </label>
                <select
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as ReimbursementCategory)
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                >
                  <option value="Office Supplies & Alat Kerja">
                    Office Supplies &amp; Alat Kerja
                  </option>
                  <option value="Kesehatan & Medis">Kesehatan &amp; Medis</option>
                  <option value="Makan Klien & Lembur">
                    Makan Klien &amp; Lembur
                  </option>
                  <option value="Transportasi & Bensin">
                    Transportasi &amp; Bensin
                  </option>
                  <option value="Pelatihan & Sertifikasi">
                    Pelatihan &amp; Sertifikasi
                  </option>
                </select>
              </div>

              {/* Nominal Rupiah Input (Auto formatted) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nominal Pengeluaran (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={rawAmount ? Number(rawAmount).toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                      const num = parseRupiah(e.target.value);
                      setRawAmount(num ? num.toString() : '');
                    }}
                    placeholder="0"
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Terbilang:{' '}
                  <span className="font-semibold text-indigo-700">
                    {formatRupiah(numericAmount)}
                  </span>
                </p>
              </div>

              {/* Judul & Invoice */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Judul Pengeluaran
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Keyboard ergonomis..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nomor Struk / Invoice
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: INV-2026/8849"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Keterangan Keperluan
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan rincian barang/layanan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
              </div>

              {/* Receipt Picker (Preset simulator with instant thumbnail) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lampiran Bukti Struk / Nota (Upload Simulator)
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {SAMPLE_RECEIPT_PRESETS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setReceiptUrl(preset.url);
                        setReceiptName(preset.name);
                        setRawAmount(preset.amount.toString());
                        setCategory(preset.category);
                        setTitle(preset.name);
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        receiptUrl === preset.url
                          ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-8 h-8 rounded-lg object-cover shrink-0"
                      />
                      <div className="truncate">
                        <span className="text-[11px] font-bold block truncate text-slate-800">
                          {preset.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatRupiah(preset.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onCloseModal}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.01]"
                >
                  Kirim Klaim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Magnified Receipt Inspection Modal */}
      {inspectReceiptItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  Pemeriksaan Nota Kuitansi Asli
                </h4>
                <p className="text-xs text-slate-400">
                  {inspectReceiptItem.invoiceNumber} &bull;{' '}
                  {formatRupiah(inspectReceiptItem.amount)}
                </p>
              </div>
              <button
                onClick={() => setInspectReceiptItem(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-80">
                <img
                  src={inspectReceiptItem.receiptUrl}
                  alt={inspectReceiptItem.title}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Judul Pengeluaran:</span>
                  <span className="font-bold text-slate-900">
                    {inspectReceiptItem.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Kategori:</span>
                  <span className="font-bold text-slate-900">
                    {inspectReceiptItem.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Nominal Valid:</span>
                  <span className="font-extrabold text-emerald-700 text-sm">
                    {formatRupiah(inspectReceiptItem.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-500">Deskripsi:</span>
                  <span className="text-slate-800 text-right max-w-xs">
                    {inspectReceiptItem.description || '-'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const item = inspectReceiptItem;
                    setInspectReceiptItem(null);
                    setSelectedForVoucher(item);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Buka Voucher &amp; Tanda Tangani
                </button>
                <button
                  onClick={() => setInspectReceiptItem(null)}
                  className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Reimbursement Voucher Modal */}
      {selectedForVoucher && (
        <OfficialReimbursementVoucherModal
          isOpen={true}
          onClose={() => setSelectedForVoucher(null)}
          reimbursement={selectedForVoucher}
          applicant={users.find((u) => u.id === selectedForVoucher.userId)}
          department={departments.find(
            (d) =>
              d.id ===
              users.find((u) => u.id === selectedForVoucher.userId)?.departmentId
          )}
          role={roles.find(
            (r) =>
              r.id ===
              users.find((u) => u.id === selectedForVoucher.userId)?.roleId
          )}
        />
      )}
    </div>
  );
};
