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
  
  // New state for improved UI
  const [activeTab, setActiveTab] = useState('tickets');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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

  // New filtering and statistics functions
  const getFilteredTickets = () => {
    let filtered = [...tickets, ...userTickets];
    
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filterStatus);
    }
    
    return filtered;
  };

  const getTicketStats = () => {
    const allTickets = [...tickets, ...userTickets];
    return {
      total: allTickets.length,
      active: allTickets.filter(t => t.status === 'active').length,
      used: allTickets.filter(t => t.status === 'used').length,
      expired: allTickets.filter(t => t.status === 'expired').length,
      benefits: benefits.length,
      redeemedBenefits: benefits.filter(b => b.isRedeemed).length
    };
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-700 text-lg">Memuat tiket Anda...</div>
        </div>
      </div>
    );
  }

  const stats = getTicketStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-blue-600 text-xl">🎫</span>
              </div>
              <h1 className="text-gray-900 text-xl font-bold">My Tickets</h1>
            </div>
            <div className="hidden sm:flex items-center space-x-4 text-sm text-gray-600">
              <span>Total: {stats.total}</span>
              <span className="text-green-600">Aktif: {stats.active}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Total Tiket</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-100 p-1.5 sm:p-2 rounded-md sm:rounded-lg flex-shrink-0 ml-2">
                <span className="text-blue-600 text-sm sm:text-base">🎫</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Aktif</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-green-100 p-1.5 sm:p-2 rounded-md sm:rounded-lg flex-shrink-0 ml-2">
                <span className="text-green-600 text-sm sm:text-base">✓</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Terpakai</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.used}</p>
              </div>
              <div className="bg-orange-100 p-1.5 sm:p-2 rounded-md sm:rounded-lg flex-shrink-0 ml-2">
                <span className="text-orange-600 text-sm sm:text-base">📋</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-gray-600 truncate">Benefit</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">{stats.benefits}</p>
              </div>
              <div className="bg-purple-100 p-1.5 sm:p-2 rounded-md sm:rounded-lg flex-shrink-0 ml-2">
                <span className="text-purple-600 text-sm sm:text-base">🎁</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm border mb-6 sm:mb-8">
          <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Cari tiket atau event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-0 sm:min-w-[140px]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="used">Terpakai</option>
              <option value="expired">Kadaluarsa</option>
            </select>
          </div>
        </div>

        {/* Tabbed Navigation */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {[
                { id: 'benefits', label: 'Member Benefits', icon: '🎁', shortLabel: 'Benefits' },
                { id: 'tickets', label: 'Tiket Saya', icon: '🎫', shortLabel: 'Tiket' },
                { id: 'vouchers', label: 'Voucher Promo', icon: '🏷️', shortLabel: 'Voucher' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-w-0 flex-1 sm:flex-none ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm sm:text-base">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden text-xs">{tab.shortLabel}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {/* Tab Content */}
            {/* Benefits Tab */}
            {activeTab === 'benefits' && (
              <div>
                {benefits.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎁</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Benefit</h3>
                    <p className="text-gray-600">Benefit member akan muncul di sini</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:gap-6">
                    {benefits.map((benefit) => (
                      <div key={benefit.id} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-purple-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                          <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                            <div className="bg-purple-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                              <span className="text-purple-600 text-lg sm:text-2xl">🎁</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{benefit.title}</h3>
                              <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{benefit.description}</p>
                              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                                <span className="mr-1 sm:mr-2">📅</span>
                                <span className="truncate">Berlaku hingga: {benefit.validUntil ? new Date(benefit.validUntil).toLocaleDateString('id-ID') : 'Tidak terbatas'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-end sm:justify-start sm:ml-4 flex-shrink-0">
                            {benefit.isRedeemed ? (
                              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-green-100 text-green-800">
                                ✓ Sudah Diredeem
                              </span>
                            ) : benefit.userVouchers && benefit.userVouchers.length > 0 ? (
                              <button
                                onClick={() => {
                                  setCurrentVoucher(benefit.userVouchers[0]);
                                  setShowEVoucher(true);
                                }}
                                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                              >
                                👁️ <span className="ml-1 hidden sm:inline">Lihat Voucher</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => redeemBenefit(benefit.id)}
                                disabled={redeemingBenefitId === benefit.id}
                                className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:bg-gray-400 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                              >
                                {redeemingBenefitId === benefit.id ? '⏳' : '🎯'} <span className="ml-1 hidden sm:inline">{redeemingBenefitId === benefit.id ? 'Redeeming...' : 'Redeem Sekarang'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div>
                {getFilteredTickets().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🎫</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Tiket</h3>
                    <p className="text-gray-600">Tiket yang Anda klaim akan muncul di sini</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:gap-6">
                    {getFilteredTickets().map((ticket) => (
                      <div key={ticket.id} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-blue-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                          <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                            <div className="bg-blue-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                              <span className="text-blue-600 text-lg sm:text-2xl">🎫</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{ticket.name || ticket.eventName}</h3>
                              <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{ticket.description}</p>
                              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                                <span className="mr-1 sm:mr-2">📅</span>
                                <span className="truncate">Berlaku hingga: {ticket.validUntil ? new Date(ticket.validUntil).toLocaleDateString('id-ID') : 'Tidak terbatas'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-2">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              ticket.status === 'active' ? 'bg-green-100 text-green-800' :
                              ticket.status === 'used' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {getStatusIcon(ticket.status)} {ticket.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          <button
                            onClick={() => openPreview(ticket)}
                            className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                          >
                            👁️ <span className="ml-1 hidden sm:inline">Lihat Detail</span>
                          </button>
                          {ticket.qrCode && (
                            <button
                              onClick={() => downloadTicketPNG(ticket)}
                              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                            >
                              <span className="hidden sm:inline">📱 Download QR</span>
                              <span className="sm:hidden">📱 QR</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
              <div>
                {userTickets.filter(ticket => ticket.type === 'voucher').length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-6xl mb-4">🏷️</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Voucher</h3>
                    <p className="text-gray-600">Voucher promo yang Anda dapatkan akan muncul di sini</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:gap-6">
                    {userTickets.filter(ticket => ticket.type === 'voucher').map((voucher) => (
                      <div key={voucher.id} className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg sm:rounded-xl p-4 sm:p-6 border border-orange-200">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-3 sm:space-y-0">
                          <div className="flex items-start space-x-3 sm:space-x-4 flex-1">
                            <div className="bg-orange-100 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                              <span className="text-orange-600 text-lg sm:text-2xl">🏷️</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">{voucher.name}</h3>
                              <p className="text-gray-600 text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2">{voucher.description}</p>
                              <div className="flex items-center text-xs sm:text-sm text-gray-500">
                                <span className="mr-2">🎯</span>
                                <span className="truncate">Kode: {voucher.voucherCode || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end sm:flex-col sm:items-end space-x-2 sm:space-x-0 sm:space-y-2">
                            <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                              voucher.status === 'active' ? 'bg-green-100 text-green-800' :
                              voucher.status === 'used' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {getStatusIcon(voucher.status)} {voucher.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          <button
                            onClick={() => {
                              setCurrentVoucher(voucher);
                              setShowEVoucher(true);
                            }}
                            className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                          >
                            👁️ Lihat Voucher
                          </button>
                          {voucher.qrCode && (
                            <button
                              onClick={() => downloadTicketPNG(voucher)}
                              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-xs sm:text-sm font-medium"
                            >
                              <span className="hidden sm:inline">📱 Download QR</span>
                              <span className="sm:hidden">📱 QR</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E-Voucher Modal */}
      {showEVoucher && currentVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">E-Voucher</h3>
                <button
                  onClick={() => setShowEVoucher(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-6 mb-4 border border-orange-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {currentVoucher.benefit?.title || currentVoucher.name}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    {currentVoucher.benefit?.description || currentVoucher.description}
                  </p>
                  
                  {currentVoucher.qrCode && (
                    <div className="mb-4">
                      <img
                        src={currentVoucher.qrCode}
                        alt="QR Code"
                        className="w-48 h-48 mx-auto border rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-sm text-gray-600 mb-1">Kode Voucher:</p>
                    <p className="text-lg font-mono font-bold text-orange-600">
                      {currentVoucher.voucherCode || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Tanggal Redeem: {currentVoucher.redeemedAt ? 
                        new Date(currentVoucher.redeemedAt).toLocaleDateString('id-ID') : 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => printEvoucher(currentVoucher)}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium"
                  >
                    🖨️ Print
                  </button>
                  <button
                    onClick={() => setShowEVoucher(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Preview Modal */}
      {previewOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Detail Tiket</h3>
                <button
                  onClick={closePreview}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="text-center">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-4 border border-blue-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedTicket.name || selectedTicket.eventName}
                  </h4>
                  <p className="text-gray-600 mb-4">
                    {selectedTicket.description}
                  </p>
                  
                  {selectedTicket.qrCode && (
                    <div className="mb-4">
                      <img
                        src={selectedTicket.qrCode}
                        alt="QR Code"
                        className="w-48 h-48 mx-auto border rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Status:</p>
                        <p className="font-semibold">{selectedTicket.status}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Tipe:</p>
                        <p className="font-semibold">{selectedTicket.type || 'Tiket'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-600">Berlaku hingga:</p>
                        <p className="font-semibold">
                          {selectedTicket.validUntil ? 
                            new Date(selectedTicket.validUntil).toLocaleDateString('id-ID') : 
                            'Tidak terbatas'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  {selectedTicket.qrCode && (
                    <button
                      onClick={() => downloadTicketPNG(selectedTicket)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium"
                    >
                      📱 Download QR
                    </button>
                  )}
                  <button
                    onClick={closePreview}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg font-medium"
                  >
                    Tutup
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