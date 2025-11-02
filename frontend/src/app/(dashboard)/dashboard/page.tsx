"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import QRCodeWidget from '@/components/QRCodeWidget';
import AdminMessages from '@/components/AdminMessages';

export default function DashboardPage() {
  const router = useRouter();
  const API = '';
  const [me, setMe] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [promos, setPromos] = useState<any[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<any | null>(null);
  const [sliderImages, setSliderImages] = useState<any[]>([]);
  const [sliderIndex, setSliderIndex] = useState(0);
  const [sliderPreviewOpen, setSliderPreviewOpen] = useState(false);
  const [sliderPreviewItem, setSliderPreviewItem] = useState<any | null>(null);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const [spending30d, setSpending30d] = useState(0);
  const [activeVouchers, setActiveVouchers] = useState(0);
  // NEW: tren pengeluaran 7 hari
  const [spendingTrend7d, setSpendingTrend7d] = useState<number[]>([]);
  // NEW: aktivitas & filter
  const [activities, setActivities] = useState<Array<{ type: string; title: string; detail?: string; createdAt: string }>>([]);
  const [activityRange, setActivityRange] = useState<'TODAY'|'7D'|'30D'>('7D');
  const loginAddedRef = useRef(false);
  // NEW: notifikasi penting
  const [notifications, setNotifications] = useState<Array<{ type: string; title: string; description?: string; createdAt?: string }>>([]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      try {
        setLoadingPromos(true);
        setPromoError(null);
        const [meRes, annRes, promosRes, sliderRes, eventsRes, ticketsRes, pointsRes] = await Promise.all([
          fetch(`/api/member/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        fetch(`/api/member/announcements`, { signal: controller.signal }),
        fetch(`/api/member/promos`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        fetch(`/api/member/slider-images`, { signal: controller.signal }),
        fetch(`/api/member/events`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        fetch(`/api/member/tickets/my`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        fetch(`/api/member/points/my`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        ]);
        const meJson = await meRes.json();
        const annJson = await annRes.json();
        const promosJson = await promosRes.json();
        const sliderJson = await sliderRes.json();
        const eventsJson = await eventsRes.json();
        const ticketsJson = await ticketsRes.json();
        const pointsJson = await pointsRes.json();
        if (meRes.status === 401) { router.push('/login'); return; }
        if (!meRes.ok) throw new Error(meJson.message || 'Failed to load profile');
        if (!annRes.ok) throw new Error(annJson.message || 'Failed to load announcements');
        if (!promosRes.ok) { setPromoError(promosJson.message || 'Failed to load promos'); } else { setPromoError(null); }
        if (!sliderRes.ok) throw new Error(sliderJson.message || 'Failed to load slider');
        setMe(meJson);
        setAnnouncements(annJson);
        const list = Array.isArray(promosJson?.activePromos) ? promosJson.activePromos : (Array.isArray(promosJson) ? promosJson : []);
        setPromos(list);
        setSliderImages(Array.isArray(sliderJson) ? sliderJson : []);
        setSliderIndex(0);
        // Hitung KPI Member
        try {
          const now = new Date();
          const eventsArr = Array.isArray(eventsJson?.events) ? eventsJson.events : [];
          const upcoming = eventsArr.filter((ev: any) => {
            try {
              const myReg = ev?.myRegistration;
              const eventDate = ev?.eventDate ? new Date(ev.eventDate) : null;
              return myReg && String(myReg.status).toUpperCase() === 'REGISTERED' && !myReg.redeemedAt && eventDate && eventDate >= now;
            } catch { return false; }
          }).length;
          setUpcomingBookings(upcoming);
          const ticketsArr = Array.isArray(ticketsJson?.tickets) ? ticketsJson.tickets : [];
          const activeTickets = ticketsArr.filter((t: any) => {
            try {
              const validDate = t?.validDate ? new Date(t.validDate) : null;
              return String(t?.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && !t?.redeemedAt && validDate && validDate >= now;
            } catch { return false; }
          }).length;
          const redArr = Array.isArray(pointsJson?.redemptions) ? pointsJson.redemptions : [];
          const activePointVouchers = redArr.filter((r: any) => String(r?.status || 'ACTIVE').toUpperCase() === 'ACTIVE' && !r?.redeemedAt).length;
          const start30 = new Date(); start30.setDate(start30.getDate() - 30);
          const spendSum = redArr.reduce((sum: number, r: any) => {
            try {
              const created = r?.createdAt ? new Date(r.createdAt) : null;
              const used = Number(r?.pointsUsed || 0);
              return created && created >= start30 ? sum + used : sum;
            } catch { return sum; }
          }, 0);
          setSpending30d(spendSum);
          // NEW: hitung tren pengeluaran 7 hari (terbaru di kanan)
          try {
            const days = 7;
            const arr7 = Array(days).fill(0);
            const today = new Date();
            for (const r of redArr) {
              const created = r?.createdAt ? new Date(r.createdAt) : null;
              if (!created) continue;
              const used = Number(r?.pointsUsed || 0);
              const diffDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
              if (diffDays >= 0 && diffDays < days) {
                // indeks 0 = paling lama, indeks 6 = hari ini
                arr7[days - 1 - diffDays] += used;
              }
            }
            setSpendingTrend7d(arr7);
          } catch {}
          // Voucher aktif tidak termasuk booking event
          setActiveVouchers(activeTickets + activePointVouchers);
        } catch {}
        // NEW: Susun feed aktivitas
        try {
          const acts: Array<{ type: string; title: string; detail?: string; createdAt: string }> = [];
          const now = new Date();
          // 1) Login (sekali pada sesi)
          if (!loginAddedRef.current) {
            acts.push({ type: 'LOGIN', title: 'Login berhasil', detail: `Selamat datang ${meJson?.user?.email || ''}`.trim(), createdAt: now.toISOString() });
            loginAddedRef.current = true;
          }
          // 2) Redeem voucher poin
          const redArr = Array.isArray(pointsJson?.redemptions) ? pointsJson.redemptions : [];
          for (const r of redArr) {
            acts.push({ type: 'REDEEM', title: `Redeem poin: ${r.rewardName || 'Voucher'}`, detail: `${r.pointsUsed || 0} poin`, createdAt: r.createdAt });
          }
          // 3) Booking/cancel event
          const eventsArr = Array.isArray(eventsJson?.events) ? eventsJson.events : [];
          for (const ev of eventsArr) {
            const reg = ev?.myRegistration;
            if (!reg) continue;
            if (String(reg.status || '').toUpperCase() === 'REGISTERED') {
              acts.push({ type: 'BOOK', title: `Booking: ${ev.title || 'Event'}`, detail: ev.eventDate ? new Date(ev.eventDate).toLocaleString('id-ID') : undefined, createdAt: reg.createdAt });
            }
            if (String(reg.status || '').toUpperCase() === 'CANCELLED') {
              acts.push({ type: 'CANCEL', title: `Cancel booking: ${ev.title || 'Event'}`, detail: ev.eventDate ? new Date(ev.eventDate).toLocaleString('id-ID') : undefined, createdAt: reg.updatedAt || reg.createdAt });
            }
          }
          // 4) Perubahan profil (gunakan updatedAt user/member jika ada)
          const userUpdated = meJson?.user?.updatedAt;
          const memberUpdated = meJson?.member?.updatedAt;
          if (memberUpdated && memberUpdated !== meJson?.member?.createdAt) {
            acts.push({ type: 'PROFILE', title: 'Perubahan profil member', createdAt: memberUpdated });
          } else if (userUpdated && userUpdated !== meJson?.user?.createdAt) {
            acts.push({ type: 'PROFILE', title: 'Perubahan profil akun', createdAt: userUpdated });
          }
          // Sort desc by time
          acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setActivities(acts);
        } catch {}
        // NEW: Notifikasi penting
        try {
          const notifs: Array<{ type: string; title: string; description?: string; createdAt?: string }> = [];
          const now = new Date();
          // Voucher akan habis (tiket & voucher poin)
          const ticketsArr = Array.isArray(ticketsJson?.tickets) ? ticketsJson.tickets : [];
          for (const t of ticketsArr) {
            const valid = t?.validDate ? new Date(t.validDate) : null;
            if (valid) {
              const days = Math.ceil((valid.getTime() - now.getTime()) / (1000*60*60*24));
              if (days >= 0 && days <= 3 && !t?.redeemedAt) {
                notifs.push({ type: 'EXPIRY', title: `Tiket akan habis dalam ${days} hari`, description: t.name || 'Tiket', createdAt: t.updatedAt || t.createdAt });
              }
            }
          }
          const redArr = Array.isArray(pointsJson?.redemptions) ? pointsJson.redemptions : [];
          for (const r of redArr) {
            const valid = r?.validUntil ? new Date(r.validUntil) : null;
            if (valid) {
              const days = Math.ceil((valid.getTime() - now.getTime()) / (1000*60*60*24));
              if (days >= 0 && days <= 3 && !r?.redeemedAt) {
                notifs.push({ type: 'EXPIRY', title: `Voucher poin akan habis dalam ${days} hari`, description: r.rewardName || 'Voucher', createdAt: r.updatedAt || r.createdAt });
              }
            }
          }
          // Pembayaran tertunda (misalnya event reg memiliki paymentStatus)
          const eventsArr = Array.isArray(eventsJson?.events) ? eventsJson.events : [];
          for (const ev of eventsArr) {
            const reg = ev?.myRegistration;
            if (reg && String(reg.status || '').toUpperCase() === 'REGISTERED') {
              const pay = String(reg.paymentStatus || '').toUpperCase();
              if (pay === 'PENDING' || pay === 'UNPAID') {
                notifs.push({ type: 'PAYMENT', title: 'Pembayaran tertunda untuk event', description: ev.title || 'Event', createdAt: reg.updatedAt || reg.createdAt });
              }
            }
            // Perubahan jadwal
            const updated = ev?.updatedAt;
            if (updated && ev?.eventDate) {
              const upd = new Date(updated);
              const days = Math.ceil((now.getTime() - upd.getTime()) / (1000*60*60*24));
              if (days >= 0 && days <= 7) {
                notifs.push({ type: 'SCHEDULE', title: 'Perubahan jadwal event', description: `${ev.title || 'Event'} → ${new Date(ev.eventDate).toLocaleString('id-ID')}` });
              }
            }
          }
          // Sort desc
          notifs.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
          
          // Jika tidak ada notifikasi penting, tambahkan notifikasi informasi umum
          if (notifs.length === 0) {
            notifs.push({
              type: 'INFO',
              title: 'Selamat datang di The Lodge Family!',
              description: 'Sistem notifikasi aktif dan akan memberitahu Anda tentang voucher yang akan habis, pembayaran tertunda, dan update penting lainnya.',
              createdAt: new Date().toISOString()
            });
          }
          
          setNotifications(notifs);
        } catch {}
      } catch (err: any) {
        const msg = String(err?.message || '').toLowerCase();
        if (err?.name === 'AbortError' || err?.code === 20 || msg.includes('abort')) {
          return;
        }
        if (process.env.NODE_ENV !== 'production') console.debug(err);
        setPromoError('Gagal memuat promo. Coba lagi nanti.');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingPromos(false);
        }
      }
    };
    run();
    return () => { try { controller.abort(); } catch {} };
  }, [router]);

  if (loading) return <div className="p-6 min-h-screen bg-white">Loading...</div>;

  const memberSince = (() => {
    const dateStr = me?.member?.createdAt || me?.user?.createdAt;
    try { return dateStr ? new Date(dateStr).toLocaleDateString() : '-'; } catch { return '-'; }
  })();

  function typeBadge(type: string) {
    const map: Record<string, string> = {
      INFORMATION: 'bg-gray-200 text-gray-800',
      EXCLUSIVE_MEMBER: 'bg-emerald-700 text-white',
      EVENT: 'bg-blue-600 text-white',
      FREE_BENEFIT_NEW_REG: 'bg-yellow-500 text-white',
      REDEEM_POINTS: 'bg-amber-600 text-white',
    };
    const labelMap: Record<string, string> = {
      INFORMATION: 'Pengumuman',
      EXCLUSIVE_MEMBER: 'Member Exclusive',
      EVENT: 'Event',
      FREE_BENEFIT_NEW_REG: 'Benefit New Member',
      REDEEM_POINTS: 'Redeem Points',
    };
    return <span className={`px-2 py-1 rounded text-xs ${map[type] || 'bg-gray-200 text-gray-800'}`}>{labelMap[type] || type}</span>;
  }

  function daysLeft(endDate?: string) {
    if (!endDate) return null;
    try {
      const end = new Date(endDate);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } catch { return null; }
  }

  // Helper: tanggal ulang tahun berikutnya untuk member
  function getNextBirthday(dobStr?: string): Date | null {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const next = new Date(currentYear, dob.getMonth(), dob.getDate());
    // jika sudah lewat tahun ini, gunakan tahun depan
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (next < todayStart) {
      next.setFullYear(currentYear + 1);
    }
    return next;
  }

  // Helper: hitung selisih hari dari hari ini ke target
  function daysUntil(date: Date | null): number {
    if (!date) return Infinity;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return Math.floor((target - startOfToday) / msPerDay);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo untuk mobile */}
            <div className="block lg:hidden flex-shrink-0">
              <Image
                src="/The Lodge Maribaya Logo.svg"
                alt="The Lodge Maribaya"
                width={80}
                height={20}
                className="h-5 w-auto"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-2xl font-semibold text-[#0F4D39] truncate">{`Welcome back${me?.user?.fullName ? ", " + me.user.fullName : "!"}`}</h1>
              <p className="text-sm text-gray-600 truncate">{me?.member?.fullName ?? me?.user?.fullName ?? ''}</p>
            </div>
          </div>

        </div>

        {/* Enhanced KPI Cards Member Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Komponen enhanced KPI dengan level system */}
          {(() => {
            // Member Level Logic
            const points = me?.member?.pointsBalance ?? 0;
            const getMemberLevel = (points: number) => {
              if (points >= 5000) return { level: 'Platinum', color: 'from-purple-500 to-purple-700', icon: '💎', progress: 100, nextLevel: null, pointsNeeded: 0 };
              if (points >= 2500) return { level: 'Gold', color: 'from-yellow-500 to-yellow-600', icon: '🏆', progress: ((points - 2500) / 2500) * 100, nextLevel: 'Platinum', pointsNeeded: 5000 - points };
              if (points >= 1000) return { level: 'Silver', color: 'from-gray-400 to-gray-500', icon: '🥈', progress: ((points - 1000) / 1500) * 100, nextLevel: 'Gold', pointsNeeded: 2500 - points };
              return { level: 'Bronze', color: 'from-orange-400 to-orange-500', icon: '🥉', progress: (points / 1000) * 100, nextLevel: 'Silver', pointsNeeded: 1000 - points };
            };

            const memberLevel = getMemberLevel(points);
            const isLifetime = me?.member?.isLifetime;

            const EnhancedKPICard = ({ 
              label, 
              value, 
              icon, 
              gradient, 
              subtitle, 
              trend,
              onClick 
            }: { 
              label: string; 
              value: number | string; 
              icon: string; 
              gradient: string; 
              subtitle?: string; 
              trend?: 'up' | 'down' | 'stable';
              onClick?: () => void;
            }) => (
              <div 
                className={`rounded-2xl border border-gray-200 bg-gradient-to-br ${gradient} shadow-lg p-4 transform transition-all duration-300 hover:scale-105 hover:shadow-xl ${onClick ? 'cursor-pointer' : ''}`}
                onClick={onClick}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{icon}</span>
                  {trend && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      trend === 'up' ? 'bg-green-100 text-green-800' : 
                      trend === 'down' ? 'bg-red-100 text-red-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {trend === 'up' ? '↗️' : trend === 'down' ? '↘️' : '→'}
                    </span>
                  )}
                </div>
                <div className="text-white">
                  <div className="text-sm opacity-90">{label}</div>
                  <div className="text-2xl font-bold mt-1">{value}</div>
                  {subtitle && <div className="text-xs opacity-75 mt-1">{subtitle}</div>}
                </div>
              </div>
            );

            return (
              <>
                {/* Member Level Card */}
                <EnhancedKPICard 
                  label={`Level ${memberLevel.level}`}
                  value={points.toLocaleString('id-ID')}
                  icon={memberLevel.icon}
                  gradient={`${memberLevel.color} text-white`}
                  subtitle={isLifetime ? "Lifetime Member ⭐" : memberLevel.nextLevel ? `${memberLevel.pointsNeeded} poin ke ${memberLevel.nextLevel}` : "Max Level!"}
                  trend="up"
                  onClick={() => window.location.href = '/profile'}
                />

                {/* Active Vouchers Card */}
                <EnhancedKPICard 
                  label="Voucher Aktif"
                  value={activeVouchers}
                  icon="🎫"
                  gradient="from-emerald-500 to-emerald-700 text-white"
                  subtitle={activeVouchers > 0 ? "Siap digunakan" : "Belum ada voucher"}
                  trend={activeVouchers > 0 ? "stable" : undefined}
                  onClick={() => window.location.href = '/my-ticket'}
                />

                {/* Upcoming Bookings Card */}
                <EnhancedKPICard 
                  label="Event Mendatang"
                  value={upcomingBookings}
                  icon="📅"
                  gradient="from-blue-500 to-blue-700 text-white"
                  subtitle={upcomingBookings > 0 ? "Jangan sampai terlewat!" : "Belum ada booking"}
                  trend={upcomingBookings > 0 ? "up" : undefined}
                />

                {/* Spending Trend Card */}
                <EnhancedKPICard 
                  label="Pengeluaran 30 Hari"
                  value={`${spending30d} poin`}
                  icon="💰"
                  gradient="from-purple-500 to-purple-700 text-white"
                  subtitle={spending30d > 0 ? "Tetap aktif!" : "Belum ada aktivitas"}
                  trend={spending30d > 100 ? "up" : spending30d > 0 ? "stable" : undefined}
                />
              </>
            );
          })()}
        </div>

        {/* Admin Messages */}
        <AdminMessages className="mb-6" />

        {/* WhatsApp Verification Notification */}
        {me?.member && !me.member.isPhoneVerified && (
          <div data-verification-notification className="rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 shadow-sm p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📱</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">
                  Verifikasi Nomor WhatsApp Anda
                </h3>
                <p className="text-sm text-orange-700 mb-4">
                  Untuk keamanan akun dan mendapatkan notifikasi penting, silakan verifikasi nomor WhatsApp Anda.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link 
                    href="/profile/edit"
                    className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <span className="mr-2">📲</span>
                    Verifikasi Sekarang
                  </Link>
                  <button 
                    onClick={() => {
                      // Hide notification temporarily (could be stored in localStorage)
                      const notification = document.querySelector('[data-verification-notification]');
                      if (notification) {
                        (notification as HTMLElement).style.display = 'none';
                      }
                    }}
                    className="inline-flex items-center px-4 py-2 bg-white hover:bg-gray-50 text-orange-600 text-sm font-medium rounded-lg border border-orange-200 transition-colors duration-200"
                  >
                    Nanti Saja
                  </button>
                </div>
              </div>
              <button 
                onClick={() => {
                  const notification = document.querySelector('[data-verification-notification]');
                  if (notification) {
                    (notification as HTMLElement).style.display = 'none';
                  }
                }}
                className="flex-shrink-0 p-1 text-orange-400 hover:text-orange-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar untuk Level Berikutnya */}
        {(() => {
          const points = me?.member?.pointsBalance ?? 0;
          const getMemberLevel = (points: number) => {
            if (points >= 5000) return { level: 'Platinum', progress: 100, nextLevel: null, pointsNeeded: 0, currentPoints: points, levelStart: 5000 };
            if (points >= 2500) return { level: 'Gold', progress: ((points - 2500) / 2500) * 100, nextLevel: 'Platinum', pointsNeeded: 5000 - points, currentPoints: points - 2500, levelStart: 0 };
            if (points >= 1000) return { level: 'Silver', progress: ((points - 1000) / 1500) * 100, nextLevel: 'Gold', pointsNeeded: 2500 - points, currentPoints: points - 1000, levelStart: 0 };
            return { level: 'Bronze', progress: (points / 1000) * 100, nextLevel: 'Silver', pointsNeeded: 1000 - points, currentPoints: points, levelStart: 0 };
          };

          const levelInfo = getMemberLevel(points);
          
          if (levelInfo.nextLevel) {
            return (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-[#0F4D39]">🎮 Progress ke Level {levelInfo.nextLevel}</h3>
                  <span className="text-sm text-gray-500">{Math.round(levelInfo.progress)}%</span>
                </div>
                
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                      className="bg-gradient-to-r from-[#0F4D39] to-emerald-500 h-4 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                      style={{ width: `${Math.min(levelInfo.progress, 100)}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{levelInfo.currentPoints.toLocaleString('id-ID')} poin</span>
                    <span>{levelInfo.pointsNeeded.toLocaleString('id-ID')} poin lagi</span>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-lg">
                  <div className="text-sm font-medium text-[#0F4D39]">
                    🏆 Benefit Level {levelInfo.nextLevel}:
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {levelInfo.nextLevel === 'Silver' && "Diskon 5% + Priority support"}
                    {levelInfo.nextLevel === 'Gold' && "Diskon 10% + Early access events"}
                    {levelInfo.nextLevel === 'Platinum' && "Diskon 15% + VIP treatment + Exclusive events"}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Slider Section */}
        {sliderImages.length > 0 && (
          <div className="rounded-lg border border-slate-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-semibold text-[#0F4D39]">Highlights</div>
              <div className="flex gap-2">
                <button onClick={() => setSliderIndex((prev) => (prev - 1 + sliderImages.length) % sliderImages.length)} className="px-3 py-1 rounded bg-slate-200">Prev</button>
                <button onClick={() => setSliderIndex((prev) => (prev + 1) % sliderImages.length)} className="px-3 py-1 rounded bg-slate-200">Next</button>
              </div>
            </div>
            <div className="relative">
              <div
                className="aspect-[16/9] bg-slate-100 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => { setSliderPreviewItem(sliderImages[sliderIndex]); setSliderPreviewOpen(true); }}
                title="Klik untuk lihat selengkapnya"
              >
                <img
                  src={sliderImages[sliderIndex].imageUrl || '/file.svg'}
                  alt={sliderImages[sliderIndex].title || 'Slider'}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/file.svg'; }}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
              {sliderImages[sliderIndex].title && (
                <div className="mt-2 text-sm text-slate-700">{sliderImages[sliderIndex].title}</div>
              )}
              <div className="mt-2 flex items-center gap-1">
                {sliderImages.map((_, i) => (
                  <button key={i} onClick={() => setSliderIndex(i)} className={`w-2 h-2 rounded-full ${i === sliderIndex ? 'bg-[#0F4D39]' : 'bg-slate-300'}`}></button>
                ))}
              </div>
            </div>
          </div>
        )}

        {sliderPreviewOpen && sliderPreviewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSliderPreviewOpen(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full border border-slate-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-3 border-b border-slate-200">
                <div className="text-sm font-semibold text-[#0F4D39]">Preview Foto</div>
                <button onClick={() => setSliderPreviewOpen(false)} className="px-2 py-1 rounded bg-slate-200">Tutup</button>
              </div>
              <div className="p-3">
                <div className="aspect-[16/9] bg-slate-100 rounded-lg overflow-hidden">
                  <img src={sliderPreviewItem.imageUrl || '/file.svg'} alt={sliderPreviewItem.title || 'Slider'} className="w-full h-full object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/file.svg'; }} />
                </div>
                {sliderPreviewItem.title && (
                  <div className="mt-2 text-sm text-slate-700">{sliderPreviewItem.title}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ringkasan Membership dipindahkan ke panel konsisten */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-xl bg-white border border-gray-200 shadow p-4">
            <h2 className="text-lg font-semibold text-[#0F4D39] mb-3">Information & Updates</h2>
            <div className="divide-y divide-gray-200">
              {announcements.map((a) => (
                <div key={a.id} className="py-3 hover:bg-gray-50 transition-colors">
                  <div className="font-medium text-[#0F4D39]">{a.title}</div>
                  <div className="text-sm text-gray-600">{a.shortDescription}</div>
                  <div className="text-xs text-gray-500">{a.postedAt ? new Date(a.postedAt).toLocaleString() : '-'}</div>
                </div>
              ))}
              {announcements.length === 0 && (
                <div className="py-6 text-sm text-gray-600">No announcements yet.</div>
              )}
            </div>
          </div>

          {/* Sidebar dengan QR Code Widget dan Quick Actions */}
          <div className="space-y-4">
            {/* QR Code Widget */}
            <QRCodeWidget 
              memberData={{
                id: me?.member?.id || me?.user?.id,
                fullName: me?.member?.fullName || me?.user?.fullName,
                membershipNumber: me?.member?.membershipNumber,
                pointsBalance: me?.member?.pointsBalance,
                level: (() => {
                  const points = me?.member?.pointsBalance ?? 0;
                  if (points >= 5000) return 'Platinum';
                  if (points >= 2500) return 'Gold';
                  if (points >= 1000) return 'Silver';
                  return 'Bronze';
                })(),
                isLifetime: me?.member?.isLifetime
              }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
          <h2 className="text-lg font-semibold text-[#0F4D39] mb-3">Promo & Penawaran Spesial</h2>
          {promoError && (
            <div className="py-4 text-sm text-red-600">{promoError}</div>
          )}
          {loadingPromos ? (
            <div className="py-6 text-sm text-gray-600">Memuat promo...</div>
          ) : promos.length === 0 ? (
            <div className="py-6 text-sm text-gray-600">Belum ada promo aktif saat ini.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(
                // Filter: tampilkan BIRTHDAY_GIFT hanya jika ulang tahun akan datang (≤7 hari),
                // promo aktif sekarang, dan (jika ada) tanggal ulang tahun berada dalam periode promo
                promos.filter((p: any) => {
                  if (p.type === 'BIRTHDAY_GIFT') {
                    const nextBday = getNextBirthday(me?.member?.dateOfBirth);
                    const d = daysUntil(nextBday);
                    const start = p.startDate ? new Date(p.startDate) : null;
                    const end = p.endDate ? new Date(p.endDate) : null;
                    const withinPeriod = nextBday && start && end ? (nextBday >= start && nextBday <= end) : true;
                    const promoActiveNow = (!start || start <= new Date()) && (!end || end >= new Date());
                    return d >= 0 && d <= 7 && promoActiveNow && withinPeriod;
                  }
                  return true;
                })
              ).map((p) => {
                const start = p.startDate ? new Date(p.startDate) : null;
                const end = p.endDate ? new Date(p.endDate) : null;
                const dl = daysLeft(p.endDate);
                const soon = dl !== null && dl <= 3 && dl >= 0;
                const descShort = String(p.description || '').slice(0, 150);
                return (
                  <button key={p.id} onClick={() => setSelectedPromo(p)} className="text-left rounded-xl border border-gray-200 bg-white shadow p-3 transform transition-transform hover:scale-[1.01]">
                    <img src={p.imageUrl || '/file.svg'} alt={p.title} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/file.svg'; }} className="w-full h-40 object-cover rounded-lg mb-2 bg-gray-100" />
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[#0F4D39]">{p.title}</div>
                      {typeBadge(p.type)}
                    </div>
                    <div className="text-sm text-gray-600">{descShort}{String(p.description || '').length > 150 ? '...' : ''}</div>
                    <div className="mt-2 text-xs text-gray-500">Berlaku sampai {end ? end.toLocaleDateString('id-ID') : ''}</div>
                    {soon && <div className="mt-1 inline-block px-2 py-1 rounded bg-orange-500 text-white text-xs">Segera Berakhir</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedPromo && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="promo-title">
            <div className="w-full max-w-2xl rounded-xl bg-white border border-gray-200 shadow-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div id="promo-title" className="text-lg font-semibold text-[#0F4D39]">{selectedPromo.title}</div>
                <button onClick={() => setSelectedPromo(null)} className="text-gray-600 hover:text-gray-900" aria-label="Tutup dialog promo">✖</button>
              </div>
              <img src={selectedPromo.imageUrl || '/file.svg'} alt={selectedPromo.title} onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/file.svg'; }} className="w-full h-60 object-cover rounded-lg mb-3 bg-gray-100" />
              <div className="mb-2">{typeBadge(selectedPromo.type)}</div>
              <div className="text-sm text-gray-700 whitespace-pre-line">{selectedPromo.description}</div>
              <div className="mt-2 text-xs text-gray-500">Periode: {selectedPromo.startDate ? new Date(selectedPromo.startDate).toLocaleDateString('id-ID') : ''}{selectedPromo.endDate ? ` s.d. ${new Date(selectedPromo.endDate).toLocaleDateString('id-ID')}` : ''}</div>
            </div>
          </div>
        )}
      {/* Mini Chart Tren Singkat */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(() => {
          const MiniTrendChart = ({ title, data }: { title: string; data: number[] }) => {
            const max = Math.max(1, ...data);
            return (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
                <div className="text-sm font-medium mb-2 text-gray-700">{title}</div>
                <div className="flex items-end gap-1 h-16">
                  {data.map((v, i) => (
                    <div key={i} className="w-3 bg-[#0F4D39]/70" style={{ height: `${Math.max(4, ((v || 0) / max) * 64)}px` }} />
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500">Terbaru di kanan</div>
              </div>
            );
          };
          return (
            <>
              <MiniTrendChart title="Tren Pengeluaran (7 hari)" data={spendingTrend7d} />
            </>
          );
        })()}
      </div>

      {/* Enhanced Activity Feed */}
      <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#0F4D39]">📈 Aktivitas Terbaru</h3>
          <button className="text-sm text-gray-500 hover:text-[#0F4D39] transition-colors">
            Lihat Semua
          </button>
        </div>
        
        <div className="space-y-4">
           {activities.length > 0 ? (
             activities.slice(0, 5).map((activity, index) => {
              const getActivityStyle = (type: string) => {
                switch (type.toUpperCase()) {
                  case 'LOGIN':
                    return { icon: '🔐', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
                  case 'REDEEM':
                    return { icon: '🎯', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
                  case 'BOOK':
                    return { icon: '📅', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' };
                  case 'CANCEL':
                    return { icon: '❌', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
                  case 'PAYMENT':
                    return { icon: '💳', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
                  default:
                    return { icon: '📝', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
                }
              };
    
              const style = getActivityStyle(activity.type);
              const timeAgo = new Date(activity.createdAt).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              });
    
              return (
                <div key={index} className="flex items-start space-x-3 group hover:bg-gray-50 p-3 rounded-xl transition-all duration-200">
                  {/* Activity Icon */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.bg} ${style.border} border flex items-center justify-center`}>
                    <span className="text-lg">{style.icon}</span>
                  </div>
                  
                  {/* Activity Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-medium ${style.color}`}>
                        {activity.title}
                      </p>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {timeAgo}
                      </span>
                    </div>
                    
                    {/* Additional details */}
                    {activity.detail && (
                      <p className="text-xs text-gray-600 mt-1">
                        {activity.detail}
                      </p>
                    )}
                    
                    {/* Points or value indicator - for now we'll skip this since it's not in the data structure */}
                    {activity.type === 'REDEEM' && (
                      <div className="flex items-center mt-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Redeem
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Hover indicator */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📱</div>
              <p className="text-gray-500 text-sm">
                Belum ada aktivitas terbaru
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Mulai gunakan aplikasi untuk melihat aktivitas Anda
              </p>
            </div>
          )}
        </div>
        
        {/* Quick action buttons */}
         {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <button className="flex-1 px-3 py-2 text-xs font-medium text-[#0F4D39] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                📊 Lihat Statistik
              </button>
              <button className="flex-1 px-3 py-2 text-xs font-medium text-[#0F4D39] bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                📈 Trend Aktivitas
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notifikasi Penting */}
      <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#0F4D39]">Notifikasi Penting</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {notifications.map((n, idx) => (
            <div key={idx} className="py-3">
              <div className="text-sm text-gray-800 font-medium">{n.title}</div>
              {n.description && <div className="text-xs text-gray-600">{n.description}</div>}
              {n.createdAt && <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString('id-ID')}</div>}
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="py-6 text-sm text-gray-600">Tidak ada notifikasi saat ini.</div>
          )}
        </div>
      </div>

      </div>
    </div>
  );
}
