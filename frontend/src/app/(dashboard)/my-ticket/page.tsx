"use client";
import { useEffect, useState } from "react";

export default function MyTicketPage() {
  const [user, setUser] = useState(null);
  const [benefits, setBenefits] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [userTickets, setUserTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedPromoId, setExpandedPromoId] = useState(null);
  const [redeemingBenefitId, setRedeemingBenefitId] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showEVoucher, setShowEVoucher] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState(null);

  useEffect(() => {
    fetchUserData();
    fetchBenefits();
    fetchTickets();
    fetchUserTickets();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };

  const fetchBenefits = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/member/benefits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBenefits(data);
      }
    } catch (error) {
      console.error("Error fetching benefits:", error);
    }
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/tickets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  };

  const fetchUserTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user-tickets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserTickets(data);
      }
    } catch (error) {
      console.error("Error fetching user tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const redeemBenefit = async (benefitId) => {
    try {
      setRedeemingBenefitId(benefitId);
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/member/benefits/${benefitId}/redeem`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert("Benefit berhasil diredeem!");
        fetchBenefits();
        fetchUserTickets();
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Gagal redeem benefit");
      }
    } catch (error) {
      console.error("Error redeeming benefit:", error);
      alert("Terjadi kesalahan saat redeem benefit");
    } finally {
      setRedeemingBenefitId(null);
    }
  };

  const openPreview = (ticket) => {
    setSelectedTicket(ticket);
    setPreviewOpen(true);
  };

  const closePreview = () => {
    setPreviewOpen(false);
    setSelectedTicket(null);
  };

  const downloadTicketPNG = async (ticket) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 400;
      canvas.height = 400;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 400);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 50, 50, 300, 300);
        
        const link = document.createElement("a");
        link.download = `ticket-${ticket.name}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = ticket.qrCode;
    } catch (error) {
      console.error("Error downloading ticket:", error);
      alert("Gagal download tiket");
    }
  };

  const downloadEvoucherPNG = async (voucher) => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = 400;
      canvas.height = 400;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 400, 400);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 50, 50, 300, 300);
        
        const link = document.createElement("a");
        link.download = `evoucher-${voucher.voucherCode}.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
      img.src = voucher.qrCode;
    } catch (error) {
      console.error("Error downloading e-voucher:", error);
      alert("Gagal download e-voucher");
    }
  };

  const printEvoucher = (voucher) => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>E-Voucher - ${voucher.benefit?.title || 'Voucher'}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
            .voucher { border: 2px solid #0F4D39; padding: 20px; margin: 20px auto; max-width: 400px; }
            .qr-code { margin: 20px 0; }
            .voucher-code { font-family: monospace; font-size: 18px; font-weight: bold; color: #0F4D39; }
          </style>
        </head>
        <body>
          <div class="voucher">
            <h2>${voucher.benefit?.title || 'E-Voucher'}</h2>
            <p>${voucher.benefit?.description || ''}</p>
            <div class="qr-code">
              <img src="${voucher.qrCode}" alt="QR Code" style="width: 200px; height: 200px;" />
            </div>
            <div class="voucher-code">${voucher.voucherCode || 'N/A'}</div>
            <p><small>Tanggal Redeem: ${voucher.redeemedAt ? new Date(voucher.redeemedAt).toLocaleDateString('id-ID') : 'N/A'}</small></p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "active":
        return "✓";
      case "used":
        return "✓";
      case "expired":
        return "⚠";
      default:
        return "•";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-800 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Professional Header */}
      <div className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="text-gray-800 text-lg sm:text-xl font-bold">🎫</span>
              <h1 className="text-gray-800 text-lg sm:text-xl font-bold">My Tickets</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="space-y-8 sm:space-y-10">
          
          {/* Benefit Member Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 sm:p-8 shadow-lg">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-gray-800 text-lg">🎁</span>
              <h2 className="text-gray-800 text-xl sm:text-2xl font-bold">Benefit Member</h2>
            </div>

            {benefits.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-red-500">⚠️</span>
                <p className="text-gray-600 mt-2">Belum ada benefit tersedia</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {benefits.map((benefit) => (
                  <div key={benefit.id} className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-800 text-2xl">🎁</span>
                        <div>
                          <h3 className="text-gray-800 font-semibold text-lg break-words">{benefit.title}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                            <span className="mr-2 text-base">📅</span>
                            <span>Berlaku hingga: {benefit.validUntil ? new Date(benefit.validUntil).toLocaleDateString('id-ID') : 'Tidak terbatas'}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedPromoId(expandedPromoId === benefit.id ? null : benefit.id)}
                        className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all"
                      >
                        {expandedPromoId === benefit.id ? '🔼 Tutup' : '🔽 Selengkapnya'}
                      </button>
                    </div>

                    {benefit.isRedeemed ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        ✓ Sudah Diredeem
                      </span>
                    ) : benefit.userVouchers && benefit.userVouchers.length > 0 ? (
                      <button
                        onClick={() => {
                          setCurrentVoucher(benefit.userVouchers[0]);
                          setShowEVoucher(true);
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium"
                      >
                        👁️ Lihat Voucher
                      </button>
                    ) : (
                      <button
                        onClick={() => redeemBenefit(benefit.id)}
                        disabled={redeemingBenefitId === benefit.id}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-all text-sm font-medium"
                      >
                        {redeemingBenefitId === benefit.id ? '⏳ Redeeming...' : '🎯 Redeem'}
                      </button>
                    )}

                    {expandedPromoId === benefit.id && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-start space-x-2">
                          <span className="mr-2">📋</span>
                          <div className="text-gray-700 text-sm">
                            <div className="break-words bg-gray-50 rounded-lg p-3 shadow-sm border border-gray-200">• {benefit.description}</div>
                            {benefit.terms && benefit.terms.map((term, idx) => (
                              <div key={idx} className="break-words bg-gray-50 rounded-lg p-3 shadow-sm border border-gray-200">• {term}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {benefits.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-3xl sm:text-4xl mb-2">🎁</div>
                <p className="text-gray-600">Belum ada benefit member tersedia</p>
              </div>
            )}
          </div>

          {/* Tiket Diklaim Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-gray-800 text-lg">🎫</span>
              <h2 className="text-gray-800 text-xl sm:text-2xl font-bold">Tiket Diklaim</h2>
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-12">
                <span className="text-red-500">⚠️</span>
                <p className="text-gray-600 mt-2">Belum ada tiket yang diklaim</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-gray-800 text-2xl">🎫</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'active' ? 'bg-green-100 text-green-800' : 
                        ticket.status === 'used' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusIcon(ticket.status)} {ticket.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 text-base">📍</span>
                        <span className="text-sm break-words text-gray-800">{ticket.eventName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">🎫</span>
                        <span className="text-sm break-words text-gray-800">{ticket.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">💰</span>
                        <span className="text-sm text-gray-800">Rp {ticket.price?.toLocaleString('id-ID') || '0'}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 text-base">📅</span>
                        <span className="text-sm text-gray-800">{new Date(ticket.eventDate).toLocaleDateString('id-ID')}</span>
                      </div>
                      {ticket.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          <span className="flex-shrink-0 text-base text-green-600">✓</span>
                          <span className="text-sm text-green-600">Siap digunakan</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => openPreview(ticket)}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                      >
                        👁️ Lihat Detail & QR
                      </button>
                      <button
                        onClick={() => downloadTicketPNG(ticket)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium"
                      >
                        📥 Download QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tickets.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-3">🎫</div>
                <p className="text-gray-600">Belum ada tiket yang diklaim</p>
              </div>
            )}
          </div>

          {/* Voucher Promo Diklaim Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-gray-800 text-xl">🎟️</span>
              <h2 className="text-gray-800 text-xl sm:text-2xl font-bold">Voucher Promo Diklaim</h2>
            </div>

            {userTickets.filter(ticket => ticket.type === 'voucher').length === 0 ? (
              <div className="text-center py-12">
                <span className="text-red-500 text-lg">⚠️</span>
                <p className="text-gray-600 mt-2">Belum ada voucher promo yang diklaim</p>
                <p className="text-gray-500 text-sm mt-1">Voucher promo akan muncul di sini setelah Anda mengklaimnya</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userTickets.filter(ticket => ticket.type === 'voucher').map((ticket) => (
                  <div key={ticket.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-gray-800 text-2xl">🎟️</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'active' ? 'bg-green-100 text-green-800' : 
                        ticket.status === 'used' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusIcon(ticket.status)} {ticket.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 text-base">📝</span>
                        <span className="text-sm break-words font-semibold text-gray-800">{ticket.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">🎫</span>
                        <span className="text-sm break-words text-gray-800">{ticket.description || 'Voucher Promo'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">📅</span>
                        <span className="text-sm text-gray-800">Berlaku: {ticket.validUntil ? new Date(ticket.validUntil).toLocaleDateString('id-ID') : 'Tidak terbatas'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">📅</span>
                        <span className="text-sm text-gray-800">Diklaim: {new Date(ticket.claimedAt).toLocaleDateString('id-ID')}</span>
                      </div>
                      {ticket.status === 'active' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-base text-green-600">✓</span>
                          <span className="text-sm text-green-600">Siap digunakan</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => {
                          setCurrentVoucher(ticket);
                          setShowEVoucher(true);
                        }}
                        className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                      >
                        👁️ Lihat E-Voucher
                      </button>
                      <button
                        onClick={() => downloadEvoucherPNG(ticket)}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium"
                      >
                        📥 Download QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {userTickets.filter(ticket => ticket.type === 'voucher').length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-4xl mb-3">🎟️</div>
                <p className="text-gray-600">Belum ada voucher promo yang diklaim</p>
              </div>
            )}
          </div>

          {/* User Tickets Section */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl shadow-lg p-6 sm:p-8">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-gray-800 text-xl">🎫</span>
              <h2 className="text-gray-800 text-xl sm:text-2xl font-bold">User Tickets</h2>
            </div>

            {error && (
              <div className="text-center py-8">
                <span className="text-red-500 text-lg">⚠️</span>
                <p className="text-red-600 mt-2">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-gray-100 rounded-lg p-4 sm:p-6 animate-pulse">
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded mb-4"></div>
                    <div className="h-8 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : userTickets.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-blue-400 text-4xl mb-3">🎫</div>
                <p className="text-gray-600">Belum ada user tickets</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
                {userTickets.map((ticket) => (
                  <div key={ticket.id} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg p-4 sm:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-white text-3xl sm:text-6xl">🎫</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        ticket.status === 'active' ? 'bg-green-100 text-green-800' : 
                        ticket.status === 'used' ? 'bg-gray-100 text-gray-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusIcon(ticket.status)} {ticket.status?.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-base">📅</span>
                        <span className="text-sm">Valid: {ticket.validUntil ? new Date(ticket.validUntil).toLocaleDateString('id-ID') : 'Tidak terbatas'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base">📊</span>
                        <span className="text-sm">Status: {ticket.status}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="flex-shrink-0 text-base">🔗</span>
                        <span className="text-xs font-mono break-all">{ticket.hash}</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => openPreview(ticket)}
                        className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-all text-sm font-medium"
                      >
                        👁️ Lihat QR Code
                      </button>
                      <button
                        onClick={() => downloadTicketPNG(ticket)}
                        className="flex-1 bg-white hover:bg-gray-100 text-blue-600 px-3 py-2 rounded-lg transition-all text-sm font-medium"
                      >
                        📥 Download Tiket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {previewOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#0F4D39]">Ticket Preview</h3>
                <button 
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-[#0F4D39] break-words">{selectedTicket.name}</h4>
                <p className="text-sm text-gray-600 break-all">Hash: {selectedTicket.hash}</p>
              </div>
              <div className="mt-4 text-center">
                <img src={selectedTicket.qrCode} alt="QR Code" className="w-32 h-32 sm:w-48 sm:h-48 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E-Voucher Modal */}
      {showEVoucher && currentVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#0F4D39]">E-Voucher</h3>
                <button 
                  onClick={() => setShowEVoucher(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl"
                >
                  ×
                </button>
              </div>

              <div className="text-center space-y-3 sm:space-y-4">
                <div>
                  <h4 className="font-semibold text-[#0F4D39] text-base sm:text-lg break-words">
                    {currentVoucher.benefit?.title || 'E-Voucher'}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {currentVoucher.benefit?.description || ''}
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Kode Voucher</div>
                  <div className="font-mono font-semibold text-[#0F4D39] text-base sm:text-lg break-all">
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
                      className="w-32 h-32 sm:w-48 sm:h-48 mx-auto border border-gray-200 rounded-lg"
                    />
                    {currentVoucher.isUsed && (
                      <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center rounded-lg">
                        <div className="bg-red-500 text-white px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-semibold transform rotate-12">
                          TERPAKAI
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <button 
                    onClick={() => downloadEvoucherPNG(currentVoucher)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Download QR
                  </button>
                  <button 
                    onClick={() => printEvoucher(currentVoucher)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
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