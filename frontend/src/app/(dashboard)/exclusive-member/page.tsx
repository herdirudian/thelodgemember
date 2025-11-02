"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function ExclusiveMemberPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [me, setMe] = useState<any>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [voucherGenerating, setVoucherGenerating] = useState(false);
  const [promos, setPromos] = useState<any[]>([]);
  const [promoFilter, setPromoFilter] = useState<'ALL' | 'EVENT' | 'EXCLUSIVE_MEMBER' | 'BIRTHDAY_GIFT'>('ALL');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  // Gunakan path relatif agar permintaan di-proxy oleh Next.js (lihat rewrites di next.config.ts)
  // Ini menghindari masalah CORS dari origin http://localhost:3003 ke backend http://localhost:5000
  const API = '';
  const LOGO_PATH = '/The Lodge Maribaya Logo.svg';
  const logoDataUrlRef = useRef<string | null>(null);
  async function getLogoPngDataUrl() {
    if (logoDataUrlRef.current) return logoDataUrlRef.current;
    try {
      const img = new Image();
      img.src = LOGO_PATH;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Gagal memuat logo'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = 600; // high resolution for better PDF scaling
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      logoDataUrlRef.current = dataUrl;
      return dataUrl;
    } catch (e) {
      return null;
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    fetch(`/api/member/events`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || 'Failed to load events');
        const list = body.events || [];
        // Tampilkan SEMUA event (termasuk yang sudah lewat) dengan badge/status yang sesuai.
        // Jika ingin menyembunyikan yang sudah lewat, tambahkan kembali filter berikut:
        // const now = new Date();
        // const filtered = list.filter((ev: any) => new Date(ev.eventDate) >= now || !!ev.myRegistration);
        // setEvents(filtered);
        setEvents(list);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  // Load active promos
  useEffect(() => {
    fetch(`/api/member/promos`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.message || 'Failed to load promos');
        const list = Array.isArray(body) ? body : (Array.isArray(body?.promos) ? body.promos : []);
        setPromos(list);
      })
      .catch((e) => console.error('Load promos error:', e?.message || e));
  }, []);

  // Load member info for voucher generation
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`/api/member/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setMeError(body?.message || 'Member not found');
          return;
        }
        setMe(body);
      })
      .catch(() => { setMeError('Member not found'); });
  }, []);

  const memberSince = (() => {
    const dateStr = me?.member?.createdAt || me?.user?.createdAt;
    try { return dateStr ? new Date(dateStr).toLocaleDateString() : '-'; } catch { return '-'; }
  })();
  const pointsBalance = me?.member?.pointsBalance ?? 0;
  const activeVouchers = me?.member?.activeVouchers ?? 0;
  // Helper: hitung tanggal ulang tahun berikutnya dari member
  function getNextBirthday(dobStr?: string): Date | null {
    if (!dobStr) return null;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    const currentYear = now.getFullYear();
    const next = new Date(currentYear, dob.getMonth(), dob.getDate());
    // jika sudah lewat di tahun ini, pakai tahun depan
    if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
      next.setFullYear(currentYear + 1);
    }
    return next;
  }

  // Helper: selisih hari dari sekarang ke target (>=0 jika di masa depan)
  function daysUntil(date: Date | null): number {
    if (!date) return Infinity;
    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return Math.floor((target - startOfToday) / msPerDay);
  }

  // Tampilkan BIRTHDAY_GIFT hanya untuk member yang ulang tahunnya akan datang (≤7 hari) dan berada dalam periode promo
  const memberPromos = promos.filter((p: any) => {
    if (p.type === 'BIRTHDAY_GIFT') {
      const nextBday = getNextBirthday(me?.member?.dateOfBirth);
      const d = daysUntil(nextBday);
      const start = p.startDate ? new Date(p.startDate) : null;
      const end = p.endDate ? new Date(p.endDate) : null;
      const withinPeriod = nextBday && start && end ? (nextBday >= start && nextBday <= end) : true;
      const promoActiveNow = (!start || start <= new Date()) && (!end || end >= new Date());
      // hanya tampil jika ulang tahun dalam 7 hari ke depan, promo aktif, dan (jika ada) tanggal ulang tahun berada dalam periode promo
      return d >= 0 && d <= 7 && promoActiveNow && withinPeriod;
    }
    return p.type === 'EVENT' || p.type === 'EXCLUSIVE_MEMBER';
  });
  const filteredPromos = promoFilter === 'ALL' ? memberPromos : memberPromos.filter((p: any) => p.type === promoFilter);

  function statusOf(ev: any) {
    const now = new Date();
    const eventDate = new Date(ev.eventDate);
    const startDate = ev.startDate ? new Date(ev.startDate) : eventDate;
    const endDate = ev.endDate ? new Date(ev.endDate) : eventDate;
    
    // Jika event sudah berakhir
    if (endDate < now) return 'ended';
    
    // Jika event sedang berlangsung
    if (startDate <= now && now <= endDate) return 'ongoing';
    
    // Jika kuota penuh
    const seatsLeft = typeof ev.seatsLeft === 'number' ? ev.seatsLeft : (typeof ev.quota === 'number' ? ev.quota : null);
    if (seatsLeft !== null && seatsLeft <= 0) return 'full';
    
    // Jika event akan datang
    return 'upcoming';
  }

  // Izinkan tombol Join diklik selama masih ada kuota tersisa.
  // Menghindari kasus timezone yang membuat status terlihat "Selesai" padahal user ingin tetap join.
  function canJoin(ev: any) {
    const seatsLeft = typeof ev.seatsLeft === 'number' ? ev.seatsLeft : (typeof ev.quota === 'number' ? ev.quota : null);
    return (seatsLeft ?? 0) > 0;
  }

  const openDetail = (ev: any) => { setSelected(ev); setDetailOpen(true); setVoucherPreview(null); };
  const closeDetail = () => { setDetailOpen(false); setSelected(null); setVoucherPreview(null); };

  async function registerEvent(id: string) {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    
    // Show loading state
    showToast('Mendaftarkan ke event...', 'success');
    
    const res = await fetch(`/api/member/events/${id}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) {
      showToast(body.message || 'Gagal mendaftar event', 'error');
      return;
    }
    const reg = body.registration;
    
    // Perbarui state events
    setEvents((prev) => prev.map((ev) => ev.id === id ? { ...ev, myRegistration: reg, seatsLeft: Math.max((ev.seatsLeft || 0) - 1, 0) } : ev));
    
    // Siapkan event yang sudah di-update untuk ditampilkan pada modal detail & preview voucher otomatis
    const baseEv = (events.find((ev) => ev.id === id)) || selected;
    const updatedEv = baseEv ? { ...baseEv, myRegistration: reg, seatsLeft: Math.max((baseEv?.seatsLeft || 0) - 1, 0) } : null;
    
    if (updatedEv) {
      setSelected(updatedEv);
      setDetailOpen(true);
      await generateVoucherPdf(updatedEv, reg);
    }
    
    // Show success message with email notification
    showToast('✅ Berhasil join event! E-voucher telah dikirim ke email Anda.', 'success');
  }

  async function registerPromo(promo: any) {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    
    // Show loading state
    showToast('Mendaftarkan ke promo...', 'success');
    
    try {
      // Call backend API to register for promo
      const res = await fetch(`/api/member/promos/${promo.id}/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
      });
      
      const body = await res.json();
      if (!res.ok) {
        showToast(body.message || 'Gagal mendaftar promo', 'error');
        return;
      }
      
      const registration = body.registration;
      
      // Create a mock event-like object for voucher generation and modal display
      const mockEvent = {
        id: promo.id,
        title: promo.title,
        description: promo.description,
        eventDate: promo.endDate || new Date(),
        location: 'The Lodge Maribaya',
        quota: promo.quota || 100,
        seatsLeft: (promo.quota || 100) - 1,
        myRegistration: registration
      };

      // Generate and show voucher
      setSelected(mockEvent);
      setDetailOpen(true);
      await generateVoucherPdf(mockEvent, registration);
      
      // Show success message
      showToast(body.message || '✅ Berhasil join promo! E-voucher telah dikirim ke email Anda.', 'success');
      
    } catch (error: any) {
      console.error('Error registering promo:', error);
      showToast('❌ Gagal mendaftar promo: ' + (error?.message || error), 'error');
    }
  }

  async function generateVoucherPdf(ev: any, reg: any) {
    try {
      setVoucherGenerating(true);
      showToast('Membuat e-voucher...', 'success');
      
      const doc = new jsPDF();
      
      // Header brand bar + logo
      const logoPng = await getLogoPngDataUrl();
      doc.setFillColor('#0F4D39');
      doc.rect(0, 0, 210, 35, 'F');
      doc.setTextColor('#ffffff');
      
      if (logoPng) {
        doc.addImage(logoPng, 'PNG', 10, 8, 35, 20);
      }
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('The Lodge Maribaya', 105, 22, { align: 'center' });
      
      // E-Voucher Title
      doc.setTextColor('#0F4D39');
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('E-VOUCHER EVENT', 105, 50, { align: 'center' });
      
      // Event Details Box
      doc.setDrawColor('#0F4D39');
      doc.setLineWidth(1);
      doc.rect(15, 60, 180, 80);
      
      // Content
      const memberName = me?.user?.fullName || me?.member?.fullName || me?.user?.name || me?.member?.name || '-';
      doc.setTextColor('#000000');
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      
      let yPos = 75;
      doc.setFont('helvetica', 'bold');
      doc.text('DETAIL EVENT:', 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Nama Event: ${ev.title}`, 20, yPos);
      yPos += 6;
      doc.text(`Nama Member: ${memberName}`, 20, yPos);
      yPos += 6;
      
      try { 
        const eventDate = new Date(ev.eventDate);
        doc.text(`Tanggal Event: ${eventDate.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric'
        })}`, 20, yPos);
        yPos += 6;
      } catch {}
      
      if (ev.location) { 
        doc.text(`Lokasi: ${ev.location}`, 20, yPos);
        yPos += 6;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor('#0F4D39');
      doc.text(`STATUS: TERDAFTAR ✓`, 20, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#000000');
      doc.text(`Tanggal Registrasi: ${reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('id-ID') : '-'}`, 20, yPos);
      yPos += 6;
      doc.text(`Kode Registrasi: ${reg.id}`, 20, yPos);

      // QR Code
      const qrUrl = reg.qr || await QRCode.toDataURL(reg.id || `${ev.id}:${memberName}`);
      doc.addImage(qrUrl, 'PNG', 145, 70, 45, 45);
      
      // QR Code Label
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('SCAN QR CODE', 167, 125, { align: 'center' });
      
      // Instructions
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Petunjuk Penggunaan:', 20, 155);
      doc.text('• Tunjukkan e-voucher ini saat check-in event', 20, 165);
      doc.text('• Atau scan QR code di atas', 20, 172);
      doc.text('• Datang tepat waktu sesuai jadwal', 20, 179);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor('#666666');
      doc.text('E-voucher ini digenerate otomatis oleh sistem The Lodge Family', 105, 200, { align: 'center' });

      const blobUrl = doc.output('bloburl');
      setVoucherPreview(blobUrl);
      
      showToast('✅ E-voucher berhasil dibuat!', 'success');
    } catch (e: any) {
      console.error('Error generating voucher:', e);
      showToast('❌ Gagal membuat voucher: ' + (e?.message || e), 'error');
    } finally {
      setVoucherGenerating(false);
    }
  }

  async function downloadVoucherPdf(ev: any, reg: any) {
    const doc = new jsPDF();
    // Header brand bar + logo
    const logoPng = await getLogoPngDataUrl();
    doc.setFillColor('#0F4D39');
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor('#ffffff');
    if (logoPng) {
      doc.addImage(logoPng, 'PNG', 10, 6, 40, 18);
    }
    doc.setFontSize(16);
    doc.text('The Lodge Maribaya', 105, 20, { align: 'center' });

    const memberName = me?.user?.fullName || me?.member?.fullName || me?.user?.name || me?.member?.name || '-';
    doc.setTextColor('#000000');
    doc.setFontSize(14);
    doc.text('E-Voucher Event', 20, 50);
    doc.setFontSize(12);
    doc.text(`Nama Event: ${ev.title}`, 20, 64);
    doc.text(`Nama Member: ${memberName}`, 20, 76);
    try { doc.text(`Tanggal Event: ${new Date(ev.eventDate).toLocaleString()}`, 20, 88); } catch {}
    if (ev.location) { doc.text(`Lokasi: ${ev.location}`, 20, 100); }
    doc.text(`Status: Terdaftar`, 20, ev.location ? 112 : 100);
    doc.text(`Tanggal Registrasi: ${reg.createdAt ? new Date(reg.createdAt).toLocaleString() : '-'}`, 20, ev.location ? 124 : 112);
    doc.text(`Kode Registrasi: ${reg.id}`, 20, ev.location ? 136 : 124);
    if (reg.qr) { doc.addImage(reg.qr, 'PNG', 150, 60, 40, 40); }
    doc.save(`E-Voucher_${ev.title}.pdf`);
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#0F4D39] mb-4">
            Exclusive Member Events
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Nikmati event eksklusif dan promo khusus untuk member The Lodge Maribaya
          </p>
        </div>

        {/* Events Section */}
        <section className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#0F4D39] mb-2">
                Exclusive Events
              </h2>
              <p className="text-gray-600">
                Event eksklusif khusus untuk member The Lodge Maribaya
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {events.map((ev: any) => {
              const status = statusOf(ev);
              const canJoinEvent = canJoin(ev);
              return (
                <div key={ev.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2">
                  {ev.imageUrl && (
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={ev.imageUrl} 
                        alt={ev.title} 
                        loading="lazy" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-[#0F4D39] text-xl leading-tight flex-1">
                        {ev.title}
                      </h3>
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap ${
                        status === 'upcoming' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                        status === 'ongoing' ? 'bg-green-100 text-green-700 border border-green-200' :
                        status === 'ended' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                        'bg-yellow-100 text-yellow-700 border border-yellow-200'
                      }`}>
                        {status === 'upcoming' ? 'Akan Datang' :
                         status === 'ongoing' ? 'Berlangsung' :
                         status === 'ended' ? 'Berakhir' : 'Status Tidak Diketahui'}
                      </span>
                    </div>
                    <p className="text-gray-600 line-clamp-3 leading-relaxed">
                      {ev.description}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : '-'} s/d {ev.endDate ? new Date(ev.endDate).toLocaleDateString() : '-'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{ev.location || 'Lokasi akan diumumkan'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>
                          {ev.currentParticipants || 0}/{ev.maxParticipants || '∞'} peserta
                        </span>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        onClick={() => openDetail(ev)}
                        className="w-full px-6 py-3 bg-[#0F4D39] text-white rounded-xl hover:bg-[#0e3f30] transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Lihat Selengkapnya
                      </button>
                      <button
                        onClick={() => ev.myRegistration ? openDetail(ev) : registerEvent(ev.id)}
                        disabled={!ev.myRegistration && !canJoinEvent}
                        className={`w-full px-6 py-3 rounded-xl transition-all duration-300 text-sm font-semibold shadow-lg transform ${
                          ev.myRegistration
                            ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:shadow-xl hover:scale-105'
                            : canJoinEvent
                            ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-xl hover:scale-105'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {ev.myRegistration ? 'Lihat Voucher' :
                         canJoinEvent ? 'Join Event' : 
                         status === 'ended' ? 'Event Berakhir' :
                         status === 'full' ? 'Kuota Penuh' : 'Tidak Dapat Join'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">
                    Belum ada event tersedia
                  </h3>
                  <p className="text-gray-500">
                    Event eksklusif untuk member belum tersedia saat ini
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Promo Member Section */}
        <section className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div>
              <h2 className="text-3xl font-bold text-[#0F4D39] mb-2">
                Promo Member
              </h2>
              <p className="text-gray-600">
                Temukan promo eksklusif yang tersedia untuk Anda
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setPromoFilter('ALL')} 
                className={`px-6 py-3 text-sm font-medium rounded-xl border-2 transition-all duration-300 ${
                  promoFilter === 'ALL' 
                    ? 'bg-[#0F4D39] text-white border-[#0F4D39] shadow-lg transform scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-[#0F4D39] hover:text-white hover:border-[#0F4D39] hover:shadow-md'
                } focus:outline-none focus:ring-4 focus:ring-[#0F4D39]/20`}
              >
                Semua
              </button>
              <button 
                onClick={() => setPromoFilter('EVENT')} 
                className={`px-6 py-3 text-sm font-medium rounded-xl border-2 transition-all duration-300 ${
                  promoFilter === 'EVENT' 
                    ? 'bg-[#0F4D39] text-white border-[#0F4D39] shadow-lg transform scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-[#0F4D39] hover:text-white hover:border-[#0F4D39] hover:shadow-md'
                } focus:outline-none focus:ring-4 focus:ring-[#0F4D39]/20`}
              >
                Event
              </button>
              <button 
                onClick={() => setPromoFilter('EXCLUSIVE_MEMBER')} 
                className={`px-6 py-3 text-sm font-medium rounded-xl border-2 transition-all duration-300 whitespace-nowrap ${
                  promoFilter === 'EXCLUSIVE_MEMBER' 
                    ? 'bg-[#0F4D39] text-white border-[#0F4D39] shadow-lg transform scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-[#0F4D39] hover:text-white hover:border-[#0F4D39] hover:shadow-md'
                } focus:outline-none focus:ring-4 focus:ring-[#0F4D39]/20`}
              >
                Member Exclusive
              </button>
              <button 
                onClick={() => setPromoFilter('BIRTHDAY_GIFT')} 
                className={`px-6 py-3 text-sm font-medium rounded-xl border-2 transition-all duration-300 whitespace-nowrap ${
                  promoFilter === 'BIRTHDAY_GIFT' 
                    ? 'bg-[#0F4D39] text-white border-[#0F4D39] shadow-lg transform scale-105' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-[#0F4D39] hover:text-white hover:border-[#0F4D39] hover:shadow-md'
                } focus:outline-none focus:ring-4 focus:ring-[#0F4D39]/20`}
              >
                Hadiah Ulang Tahun
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredPromos.map((p: any) => {
              const start = p.startDate ? new Date(p.startDate) : null;
              const end = p.endDate ? new Date(p.endDate) : null;
              const typeLabel = p.type === 'EVENT' 
                ? 'Event' 
                : p.type === 'EXCLUSIVE_MEMBER' 
                  ? 'Member Exclusive' 
                  : p.type === 'BIRTHDAY_GIFT' 
                    ? 'Hadiah Ulang Tahun' 
                    : p.type;
              return (
                <div key={p.id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-200 overflow-hidden transition-all duration-500 hover:scale-[1.03] hover:-translate-y-2">
                  {p.imageUrl && (
                    <div className="relative aspect-video overflow-hidden">
                      <img 
                        src={p.imageUrl} 
                        alt={p.title} 
                        loading="lazy" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  )}

      {/* Promo Detail Modal */}
      {showDetailModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="relative">
              {selectedItem.imageUrl && (
                <img 
                  src={selectedItem.imageUrl} 
                  alt={selectedItem.title} 
                  loading="lazy" 
                  className="w-full h-64 object-cover rounded-t-2xl" 
                />
              )}
              <button 
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedItem(null);
                }} 
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 rounded-full px-3 py-1 text-sm shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Tutup
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-2xl font-bold text-[#0F4D39] dark:text-white flex-1">
                  {selectedItem.title}
                </h2>
                <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap font-medium">
                  {selectedItem.type === 'EVENT' 
                    ? 'Event' 
                    : selectedItem.type === 'EXCLUSIVE_MEMBER' 
                      ? 'Member Exclusive' 
                      : selectedItem.type === 'BIRTHDAY_GIFT' 
                        ? 'Hadiah Ulang Tahun' 
                        : selectedItem.type}
                </span>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {selectedItem.description}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    Periode: {selectedItem.startDate ? new Date(selectedItem.startDate).toLocaleDateString() : '-'} s/d {selectedItem.endDate ? new Date(selectedItem.endDate).toLocaleDateString() : '-'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Kuota: {typeof selectedItem.quota === 'number' ? selectedItem.quota : '-'} member</span>
                </div>
                
                {selectedItem.linkedEvent && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 col-span-full">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span>Event ID: {selectedItem.linkedEvent.id || selectedItem.eventId || '-'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
                  <div className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-bold text-[#0F4D39] dark:text-white text-xl leading-tight flex-1">
                        {p.title}
                      </h3>
                      <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap font-medium">
                        {typeLabel}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                      {p.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{start ? start.toLocaleDateString() : '-'} s/d {end ? end.toLocaleDateString() : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Kuota Member: {typeof p.quota === 'number' ? p.quota : '-'}</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 pt-2">
                      <button
                        onClick={() => {
                          if (p.linkedEvent) {
                            openDetail(p.linkedEvent);
                          } else {
                            setSelectedItem(p);
                            setShowDetailModal(true);
                          }
                        }}
                        className="w-full px-6 py-3 bg-[#0F4D39] text-white rounded-xl hover:bg-[#0e3f30] transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        Lihat Selengkapnya
                      </button>
                      <button
                        onClick={() => {
                          if (p.linkedEvent) {
                            registerEvent(p.linkedEvent.id);
                          } else {
                            registerPromo(p);
                          }
                        }}
                        className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {p.linkedEvent 
                          ? 'Join Event' 
                          : p.type === 'BIRTHDAY_GIFT' 
                            ? 'Klaim Hadiah Ulang Tahun' 
                            : 'Daftar Promo'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredPromos.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-400 dark:text-gray-500 mb-2">
                    Belum ada promo tersedia
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Promo untuk filter yang dipilih belum tersedia saat ini
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Events Section */}


      </div>

      {/* Detail Modal */}
      {detailOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="relative">
              {selected.imageUrl && <img src={selected.imageUrl} alt={selected.title} loading="lazy" className="w-full h-64 object-cover" />}
              <button onClick={closeDetail} className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-800 rounded-full px-3 py-1 text-sm shadow">Tutup</button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#0F4D39]">{selected.title}</h2>
                <span className={`text-xs px-2 py-1 rounded-full border ${(() => { 
                  const s = statusOf(selected); 
                  return s === 'upcoming' ? 'bg-blue-100 text-blue-700 border-blue-300' : 
                         s === 'ongoing' ? 'bg-green-100 text-green-700 border-green-300' : 
                         s === 'ended' ? 'bg-gray-100 text-gray-700 border-gray-300' :
                         s === 'full' ? 'bg-red-100 text-red-700 border-red-300' : 
                         'bg-yellow-100 text-yellow-700 border-yellow-300'; 
                })()}`}>
                  {(() => {
                    const s = statusOf(selected);
                    return s === 'upcoming' ? 'Akan Datang' :
                           s === 'ongoing' ? 'Berlangsung' :
                           s === 'ended' ? 'Berakhir' :
                           s === 'full' ? 'Kuota Penuh' : 'Status Tidak Diketahui';
                  })()}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{selected.description}</p>
              <div className="text-sm text-gray-600 mt-2">Tanggal & Waktu: {selected.eventDate ? new Date(selected.eventDate).toLocaleString() : '-'}</div>
        {!!(selected.location || selected.venue) && (
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <span>Lokasi: {selected.location || selected.venue}</span>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(selected.location || selected.venue))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-2 py-1 text-xs rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-gray-800 dark:text-gray-200"
            >
              Lihat di Maps
            </a>
          </div>
        )}
              <div className="text-sm text-gray-600">Tersisa {selected.seatsLeft} dari {selected.quota} peserta</div>

              {(selected.terms || selected.requirements) && (
                <div className="mt-3">
                  <div className="text-sm font-medium text-[#0F4D39]">Syarat & Ketentuan</div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{selected.terms || selected.requirements}</p>
                </div>
              )}

              {selected.myRegistration ? (
                <div className="mt-4 border-2 border-dashed border-green-200 dark:border-green-800 rounded-2xl p-6 bg-green-50 dark:bg-green-900/20">
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
                      ✅ Anda sudah terdaftar dalam event ini
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      E-voucher telah dikirim ke email Anda
                    </div>
                  </div>
                  
                  {selected.myRegistration.qr && (
                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-4 rounded-xl shadow-lg border-2 border-green-300">
                        <img 
                          src={selected.myRegistration.qr} 
                          alt="Event QR Code" 
                          loading="lazy" 
                          className="w-32 h-32" 
                        />
                        <div className="text-xs text-center text-gray-600 mt-2 font-medium">
                          QR Code Event
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button 
                      onClick={() => generateVoucherPdf(selected, selected.myRegistration)} 
                      className="px-4 py-3 bg-[#0F4D39] text-white rounded-xl hover:bg-[#0e3f30] transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2" 
                      disabled={voucherGenerating}
                    >
                      {voucherGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Membuat...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview E-Voucher
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => downloadVoucherPdf(selected, selected.myRegistration)} 
                      className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-300 text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </button>
                  </div>
                  
                  {voucherPreview && (
                    <div className="mt-6">
                      <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-3 text-center">
                        📄 Preview E-Voucher Anda
                      </div>
                      <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-green-300">
                        <iframe 
                          src={voucherPreview} 
                          className="w-full h-80 border-0" 
                          title="E-Voucher Preview"
                        />
                      </div>
                      <div className="text-xs text-center text-green-600 dark:text-green-400 mt-2">
                        💡 Tunjukkan e-voucher ini saat check-in event
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <button
                    disabled={!canJoin(selected)}
                    onClick={() => registerEvent(selected.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-60 text-sm min-h-[44px] w-full sm:w-auto"
                  >
                    {canJoin(selected) ? 'Join Event' : 'Kuota Habis'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-[60] px-4 py-2 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
