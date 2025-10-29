"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MembershipSummary from "@/components/MembershipSummary";
import { IconStar } from "@/components/icons";

export default function ProfilePage() {
  const router = useRouter();
  const API = "";
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      try {
        const res = await fetch(`/api/member/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        if (res.status === 401) { router.push('/login'); return; }
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || 'Failed to load profile');
        setMe(json);
      } catch (e: any) {
        // Abaikan error yang berasal dari abort
        const msg = String(e?.message || '').toLowerCase();
        if (e?.name === 'AbortError' || e?.code === 20 || msg.includes('abort')) {
          return;
        }
        setError(e.message || 'Something went wrong');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    run();
    return () => { try { controller.abort(); } catch {} };
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-600 text-center">
        <svg className="w-12 h-12 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <p>Error loading profile: {error}</p>
      </div>
    </div>
  );

  const memberSince = (() => {
    const dateStr = me?.member?.createdAt || me?.user?.createdAt;
    try { return dateStr ? new Date(dateStr).toLocaleDateString() : "-"; } catch { return "-"; }
  })();

  return (
    <div className="min-h-screen bg-white">
      {/* Using global Navbar from layout */}
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <h1 className="text-2xl font-semibold text-[#0F4D39]">Profile</h1>



        {/* Profile Header Card */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl font-bold mb-2">{me?.user?.fullName || 'Member'}</h1>
              <p className="text-blue-100 mb-1">{me?.user?.email || 'Tidak tersedia'}</p>
              <p className="text-blue-100 mb-3">{me?.user?.phone || 'Tidak tersedia'}</p>
              <div className="inline-flex items-center bg-white/20 rounded-full px-3 py-1 text-sm backdrop-blur-sm">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Bergabung {memberSince}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <IconStar aria-hidden="true" className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{me?.member?.pointsBalance ?? 0}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Total Poin</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Poin yang dapat ditukar dengan reward menarik</p>
            <Link 
              href="/redeem-points" 
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center group"
            >
              Redeem Points
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <IconStar aria-hidden="true" className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{me?.user?.role || 'Regular'}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Level Member</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Status keanggotaan dan benefit eksklusif</p>
            <Link 
              href="/exclusive-member" 
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center group"
            >
              Exclusive Member
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <IconStar aria-hidden="true" className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{me?.member?.activeVouchers ?? 0}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Active Vouchers</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">Voucher aktif yang dapat digunakan</p>
            <Link 
              href="/my-vouchers" 
              className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center group"
            >
              Lihat Voucher
              <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Quick Actions Menu */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Menu Cepat</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/profile/edit" 
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Edit Profil</span>
            </Link>

            <Link 
              href="/my-activities" 
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-3 group-hover:bg-green-200 dark:group-hover:bg-green-800 transition-colors">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Aktivitas</span>
            </Link>

            <Link 
              href="/rewards" 
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center mb-3 group-hover:bg-yellow-200 dark:group-hover:bg-yellow-800 transition-colors">
                <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Rewards</span>
            </Link>

            <Link 
              href="/settings" 
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-3 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Pengaturan</span>
            </Link>
          </div>
        </div>

        {/* Member Card section */}
        <div className="rounded-xl bg-white border border-gray-200 shadow p-6">
          <h2 className="text-xl font-semibold text-[#0F4D39] mb-4">Kartu Member</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 text-gray-700 dark:text-gray-200">
              <div>
                <span className="text-sm text-gray-500">ID Member</span>
                <div className="font-mono break-all">{me?.member?.membershipNumber ?? me?.member?.id ?? '-'}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">Nama Member</span>
                <div className="font-medium">{me?.member?.fullName ?? me?.user?.fullName ?? '-'}</div>
              </div>
              <div>
                <span className="text-sm text-gray-500">No HP</span>
                <div className="font-medium">{me?.member?.phone ?? me?.user?.phone ?? '-'}</div>
              </div>
            </div>
            <div className="flex items-center md:items-start justify-center md:justify-end">
              {me?.member?.membershipCardUrl ? (
                <a
                  href={me.member.membershipCardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="px-4 py-2 rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F4D39]"
                >
                  Download Kartu Member (PDF)
                </a>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-300">Kartu member belum tersedia. Silakan login ulang agar sistem membuat kartu otomatis.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}