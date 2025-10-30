"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconGift, IconClock } from '@tabler/icons-react';

export default function RedeemPointsPage() {
  const router = useRouter();
  // Gunakan path relatif agar permintaan di-proxy oleh Next.js (lihat rewrites di next.config.ts)
  // Ini menghindari masalah CORS/akses localhost dari webview.
  const API = '';
  const [me, setMe] = useState<any>(null);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [rewardName, setRewardName] = useState('Voucher 50k');
  const [points, setPoints] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; promo: any | null; points: number }>({ open: false, promo: null, points: 0 });
  const [successState, setSuccessState] = useState<{ open: boolean; redemption: any | null }>({ open: false, redemption: null });
  const [voucherModal, setVoucherModal] = useState<{ open: boolean; redemption: any | null }>({ open: false, redemption: null });

  // Helper aman untuk parsing response JSON; fallback ke text jika bukan JSON
  async function parseResponse(res: Response): Promise<{ ok: boolean; data: any; text: string }> {
    try {
      const txt = await res.text();
      let data: any = null;
      try { data = txt ? JSON.parse(txt) : null; } catch { data = null; }
      return { ok: res.ok, data, text: txt };
    } catch (e: any) {
      return { ok: false, data: null, text: e?.message || 'Failed to read response' };
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      const token = localStorage.getItem('token');
      if (!token) { router.push('/login'); return; }
      try {
        const [meRes, listRes, promosRes] = await Promise.all([
          fetch(`/api/member/me`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        fetch(`/api/member/points/my`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal }),
        fetch(`/api/member/promos`, { signal: controller.signal }),
        ]);
        const meParsed = await parseResponse(meRes);
        const listParsed = await parseResponse(listRes);
        const promosParsed = await parseResponse(promosRes);
        if (meRes.status === 401) { router.push('/login'); return; }
        if (!meParsed.ok) throw new Error(meParsed.data?.message || meParsed.text || 'Failed to load profile');
        if (!listParsed.ok) throw new Error(listParsed.data?.message || listParsed.text || 'Failed to load redemptions');
        if (!promosParsed.ok) throw new Error(promosParsed.data?.message || promosParsed.text || 'Failed to load promos');
        setMe(meParsed.data);
        setRedemptions(listParsed.data?.redemptions || []);
        setPromos((promosParsed.data || []).filter((p: any) => {
          const type = String(p.type || '').toUpperCase();
          const category = String(p.category || '').toUpperCase();
          const required = (p.pointsRequired ?? p.points ?? p.requiredPoints ?? 0);
          return (type === 'REDEEM_POINTS' || category === 'REDEEM') && required > 0;
        }));
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

  async function redeemPromo(promo: any) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return router.push('/login');
      const pointsNeed = promo?.pointsRequired ?? 0;
      if (pointsNeed <= 0) return alert('Promo tidak valid untuk redeem poin');
      const balance = me?.member?.pointsBalance ?? 0;
      if (balance < pointsNeed) return alert('Poin Anda tidak mencukupi');
      const res = await fetch(`/api/member/points/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rewardName: promo.title, points: pointsNeed, promoId: promo.id }),
      });
      const parsed = await parseResponse(res);
      if (!parsed.ok) {
        alert(parsed.data?.message || parsed.text || 'Failed to redeem');
        return;
      }
      // Tampilkan notifikasi sukses dan opsi melihat voucher
      setSuccessState({ open: true, redemption: parsed.data?.redemption });
      setVoucherModal({ open: true, redemption: parsed.data?.redemption });
      setRedemptions((prev) => [parsed.data?.redemption, ...prev]);
      setMe((prev: any) => ({ ...prev, member: { ...prev.member, pointsBalance: Math.max((prev.member.pointsBalance || 0) - pointsNeed, 0) } }));
    } catch (e: any) {
      alert(e?.message || 'Failed to redeem');
    }
  }

  async function redeem() {
    const token = localStorage.getItem('token');
    if (!token) return router.push('/login');
    const balance = me?.member?.pointsBalance ?? 0;
    if (balance < points) {
      alert('Poin Anda tidak mencukupi');
      return;
    }
    const res = await fetch(`/api/member/points/redeem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rewardName, points }),
    });
    const parsed = await parseResponse(res);
    if (!parsed.ok) {
      alert(parsed.data?.message || parsed.text || 'Failed to redeem');
      return;
    }
    alert('Redeemed! E-voucher generated.');
    setRedemptions((prev) => [parsed.data?.redemption, ...prev]);
    setMe((prev: any) => ({ ...prev, member: { ...prev.member, pointsBalance: Math.max((prev.member.pointsBalance || 0) - points, 0) } }));
  }

  const openVoucherPreview = (redemption?: any) => {
    const toShow = redemption || successState.redemption;
    if (!toShow) return;
    setVoucherModal({ open: true, redemption: toShow });
  };

  const downloadVoucher = (redemption: any) => {
    try {
      const w = window.open('', '_blank', 'width=800,height=900');
      if (!w) return alert('Pop-up diblokir, izinkan pop-up untuk mengunduh voucher.');
      const rewardName = redemption?.rewardName || 'Voucher';
      const code = redemption?.friendlyCode || redemption?.id || '—';
      const pointsUsed = redemption?.pointsUsed ?? 0;
      const quantity = redemption?.quantity ?? redemption?.qty ?? 1;
      const qrSrc = redemption?.qr || '';
      const statusText = String(redemption?.status || '').toUpperCase() === 'REDEEMED' ? 'Sudah digunakan' : 'Aktif';
      const howTo = 'Tunjukkan QR ini kepada petugas dan sebutkan kode voucher. Petugas akan memverifikasi dan mencatat penukaran.';
      w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Voucher ${rewardName}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0F4D39; padding: 24px; }
          .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
          .row { margin-top: 8px; }
          .label { font-size: 12px; color: #6b7280; }
          .value { font-weight: 600; }
          .qr { margin-top: 16px; text-align: center; }
          .qr img { width: 220px; height: 220px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .actions { margin-top: 16px; text-align: right; }
          .hint { margin-top: 8px; font-size: 12px; color: #6b7280; }
        </style></head><body>
        <h2>Voucher Redeem Poin</h2>
        <div class="card">
          <div class="row"><span class="label">Nama Voucher</span><div class="value">${rewardName}</div></div>
          <div class="row"><span class="label">Jumlah Voucher</span><div class="value">${quantity}</div></div>
          <div class="row"><span class="label">Kode Voucher</span><div class="value">${code}</div></div>
          <div class="row"><span class="label">Poin Digunakan</span><div class="value">${pointsUsed}</div></div>
          <div class="row"><span class="label">Status</span><div class="value">${statusText}</div></div>
          <div class="qr"><img src="${qrSrc}" alt="QR Voucher" /></div>
          <div class="row"><span class="label">Cara Redeem</span><div class="value">${howTo}</div></div>
          <div class="hint">Disarankan pilih "Save as PDF" saat print untuk menyimpan voucher.</div>
        </div>
        <div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>
      </body></html>`);
      w.document.close();
    } catch (e) {
      alert('Gagal menyiapkan unduhan voucher');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat redeem points...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <IconArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Profil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Redeem Points</h1>
          <p className="text-gray-600 mt-2">Tukar poin Anda dengan berbagai reward menarik</p>
        </div>

        {/* Success Message */}
        {successState.open && successState.redemption && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <IconGift className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-900 mb-1">
                  Berhasil Diredeem!
                </h3>
                <p className="text-green-700 mb-3">
                  {successState.redemption.rewardName} telah berhasil ditukarkan. Lihat voucher untuk detailnya.
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={openVoucherPreview} 
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Lihat Voucher
                  </button>
                  <button 
                    onClick={() => downloadVoucher(successState.redemption)} 
                    className="px-4 py-2 border border-green-600 text-green-700 bg-white hover:bg-green-50 rounded-lg focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                  >
                    Download Voucher
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Points Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Poin Anda
              </h2>
              <div className="text-3xl font-bold text-blue-600">
                {(me?.member?.pointsBalance ?? 0).toLocaleString()}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Poin tersedia untuk ditukar
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <IconGift className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Available Rewards */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Rewards Tersedia
          </h2>
          
          {promos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <IconGift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Tidak Ada Reward
              </h3>
              <p className="text-gray-600">
                Belum ada promo redeem poin yang tersedia saat ini
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {promos.map((p) => {
                const requiredPoints = (p.pointsRequired ?? p.points ?? p.requiredPoints ?? 0);
                const enough = (me?.member?.pointsBalance ?? 0) >= requiredPoints;
                const descShort = String(p.description || '').slice(0, 120);
                
                return (
                  <div
                    key={p.id}
                    className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg ${
                      !enough ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="aspect-w-16 aspect-h-9">
                      <img 
                        src={p.imageUrl || '/file.svg'} 
                        alt={p.title} 
                        onError={(e) => { 
                          (e.currentTarget as HTMLImageElement).onerror = null; 
                          (e.currentTarget as HTMLImageElement).src = '/file.svg'; 
                        }} 
                        className="w-full h-48 object-cover"
                      />
                    </div>
                    
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <IconGift className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                          Redeem
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {p.title}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4">
                        {descShort}{String(p.description || '').length > 120 ? '...' : ''}
                      </p>

                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1">
                          <IconGift className="w-4 h-4 text-blue-600" />
                          <span className="text-lg font-bold text-blue-600">
                            {requiredPoints.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500">poin</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setConfirmState({ open: true, promo: { ...p, pointsRequired: requiredPoints }, points: requiredPoints })}
                        disabled={!enough}
                        className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          !enough
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }`}
                      >
                        {enough ? 'Tukar Sekarang' : 'Poin Tidak Cukup'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Redemption History */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Riwayat Penukaran
          </h2>
          
          {redemptions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <IconGift className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Belum Ada Penukaran
              </h3>
              <p className="text-gray-600">
                Anda belum melakukan penukaran poin. Mulai tukar poin Anda dengan reward menarik di atas!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {redemptions.map((r) => {
                const isRedeemed = String(r.status || '').toUpperCase() === 'REDEEMED';
                
                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-200 hover:shadow-lg"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="p-2 rounded-lg bg-green-100">
                          <IconGift className="w-5 h-5 text-green-600" />
                        </div>
                        {isRedeemed ? (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full">
                            Sudah Digunakan
                          </span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                            Aktif
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {r.rewardName}
                      </h3>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Poin Digunakan:</span>
                          <span className="font-medium text-gray-900">{r.pointsUsed?.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Jumlah:</span>
                          <span className="font-medium text-gray-900">{r?.quantity ?? r?.qty ?? 1}</span>
                        </div>
                        {r.createdAt && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <IconClock className="w-3 h-3" />
                            {new Date(r.createdAt).toLocaleDateString('id-ID', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
                      </div>

                      {r.qr && (
                        <div className="mb-4">
                          <img src={r.qr} alt="QR Code" className="w-24 h-24 border border-gray-200 rounded-lg mx-auto" />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button 
                          onClick={() => openVoucherPreview(r)} 
                          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                        >
                          Lihat Voucher
                        </button>
                        {isRedeemed ? (
                          <button 
                            disabled 
                            className="flex-1 px-3 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed text-sm font-medium"
                          >
                            Sudah Digunakan
                          </button>
                        ) : (
                          <button 
                            onClick={() => downloadVoucher(r)} 
                            className="flex-1 px-3 py-2 border border-blue-600 text-blue-700 bg-white hover:bg-blue-50 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors text-sm font-medium"
                          >
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmState.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IconGift className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Konfirmasi Penukaran
                </h3>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-600 mb-3">
                  Anda akan menukarkan poin untuk reward berikut:
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="font-medium text-gray-900 mb-1">
                    {confirmState.promo?.title}
                  </div>
                  <div className="flex items-center gap-1 text-blue-600">
                    <IconGift className="w-4 h-4" />
                    <span className="font-bold">{confirmState.points?.toLocaleString()}</span>
                    <span className="text-sm">poin</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmState({ open: false, promo: null, points: 0 })} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() => { 
                    const p = confirmState.promo; 
                    setConfirmState({ open: false, promo: null, points: 0 }); 
                    if (p) redeemPromo(p); 
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Ya, Tukar Sekarang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Modal */}
        {voucherModal.open && voucherModal.redemption && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl p-6 w-[90%] max-w-md shadow-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <IconGift className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Voucher Redeem
                </h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">
                      {voucherModal.redemption.rewardName}
                    </div>
                    <div className="text-lg font-mono font-bold text-blue-600 mb-3 tracking-wider">
                      {voucherModal.redemption.friendlyCode || voucherModal.redemption.id}
                    </div>
                    
                    {String(voucherModal.redemption?.status || '').toUpperCase() === 'REDEEMED' ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
                        Sudah Digunakan
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-600">
                        Aktif
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 mb-1">Jumlah Voucher</div>
                    <div className="font-medium text-gray-900">{(voucherModal.redemption?.quantity ?? voucherModal.redemption?.qty ?? 1)}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 mb-1">Poin Digunakan</div>
                    <div className="font-medium text-gray-900">{voucherModal.redemption.pointsUsed?.toLocaleString()}</div>
                  </div>
                </div>
                
                {voucherModal.redemption.qr && (
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">QR Code</div>
                    <img src={voucherModal.redemption.qr} alt="QR Voucher" className="w-32 h-32 border border-gray-200 rounded-lg mx-auto" />
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-xs text-yellow-800">
                    <strong>Cara Redeem:</strong> Tunjukkan QR ini kepada petugas dan sebutkan kode voucher. Petugas akan memverifikasi dan mencatat penukaran.
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setVoucherModal({ open: false, redemption: null })} 
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Tutup
                </button>
                {String(voucherModal.redemption?.status || '').toUpperCase() !== 'REDEEMED' && (
                  <button 
                    onClick={() => downloadVoucher(voucherModal.redemption)} 
                    className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Voucher
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}