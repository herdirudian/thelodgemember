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
  
  // New states for claimed tickets
  const [claimedTickets, setClaimedTickets] = useState<any[]>([]);
  const [claimedTicketsLoading, setClaimedTicketsLoading] = useState(true);
  const [claimedTicketsError, setClaimedTicketsError] = useState("");
  const [ticketFilter, setTicketFilter] = useState("ALL"); // ALL, ACTIVE, USED, EXPIRED
  const [selectedClaimedTicket, setSelectedClaimedTicket] = useState<any | null>(null);

  // New states for vouchers
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [vouchersError, setVouchersError] = useState("");
  const [voucherFilter, setVoucherFilter] = useState("ALL"); // ALL, ACTIVE, USED, EXPIRED

  useEffect(() => {
    loadTickets();
    loadBenefits();
    loadMyRedemptions();
    loadClaimedTickets();
    loadVouchers();
  }, []);

  async function loadTickets() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    
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

  async function loadBenefits() {
    const token = localStorage.getItem("token");
    if (!token) return;
    
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

  async function loadMyRedemptions() {
    const token = localStorage.getItem("token");
    if (!token) return;
    
    try {
      const res = await fetch(`/api/member/benefits/my-redemptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (res.ok) {
        setRedemptions(body || []);
      }
    } catch (e: any) {
      console.error('Failed to load redemptions:', e);
    }
  }

  async function loadClaimedTickets() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    
    setClaimedTicketsLoading(true);
    setClaimedTicketsError("");
    try {
      const res = await fetch(`/api/member/bookings/tourism-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem("token"); } catch {}
          window.location.href = "/login";
          return;
        }
        throw new Error("Failed to load claimed tickets");
      }
      
      const body = await res.json();
      setClaimedTickets(body.tickets || []);
    } catch (e: any) {
      console.log("Failed to load claimed tickets:", e.message);
      setClaimedTicketsError("Gagal memuat tiket yang diklaim. Silakan coba lagi.");
      setClaimedTickets([]);
    } finally {
      setClaimedTicketsLoading(false);
    }
  }

  async function loadVouchers() {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }
    
    setVouchersLoading(true);
    setVouchersError("");
    try {
      const res = await fetch(`/api/member/promos/my-vouchers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          try { localStorage.removeItem("token"); } catch {}
          window.location.href = "/login";
          return;
        }
        throw new Error(body.message || "Failed to load vouchers");
      }
      setVouchers(body.vouchers || []);
    } catch (err: any) {
      console.error("Load vouchers error:", err);
      setVouchersError(err.message || "Failed to load vouchers");
    } finally {
      setVouchersLoading(false);
    }
  }

  // Helper functions for claimed tickets
  function getFilteredClaimedTickets() {
    if (ticketFilter === "ALL") return claimedTickets;
    return claimedTickets.filter(ticket => ticket.status === ticketFilter);
  }

  // Helper functions for vouchers
  function getFilteredVouchers() {
    if (voucherFilter === "ALL") return vouchers;
    return vouchers.filter(voucher => voucher.status === voucherFilter);
  }

  function getStatusBadgeColor(status: string) {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "USED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "EXPIRED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "ACTIVE":
        return "✓";
      case "USED":
        return "✓";
      case "EXPIRED":
        return "⚠";
      default:
        return "•";
    }
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  }

  function openClaimedTicketDetail(ticket: any) {
    setSelectedClaimedTicket(ticket);
  }

  function closeClaimedTicketDetail() {
    setSelectedClaimedTicket(null);
  }

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
      
      // Reload redemptions to get the updated list
      await loadMyRedemptions();
      alert("Benefit berhasil diredeem!");
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
    if (redemption) {
      setCurrentVoucher(redemption);
      setShowEVoucher(true);
    }
  }

  function downloadEvoucherPNG(redemption: any) {
    if (!redemption.qrCode) {
      alert("QR Code tidak tersedia");
      return;
    }
    
    const link = document.createElement('a');
    link.download = `evoucher-${redemption.voucherCode || 'voucher'}.png`;
    link.href = redemption.qrCode;
    link.click();
  }

  function printEvoucher(redemption: any) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>E-Voucher - ${redemption.benefit?.title || 'Voucher'}</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
              .voucher { border: 2px solid #0F4D39; padding: 20px; margin: 20px auto; max-width: 400px; }
              .qr-code { margin: 20px 0; }
              .voucher-code { font-size: 18px; font-weight: bold; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="voucher">
              <h2>${redemption.benefit?.title || 'E-Voucher'}</h2>
              <p>${redemption.benefit?.description || ''}</p>
              <div class="voucher-code">Kode: ${redemption.voucherCode || 'N/A'}</div>
              <div class="qr-code">
                <img src="${redemption.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p>Tanggal Redeem: ${redemption.redeemedAt ? new Date(redemption.redeemedAt).toLocaleDateString('id-ID') : 'N/A'}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-[#0F4D39]">My Tickets</h1>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-800 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Benefit Member Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0F4D39] mb-4">Benefit Member</h2>
            {benefitError && <div className="text-red-600 text-sm mb-2">{benefitError}</div>}
            
            {benefitLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {benefits.map((benefit) => (
                  <div key={benefit.id} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
                    <div className="flex items-start gap-4">
                      {benefit.imageUrl ? (
                        <img src={benefit.imageUrl} alt={benefit.title} className="w-20 h-20 object-cover rounded-lg" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#0F4D39] to-[#0e3f30] flex items-center justify-center">
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
                                className="px-3 py-1.5 text-sm rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition"
                              >
                                Lihat Voucher
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => redeemBenefit(benefit.id)}
                              disabled={redeemingBenefitId === benefit.id}
                              className="px-3 py-1.5 text-sm rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition disabled:opacity-50"
                            >
                              {redeemingBenefitId === benefit.id ? 'Redeeming...' : 'Redeem'}
                            </button>
                          )}
                        </div>
                        
                        {expandedPromoId === benefit.id && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm text-gray-700">
                              <div className="font-medium mb-2">Detail Benefit:</div>
                              <div className="space-y-1">
                                <div>• {benefit.description}</div>
                                {benefit.terms && benefit.terms.map((term: string, idx: number) => (
                                  <div key={idx}>• {term}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {benefits.length === 0 && (
                  <div className="col-span-2 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-gray-400 text-4xl mb-2">🎁</div>
                    <div className="text-sm text-gray-600">Belum ada benefit yang tersedia.</div>
                    <div className="text-xs text-gray-500 mt-1">Benefit member akan muncul di sini.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Claimed Tourism Tickets Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F4D39]">Tiket Diklaim</h2>
              <div className="flex gap-2">
                <select
                  value={ticketFilter}
                  onChange={(e) => setTicketFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:border-transparent"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="USED">Terpakai</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>

            {claimedTicketsError && <div className="text-red-600 text-sm mb-2">{claimedTicketsError}</div>}
            
            {claimedTicketsLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {getFilteredClaimedTickets().map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {ticket.imageUrl ? (
                        <img src={ticket.imageUrl} alt={ticket.ticketName} className="w-20 h-20 object-cover rounded-lg" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#0F4D39] to-[#0e3f30] flex items-center justify-center">
                          <span className="text-white text-2xl">🎫</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-[#0F4D39] font-semibold text-lg">{ticket.ticketName}</div>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadgeColor(ticket.status)}`}>
                            {getStatusIcon(ticket.status)} {ticket.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <span>📍</span>
                            <span>{ticket.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>🎫</span>
                            <span>{ticket.quantity} tiket</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>💰</span>
                            <span className="font-medium text-[#0F4D39]">{formatPrice(ticket.totalPrice)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>Berlaku hingga: {new Date(ticket.validDate).toLocaleDateString('id-ID')}</span>
                          </div>
                          {ticket.usedAt && (
                            <div className="flex items-center gap-1">
                              <span>✓</span>
                              <span>Digunakan: {new Date(ticket.usedAt).toLocaleDateString('id-ID')}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => openClaimedTicketDetail(ticket)}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition"
                          >
                            Lihat Detail & QR
                          </button>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `ticket-${ticket.voucherCode}.png`;
                              link.href = ticket.qrCode;
                              link.click();
                            }}
                            className="px-3 py-1.5 text-sm rounded-lg border border-[#0F4D39] text-[#0F4D39] hover:bg-[#f0f8f6] transition"
                          >
                            Download QR
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getFilteredClaimedTickets().length === 0 && (
                  <div className="col-span-2 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-gray-400 text-4xl mb-2">🎫</div>
                    <div className="text-sm text-gray-600">
                      {ticketFilter === "ALL" ? "Belum ada tiket yang diklaim." : `Tidak ada tiket dengan status ${ticketFilter}.`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Tiket yang sudah dibeli akan muncul di sini.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Claimed Promo Vouchers Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0F4D39]">Voucher Promo Diklaim</h2>
              <div className="flex gap-2">
                <select
                  value={voucherFilter}
                  onChange={(e) => setVoucherFilter(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:border-transparent"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="ACTIVE">Aktif</option>
                  <option value="USED">Terpakai</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>

            {vouchersError && <div className="text-red-600 text-sm mb-2">{vouchersError}</div>}
            
            {vouchersLoading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {getFilteredVouchers().map((voucher) => (
                  <div key={voucher.id} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      {voucher.imageUrl ? (
                        <img src={voucher.imageUrl} alt={voucher.title} className="w-20 h-20 object-cover rounded-lg" />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center">
                          <span className="text-white text-2xl">🎟️</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="text-[#0F4D39] font-semibold text-lg">{voucher.title}</div>
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusBadgeColor(voucher.status)}`}>
                            {getStatusIcon(voucher.status)} {voucher.status}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-600">
                          {voucher.description && (
                            <div className="flex items-start gap-1">
                              <span>📝</span>
                              <span className="line-clamp-2">{voucher.description}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span>🎫</span>
                            <span>Kode: {voucher.voucherCode}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>Berlaku hingga: {new Date(voucher.validUntil).toLocaleDateString('id-ID')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>Diklaim: {new Date(voucher.createdAt).toLocaleDateString('id-ID')}</span>
                          </div>
                          {voucher.usedAt && (
                            <div className="flex items-center gap-1">
                              <span>✓</span>
                              <span>Digunakan: {new Date(voucher.usedAt).toLocaleDateString('id-ID')}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => {
                              setCurrentVoucher(voucher);
                              setShowEVoucher(true);
                            }}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
                          >
                            Lihat E-Voucher
                          </button>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `voucher-${voucher.voucherCode}.png`;
                              link.href = voucher.qrCode;
                              link.click();
                            }}
                            className="px-3 py-1.5 text-sm rounded-lg border border-purple-600 text-purple-600 hover:bg-purple-50 transition"
                          >
                            Download QR
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getFilteredVouchers().length === 0 && (
                  <div className="col-span-2 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-gray-400 text-4xl mb-2">🎟️</div>
                    <div className="text-sm text-gray-600">
                      {voucherFilter === "ALL" ? "Belum ada voucher promo yang diklaim." : `Tidak ada voucher dengan status ${voucherFilter}.`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Voucher promo yang sudah didaftarkan akan muncul di sini.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Tickets Section */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-[#0F4D39] mb-4">Tiket Saya</h2>
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
            
            {loading ? (
              <div className="grid md:grid-cols-2 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card p-6 animate-pulse">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-lg border border-gray-200 p-4 bg-white shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#0F4D39] to-[#0e3f30] flex items-center justify-center">
                        <span className="text-white text-2xl">🎫</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-[#0F4D39] font-semibold text-lg">{ticket.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          Berlaku hingga: {new Date(ticket.validUntil).toLocaleDateString('id-ID')}
                        </div>
                        <div className="text-sm text-gray-600">
                          Status: <span className="font-medium">{ticket.status || 'Active'}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Hash: <span className="font-mono text-xs">{ticket.hash}</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button 
                            onClick={() => openPreview(ticket)}
                            className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition"
                          >
                            Lihat QR Code
                          </button>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.download = `ticket-${ticket.hash}.png`;
                              link.href = ticket.qrCode;
                              link.click();
                            }}
                            className="px-3 py-1.5 text-sm rounded-lg border border-[#0F4D39] text-[#0F4D39] hover:bg-[#f0f8f6] transition"
                          >
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {tickets.length === 0 && (
                  <div className="col-span-2 rounded-lg border border-gray-200 p-6 text-center">
                    <div className="text-gray-400 text-4xl mb-2">🎫</div>
                    <div className="text-sm text-gray-600">Belum ada tiket.</div>
                    <div className="text-xs text-gray-500 mt-1">Tiket yang Anda beli akan muncul di sini.</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Claimed Ticket Detail Modal */}
      {selectedClaimedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0F4D39]">Detail Tiket</h3>
                <button 
                  onClick={closeClaimedTicketDetail}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Ticket Image */}
                <div className="w-full h-48 rounded-lg overflow-hidden">
                  {selectedClaimedTicket.imageUrl ? (
                    <img 
                      src={selectedClaimedTicket.imageUrl} 
                      alt={selectedClaimedTicket.ticketName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0F4D39] to-[#0e3f30] flex items-center justify-center">
                      <span className="text-white text-6xl">🎫</span>
                    </div>
                  )}
                </div>

                {/* Ticket Info */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-[#0F4D39] text-xl">{selectedClaimedTicket.ticketName}</h4>
                    <p className="text-gray-600 text-sm mt-1">{selectedClaimedTicket.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Kode Voucher:</span>
                      <div className="font-mono font-semibold text-[#0F4D39]">{selectedClaimedTicket.voucherCode}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <div className={`inline-block px-2 py-1 text-xs rounded-full border ${getStatusBadgeColor(selectedClaimedTicket.status)}`}>
                        {getStatusIcon(selectedClaimedTicket.status)} {selectedClaimedTicket.status}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Lokasi:</span>
                      <div className="font-medium">{selectedClaimedTicket.location}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Jumlah:</span>
                      <div className="font-medium">{selectedClaimedTicket.quantity} tiket</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Total Harga:</span>
                      <div className="font-semibold text-[#0F4D39]">{formatPrice(selectedClaimedTicket.totalPrice)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Berlaku hingga:</span>
                      <div className="font-medium">{new Date(selectedClaimedTicket.validDate).toLocaleDateString('id-ID')}</div>
                    </div>
                    {selectedClaimedTicket.bookingDate && (
                      <div>
                        <span className="text-gray-500">Tanggal Booking:</span>
                        <div className="font-medium">{new Date(selectedClaimedTicket.bookingDate).toLocaleDateString('id-ID')}</div>
                      </div>
                    )}
                    {selectedClaimedTicket.usedAt && (
                      <div>
                        <span className="text-gray-500">Digunakan:</span>
                        <div className="font-medium">{new Date(selectedClaimedTicket.usedAt).toLocaleDateString('id-ID')}</div>
                      </div>
                    )}
                  </div>

                  {/* QR Code Section */}
                  <div className="border-t pt-4">
                    <div className="text-center">
                      <h5 className="font-semibold text-[#0F4D39] mb-3">QR Code Tiket</h5>
                      <div className="relative inline-block">
                        <img 
                          src={selectedClaimedTicket.qrCode} 
                          alt="QR Code"
                          className="w-48 h-48 mx-auto border border-gray-200 rounded-lg"
                        />
                        {selectedClaimedTicket.status === 'USED' && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold transform rotate-12">
                              TERPAKAI
                            </div>
                          </div>
                        )}
                        {selectedClaimedTicket.status === 'EXPIRED' && (
                          <div className="absolute inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                            <div className="bg-gray-500 text-white px-3 py-1 rounded-full text-sm font-semibold transform rotate-12">
                              EXPIRED
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Tunjukkan QR code ini saat menggunakan tiket
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4">
                    <button 
                      onClick={() => {
                        const link = document.createElement('a');
                        link.download = `ticket-${selectedClaimedTicket.voucherCode}.png`;
                        link.href = selectedClaimedTicket.qrCode;
                        link.click();
                      }}
                      className="flex-1 px-4 py-2 bg-[#0F4D39] text-white rounded-lg hover:bg-[#0e3f30] transition text-sm font-medium"
                    >
                      Download QR Code
                    </button>
                    <button 
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: selectedClaimedTicket.ticketName,
                            text: `Tiket ${selectedClaimedTicket.ticketName} - Kode: ${selectedClaimedTicket.voucherCode}`,
                            url: selectedClaimedTicket.qrCode
                          });
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-[#0F4D39] text-[#0F4D39] rounded-lg hover:bg-[#f0f8f6] transition text-sm font-medium"
                    >
                      Bagikan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0F4D39]">Ticket Preview</h3>
                <button 
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-[#0F4D39]">{selectedTicket.name}</h4>
                <p className="text-sm text-gray-600">Hash: {selectedTicket.hash}</p>
              </div>
              <div className="mt-4 text-center">
                <img src={selectedTicket.qrCode} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E-Voucher Modal */}
      {showEVoucher && currentVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0F4D39]">E-Voucher</h3>
                <button 
                  onClick={() => setShowEVoucher(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="text-center space-y-4">
                <div>
                  <h4 className="font-semibold text-[#0F4D39] text-lg">
                    {currentVoucher.benefit?.title || 'E-Voucher'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentVoucher.benefit?.description || ''}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Kode Voucher</div>
                  <div className="font-mono font-semibold text-[#0F4D39] text-lg">
                    {currentVoucher.voucherCode || 'N/A'}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Tanggal Redeem: {currentVoucher.redeemedAt ? new Date(currentVoucher.redeemedAt).toLocaleDateString('id-ID') : 'N/A'}
                </div>

                <div className="text-xs text-gray-600 text-left bg-blue-50 p-3 rounded-lg">
                  Cara Penggunaan:<br/>
                  1. Tunjukkan QR code ini kepada petugas<br/>
                  2. Pastikan kode voucher sesuai<br/>
                  3. Voucher hanya dapat digunakan sekali
                </div>

                {currentVoucher.qrCode && (
                  <div className="relative">
                    <img 
                      src={currentVoucher.qrCode} 
                      alt="QR Code" 
                      className="w-48 h-48 mx-auto border border-gray-200 rounded-lg"
                    />
                    {currentVoucher.isUsed && (
                      <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold transform rotate-12">
                          TERPAKAI
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => downloadEvoucherPNG(currentVoucher)}
                    className="flex-1 px-4 py-2 bg-[#0F4D39] text-white rounded-lg hover:bg-[#0e3f30] transition text-sm"
                  >
                    Download QR
                  </button>
                  <button 
                    onClick={() => printEvoucher(currentVoucher)}
                    className="flex-1 px-4 py-2 border border-[#0F4D39] text-[#0F4D39] rounded-lg hover:bg-[#f0f8f6] transition text-sm"
                  >
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}