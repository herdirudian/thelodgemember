"use client";
import Link from 'next/link';

export default function ServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F4D39]">Services</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Informasi layanan dan fitur yang tersedia untuk anggota The Lodge Family.</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link prefetch={false} href="/dashboard" className="px-3 py-2 rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition">Dashboard</Link>
            <Link prefetch={false} href="/redeem-points" className="px-3 py-2 rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition">Redeem Points</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-4">
            <h2 className="text-lg font-semibold text-[#0F4D39] mb-2">Member Services</h2>
            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
              <li>Informasi Membership & Poin</li>
              <li>Redeem Points & Rewards</li>
              <li>Exclusive Member Events</li>
              <li>Voucher & Tiket</li>
            </ul>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-4">
            <h2 className="text-lg font-semibold text-[#0F4D39] mb-2">Support</h2>
            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
              <li>Bantuan akun & login</li>
              <li>Panduan penggunaan aplikasi</li>
              <li>Kontak layanan pelanggan</li>
            </ul>
          </div>
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-4">
            <h2 className="text-lg font-semibold text-[#0F4D39] mb-2">Admin Services</h2>
            <ul className="text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
              <li>Manajemen Members & Poin</li>
              <li>Promos & Penawaran</li>
              <li>Vouchers & Aktivitas</li>
              <li>Admin Management</li>
            </ul>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow p-4">
          <h2 className="text-lg font-semibold text-[#0F4D39] mb-2">Status</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300">Halaman Services tersedia. Jika sebelumnya kamu melihat pesan "Service Unavailable", kemungkinan halaman ini belum dibuat atau terjadi gangguan server. Saat ini halaman sudah aktif.</p>
        </div>
      </div>
    </div>
  );
}