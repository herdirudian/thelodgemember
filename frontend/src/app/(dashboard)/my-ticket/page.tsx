"use client";
import { useEffect, useState } from "react";

export default function MyTicketPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [benefitLoading, setBenefitLoading] = useState(false);
  const [benefitError, setBenefitError] = useState("");
  const [expandedPromoId, setExpandedPromoId] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [redeemingBenefitId, setRedeemingBenefitId] = useState<string | null>(null);
  const [showEVoucher, setShowEVoucher] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<any | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/member/tickets/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            try { localStorage.removeItem("token"); } catch {}
            window.location.href = "/login";
            return;
          }
          throw new Error(body.message || "Failed to load tickets");
        }
        setTickets(body.tickets || []);
      } catch (e: any) {
        setError(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
    async function loadBenefits() {
      setBenefitLoading(true);
      setBenefitError("");
      try {
        const res = await fetch(`/api/member/benefits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            try { localStorage.removeItem("token"); } catch {}
            window.location.href = "/login";
            return;
          }
          throw new Error(body.message || "Failed to load benefits");
        }
        setBenefits(body || []);
      } catch (e: any) {
        setBenefitError(e.message || "Failed to load benefits");
      } finally {
        setBenefitLoading(false);
      }
    }
    loadBenefits();
    
    async function loadRedemptions() {
      try {
        const res = await fetch(`/api/member/benefits/my-redemptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        console.log('Redemptions API response:', body);
        if (res.ok) {
          setRedemptions(body || []);
          if (body && body.length > 0) {
            console.log('First redemption qrCode:', body[0].qrCode ? 'present' : 'missing');
          }
        }
      } catch (e: any) {
        console.error('Failed to load redemptions:', e);
      }
    }
    loadRedemptions();
  }, []);

  function logout() {
    try { localStorage.removeItem("token"); } catch {}
    window.location.href = "/login";
  }

  function openPreview(t: any) {
    setSelectedTicket(t);
    setPreviewOpen(true);
  }
  function closePreview() {
    setPreviewOpen(false);
    setSelectedTicket(null);
  }

  async function redeemBenefit(benefitId: string) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    setRedeemingBenefitId(benefitId);
    try {
      const res = await fetch(`/api/member/benefits/${benefitId}/redeem`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      const body = await res.json();
      
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem("token"); } catch {}
          window.location.href = "/login";
          return;
        }
        throw new Error(body.message || "Failed to redeem benefit");
      }

      // Show e-voucher
      setCurrentVoucher(body.redemption);
      setShowEVoucher(true);
      
      // Reload redemptions to update the list
      const redemptionRes = await fetch(`/api/member/benefits/my-redemptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const redemptionBody = await redemptionRes.json();
      if (redemptionRes.ok) {
        setRedemptions(redemptionBody || []);
      }
      
    } catch (e: any) {
      alert(e.message || "Failed to redeem benefit");
    } finally {
      setRedeemingBenefitId(null);
    }
  }

  function isAlreadyRedeemed(benefitId: string) {
    return redemptions.some(r => r.benefitId === benefitId);
  }

  function getRedemptionForBenefit(benefitId: string) {
    return redemptions.find(r => r.benefitId === benefitId);
  }

  function viewVoucher(benefitId: string) {
    const redemption = getRedemptionForBenefit(benefitId);
    console.log('viewVoucher called with benefitId:', benefitId);
    console.log('Found redemption:', redemption);
    if (redemption) {
      console.log('Redemption qrCode:', redemption.qrCode ? 'present' : 'missing');
      console.log('QR Code length:', redemption.qrCode ? redemption.qrCode.length : 0);
      setCurrentVoucher(redemption);
      setShowEVoucher(true);
    }
  }



  async function downloadEvoucherPNG(ticket: any) {
    if (!ticket) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800; // px
    canvas.height = 1200; // px
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // header
    ctx.fillStyle = '#0F4D39';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('E-Voucher', 40, 60);
    // details
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 26px Arial';
    ctx.fillText(ticket.name || 'Voucher', 40, 120);
    ctx.font = '20px Arial';
    ctx.fillText(`Kode: ${ticket.qrPayloadHash || '-'}`, 40, 160);
    ctx.fillText(`Pax: 1`, 40, 190);
    if (ticket.validDate) {
      const vd = new Date(ticket.validDate).toLocaleDateString();
      ctx.fillText(`Berlaku hingga: ${vd}`, 40, 220);
    }
    // draw QR
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const size = 400;
        ctx.drawImage(img, 40, 260, size, size);
        resolve();
      };
      img.src = ticket.qr;
    });
    // instructions
    ctx.font = '18px Arial';
    ctx.fillStyle = '#555555';
    const lines = [
      'Cara redeem:',
      '1. Tunjukkan e-voucher ini di loket/konter The Lodge Maribaya.',
      '2. Petugas akan memindai QR code untuk validasi.',
      '3. Satu voucher berlaku untuk 1 orang (1 pax).',
      '4. Voucher tidak dapat dipindahtangankan atau digandakan.',
      '5. Simpan dan jangan sebarkan kode voucher Anda.'
    ];
    let y = 700;
    for (const line of lines) {
      ctx.fillText(line, 40, y);
      y += 30;
    }
    // footer
    ctx.font = '16px Arial';
    ctx.fillStyle = '#999999';
    ctx.fillText('The Lodge Family', 40, canvas.height - 40);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `e-voucher_${ticket.id || 'voucher'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function printEvoucher(ticket: any) {
    if (!ticket) return;
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) return;
    const vd = ticket.validDate ? new Date(ticket.validDate).toLocaleDateString() : '-';
    const html = `
<!doctype html><html><head><meta charset="utf-8"><title>E-Voucher</title>
<style>
body{font-family:Arial, sans-serif; color:#333; padding:24px;}
.header{color:#0F4D39; font-weight:700; font-size:24px;}
.card{border:1px solid #e5e7eb; border-radius:12px; padding:16px; margin-top:12px;}
.badge{display:inline-block; padding:4px 8px; border-radius:999px; background:#0F4D39; color:#fff; font-size:12px; margin-left:8px;}
.row{display:flex; justify-content:space-between; align-items:flex-start; gap:16px;}
.qr{width:280px; height:280px; border:1px solid #e5e7eb; border-radius:8px;}
.small{font-size:12px; color:#666;}
</style></head><body>
<div class="header">E-Voucher Saya <span class="badge">Aktif</span></div>
<div class="card">
  <div class="row">
    <div>
      <div style="font-weight:600; font-size:18px; color:#0F4D39;">${ticket.name || 'Voucher'}</div>
      <div class="small">Kode: ${ticket.friendlyCode || ticket.qrPayloadHash || '-'}</div>
      <div class="small">Pax per voucher: 1</div>
      <div class="small">Berlaku hingga: ${vd}</div>
      <div style="margin-top:12px; font-size:13px; color:#555;">
        <div><b>Cara redeem:</b></div>
        <div>1. Tunjukkan e-voucher ini di loket/konter The Lodge Maribaya.</div>
        <div>2. Petugas akan memindai QR code untuk validasi.</div>
        <div>3. Satu voucher berlaku untuk 1 orang (1 pax).</div>
        <div>4. Voucher tidak dapat dipindahtangankan atau digandakan.</div>
        <div>5. Simpan dan jangan sebarkan kode voucher Anda.</div>
      </div>
    </div>
    <img class="qr" src="${ticket.qr}" alt="QR Voucher"/>
  </div>
</div>
<script>window.print();</script>
</body></html>`;
    w.document.write(html);
    w.document.close();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Using global Navbar from layout */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-xl font-semibold text-[#0F4D39] mb-4">My Tickets</h1>

        {error && <div className="text-red-600">{error}</div>}

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6">
            {[0, 1].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 w-full">
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                  <div className="w-28 h-28 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Benefits: Member Baru */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[#0F4D39] mb-2">Benefit Member</h2>
              {benefitError && <div className="text-red-600 text-sm mb-2">{benefitError}</div>}
              {benefitLoading ? (
                <div className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {benefits.map((benefit: any) => (
                    <div key={benefit.id} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {benefit.imageUrl ? (
                          <img src={benefit.imageUrl} alt={benefit.title} className="w-24 h-24 object-cover rounded-lg" />
                        ) : (
                          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-[#0F4D39] to-[#0e3f30] flex items-center justify-center">
                            <span className="text-white text-2xl">🎁</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-[#0F4D39] font-semibold text-lg">{benefit.title}</div>
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">{benefit.description}</div>
                          {benefit.validUntil && (
                            <div className="text-xs text-gray-500 mt-2 flex items-center">
                              <span className="mr-1">📅</span>
                              Berlaku hingga: {new Date(benefit.validUntil).toLocaleDateString('id-ID')}
                            </div>
                          )}
                          <div className="mt-3 flex gap-2">
                             <button 
                               onClick={() => setExpandedPromoId(expandedPromoId === benefit.id ? null : benefit.id)} 
                               className="px-3 py-1.5 text-sm rounded-lg border border-[#0F4D39] text-[#0F4D39] hover:bg-[#f0f8f6] transition"
                             >
                               {expandedPromoId === benefit.id ? 'Tutup' : 'Selengkapnya'}
                             </button>
                             {isAlreadyRedeemed(benefit.id) ? (
                               <div className="flex gap-2">
                                 <span className="px-3 py-1.5 text-sm rounded-lg bg-green-100 text-green-700 border border-green-200">
                                   ✓ Sudah Diredeem
                                 </span>
                                 <button 
                                   onClick={() => viewVoucher(benefit.id)}
                                   className="px-3 py-1.5 text-sm rounded-lg bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 transition"
                                 >
                                   👁️ Lihat Voucher
                                 </button>
                               </div>
                             ) : (
                               <button 
                                 onClick={() => redeemBenefit(benefit.id)}
                                 disabled={redeemingBenefitId === benefit.id}
                                 className="px-3 py-1.5 text-sm rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition disabled:opacity-50 disabled:cursor-not-allowed"
                               >
                                 {redeemingBenefitId === benefit.id ? 'Redeeming...' : 'Redeem'}
                               </button>
                             )}
                           </div>
                        </div>
                      </div>
                      {expandedPromoId === benefit.id && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="text-sm text-gray-700">
                            <div className="font-semibold mb-2 text-[#0F4D39]">Detail Benefit</div>
                            <div className="whitespace-pre-line">{benefit.description}</div>
                            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                              {benefit.validFrom && (
                                <div>
                                  <span className="font-medium text-gray-600">Berlaku dari:</span>
                                  <div className="text-gray-500">{new Date(benefit.validFrom).toLocaleDateString('id-ID')}</div>
                                </div>
                              )}
                              {benefit.validUntil && (
                                <div>
                                  <span className="font-medium text-gray-600">Berlaku hingga:</span>
                                  <div className="text-gray-500">{new Date(benefit.validUntil).toLocaleDateString('id-ID')}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {benefits.length === 0 && (
                    <div className="rounded-lg border border-gray-200 p-6 text-center">
                      <div className="text-gray-400 text-4xl mb-2">🎁</div>
                      <div className="text-sm text-gray-600">Tidak ada benefit yang tersedia saat ini.</div>
                      <div className="text-xs text-gray-500 mt-1">Benefit baru akan muncul di sini ketika admin mempostingnya.</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {tickets.length === 0 && (
              <div className="rounded-lg border border-gray-200 p-6 text-gray-600">
                You have no tickets yet. Redeem a free ticket on the Dashboard.
                <div className="mt-3">
                  <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {tickets.map((t) => {
                const isValid = new Date(t.validDate) > new Date();
                const status = isValid ? "Valid" : "Expired";
                return (
                  <div key={t.id} className="card p-6 transform transition-transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[#0F4D39] font-medium">{t.name}</div>
                        <div className="text-gray-500 text-xs">Valid until {new Date(t.validDate).toLocaleDateString()}</div>
                        <div className={`mt-2 text-xs ${isValid ? "text-green-600" : "text-red-600"}`}>Status: {status}</div>
                      </div>
                      {t.qr && (
                        <img src={t.qr} alt="Ticket QR" className="w-28 h-28 border rounded" />
                      )}
                    </div>
                    <div className="mt-3 text-xs text-gray-500 break-all">Hash: {t.qrPayloadHash}</div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => openPreview(t)} className="px-3 py-2 rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition">Lihat Voucher</button>
                      <button onClick={() => downloadEvoucherPNG(t)} className="px-3 py-2 rounded-lg border border-[#0F4D39] text-[#0F4D39] hover:bg-[#f0f8f6] transition">Download E-Voucher</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {previewOpen && selectedTicket && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-2xl p-6">
                  <div className="flex justify-between items-center">
                    <div className="text-lg font-semibold text-[#0F4D39]">Preview Voucher</div>
                    <button onClick={closePreview} className="text-gray-500 hover:text-gray-700">✕</button>
                  </div>
                  <div className="mt-4 flex gap-6">
                    <div className="flex-1">
                      <div className="font-medium text-[#0F4D39]">{selectedTicket.name}</div>
                      <div className="text-sm text-gray-600">Kode: {selectedTicket.friendlyCode || selectedTicket.qrPayloadHash || '-'}</div>
                      <div className="text-sm text-gray-600">Pax per voucher: 1</div>
                      <div className="text-sm text-gray-600">Berlaku hingga: {new Date(selectedTicket.validDate).toLocaleDateString()}</div>
                      <div className="mt-3 text-sm text-gray-700">
                        <div className="font-semibold mb-1">Cara redeem:</div>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Tunjukkan e-voucher ini di loket/konter The Lodge Maribaya.</li>
                          <li>Petugas akan memindai QR code untuk validasi.</li>
                          <li>Satu voucher berlaku untuk 1 orang (1 pax).</li>
                          <li>Voucher tidak dapat dipindahtangankan atau digandakan.</li>
                          <li>Simpan dan jangan sebarkan kode voucher Anda.</li>
                        </ul>
                      </div>
                    </div>
                    <img src={selectedTicket.qr} alt="QR Voucher" className="w-48 h-48 border rounded" />
                  </div>
                  <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => printEvoucher(selectedTicket)} className="px-3 py-2 rounded bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition">Cetak/Download PDF</button>
                    <button onClick={() => downloadEvoucherPNG(selectedTicket)} className="px-3 py-2 rounded border border-[#0F4D39] text-[#0F4D39] hover:bg-[#f0f8f6] transition">Download E-Voucher (PNG)</button>
                    <button onClick={closePreview} className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 transition">Tutup</button>
                  </div>
                </div>
              </div>
            )}

            {/* E-Voucher Modal */}
            {showEVoucher && currentVoucher && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-lg font-semibold text-[#0F4D39]">E-Voucher Benefit</div>
                    <button onClick={() => setShowEVoucher(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                  </div>
                  
                  <div className="bg-gradient-to-br from-[#0F4D39] to-[#0e3f30] text-white p-6 rounded-lg mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold mb-2">🎁 {currentVoucher.isUsed ? 'Voucher Terpakai' : 'Voucher Aktif'}</div>
                      <div className="text-lg">
                        {currentVoucher.isUsed ? 'Voucher ini sudah digunakan' : 'Voucher siap digunakan'}
                      </div>
                      {currentVoucher.isUsed && currentVoucher.usedAt && (
                        <div className="text-sm mt-2 opacity-90">
                          Digunakan pada: {new Date(currentVoucher.usedAt).toLocaleDateString('id-ID', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="flex-1">
                      <div className="font-medium text-[#0F4D39] text-lg">{currentVoucher.benefit?.title}</div>
                      <div className="text-sm text-gray-600 mt-2">{currentVoucher.benefit?.description}</div>
                      
                      <div className="mt-4 space-y-2">
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Kode Voucher:</span>
                          <div className="font-mono text-lg text-[#0F4D39] bg-gray-100 p-2 rounded mt-1">{currentVoucher.voucherCode}</div>
                        </div>
                        <div className="text-sm">
                          <span className="font-medium text-gray-700">Tanggal Redeem:</span>
                          <div className="text-gray-600">{new Date(currentVoucher.createdAt).toLocaleDateString('id-ID', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-gray-700">
                        <div className="font-semibold mb-2">Cara menggunakan:</div>
                        <ul className="list-disc ml-5 space-y-1">
                          <li>Tunjukkan e-voucher ini di lokasi yang ditentukan</li>
                          <li>Petugas akan memindai QR code untuk validasi</li>
                          <li>Voucher hanya dapat digunakan sekali</li>
                          <li>Simpan voucher ini dengan baik</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="bg-white p-4 border-2 border-gray-200 rounded-lg relative">
                        {currentVoucher.qrCode ? (
                          <div className="relative">
                            <img 
                              src={`data:image/png;base64,${currentVoucher.qrCode}`} 
                              alt="QR Code Voucher" 
                              className={`w-32 h-32 mx-auto ${currentVoucher.isUsed ? 'opacity-50 grayscale' : ''}`}
                            />
                            {currentVoucher.isUsed && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transform -rotate-12">
                                  TERPAKAI
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-32 h-32 mx-auto bg-gray-200 flex items-center justify-center rounded">
                            <span className="text-gray-500 text-sm">QR Code</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          QR Code {currentVoucher.isUsed ? '(Tidak Aktif)' : '(Aktif)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-700">
                      <span>📧</span>
                      <span className="font-medium">
                        {currentVoucher.emailSent ? 'E-voucher telah dikirim ke email Anda' : 'E-voucher belum dikirim ke email'}
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mt-1">
                      {currentVoucher.emailSent ? (
                        <>
                          Dikirim pada: {currentVoucher.emailSentAt ? new Date(currentVoucher.emailSentAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Tidak diketahui'}
                        </>
                      ) : (
                        'Email akan dikirim secara otomatis'
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        if (currentVoucher.qrCode) {
                          // Download QR as image
                          const link = document.createElement('a');
                          link.download = `voucher-${currentVoucher.voucherCode}.png`;
                          link.href = `data:image/png;base64,${currentVoucher.qrCode}`;
                          link.click();
                        }
                      }}
                      className="px-4 py-2 rounded border border-[#0F4D39] text-[#0F4D39] hover:bg-[#f0f8f6] transition disabled:opacity-50"
                      disabled={!currentVoucher.qrCode}
                    >
                      Download QR Code
                    </button>
                    <button 
                      onClick={() => setShowEVoucher(false)} 
                      className="px-4 py-2 rounded bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}