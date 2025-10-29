"use client";
import { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintableReceipt from './PrintableReceipt';

interface RedeemHistoryItem {
  id: string;
  memberId: string;
  memberName: string;
  voucherType: 'TICKET' | 'POINTS' | 'EVENT' | 'TOURISM_TICKET' | 'BENEFIT';
  voucherId: string;
  voucherLabel?: string;
  redeemedAt: string;
  adminId: string;
  adminName: string;
  proofUrl?: string;
}

interface ClaimedVoucher {
  id: string;
  memberId: string;
  memberName: string;
  type: 'ticket' | 'points' | 'event';
  itemId: string;
  itemName: string;
  status: 'PENDING' | 'REDEEMED';
  claimedAt: string;
  details?: any;
}

export default function AdminRedeemVoucher() {
    const [redeemHistory, setRedeemHistory] = useState<RedeemHistoryItem[]>([]);
  const [claimedVouchers, setClaimedVouchers] = useState<ClaimedVoucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter states
  const [filterType, setFilterType] = useState<"ALL" | "TICKET" | "POINTS" | "EVENT" | "TOURISM_TICKET" | "BENEFIT">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "REDEEMED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Modal states
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<ClaimedVoucher | null>(null);
  const [redeemLoading, setRedeemLoading] = useState(false);

  // Redeem by code states
  const [voucherCode, setVoucherCode] = useState("");
  const [codeRedeemLoading, setCodeRedeemLoading] = useState(false);

  // Print states
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      await Promise.all([loadRedeemHistory(), loadClaimedVouchers()]);
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    }
    setLoading(false);
  };

  const loadRedeemHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      if (filterType !== "ALL") params.append("type", filterType);
      if (dateFrom) params.append("from", dateFrom);
      if (dateTo) params.append("to", dateTo);
      if (searchQuery.trim()) params.append("member", searchQuery.trim());

      const response = await fetch(`/api/admin/redeem-history?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to load redeem history");
      const data = await response.json();
      setRedeemHistory(data);
    } catch (e: any) {
      throw new Error(e?.message || "Failed to load redeem history");
    }
  };

  const loadClaimedVouchers = async () => {
    try {
      const token = localStorage.getItem("token");
      
      // Load tickets (claimed vouchers)
      const ticketsResponse = await fetch(`/api/admin/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Load point redemptions
      const pointsResponse = await fetch(`/api/admin/point-redemptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Load event registrations
      const eventsResponse = await fetch(`/api/admin/event-registrations`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const tickets = ticketsResponse.ok ? await ticketsResponse.json() : [];
      const points = pointsResponse.ok ? await pointsResponse.json() : [];
      const events = eventsResponse.ok ? await eventsResponse.json() : [];

      // Combine and format data
      const combined: ClaimedVoucher[] = [
        ...tickets.map((t: any) => ({
          id: t.id,
          memberId: t.memberId,
          memberName: t.memberName || 'Unknown',
          type: 'ticket' as const,
          itemId: t.id,
          itemName: t.name,
          status: t.status === 'ACTIVE' ? 'PENDING' : 'REDEEMED',
          claimedAt: t.createdAt,
          details: t
        })),
        ...points.map((p: any) => ({
          id: p.id,
          memberId: p.memberId,
          memberName: p.memberName || 'Unknown',
          type: 'points' as const,
          itemId: p.id,
          itemName: p.rewardName,
          status: p.status === 'PENDING' ? 'PENDING' : 'REDEEMED',
          claimedAt: p.createdAt,
          details: p
        })),
        ...events.map((e: any) => ({
          id: e.id,
          memberId: e.memberId,
          memberName: e.memberName || 'Unknown',
          type: 'event' as const,
          itemId: e.id,
          itemName: e.eventName || 'Event Registration',
          status: e.status === 'REGISTERED' ? 'PENDING' : 'REDEEMED',
          claimedAt: e.createdAt,
          details: e
        }))
      ];

      setClaimedVouchers(combined);
    } catch (e: any) {
      throw new Error(e?.message || "Failed to load claimed vouchers");
    }
  };

  const handleRedeem = async (voucher: ClaimedVoucher) => {
    setSelectedVoucher(voucher);
    setShowRedeemModal(true);
  };

  const confirmRedeem = async () => {
    if (!selectedVoucher) return;
    
    setRedeemLoading(true);
    setError("");
    
    try {
      const token = localStorage.getItem("token");
      const payload = {
        memberId: selectedVoucher.memberId,
        type: selectedVoucher.type,
        ...(selectedVoucher.type === 'ticket' && { ticketId: selectedVoucher.itemId }),
        ...(selectedVoucher.type === 'points' && { redemptionId: selectedVoucher.itemId }),
        ...(selectedVoucher.type === 'event' && { 
          registrationId: selectedVoucher.itemId,
          eventId: selectedVoucher.details?.eventId 
        })
      };

      const response = await fetch(`/api/admin/redeem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to redeem voucher");
      }

      const result = await response.json();
      
      // Prepare print data
      const printDataForReceipt = {
        receiptNumber: `RCP-${Date.now()}`,
        memberName: selectedVoucher.memberName,
        memberId: selectedVoucher.memberId,
        voucherName: selectedVoucher.itemName,
        voucherType: getTypeLabel(selectedVoucher.type),
        redeemDate: new Date().toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        adminName: 'Admin', // You might want to get this from user context
        qrCode: result.qrCode || `REDEEM-${selectedVoucher.id}`,
        details: selectedVoucher.details
      };

      setPrintData(printDataForReceipt);
      setShowPrintModal(true);
      
      setSuccess(`Voucher berhasil di-redeem! ${result.proofUrl ? 'Bukti redeem telah dibuat.' : ''}`);
      setShowRedeemModal(false);
      setSelectedVoucher(null);
      loadData(); // Refresh data
    } catch (e: any) {
      setError(e?.message || "Failed to redeem voucher");
    }
    
    setRedeemLoading(false);
  };

  const handleRedeemByCode = async () => {
    if (!voucherCode.trim()) {
      setError("Silakan masukkan kode voucher");
      return;
    }

    setCodeRedeemLoading(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`/api/admin/redeem-by-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ voucherCode: voucherCode.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to redeem voucher");
      }

      const result = await response.json();
      
      // Prepare print data
      const printDataForReceipt = {
        receiptNumber: `RCP-${Date.now()}`,
        memberName: result.memberName,
        memberId: result.memberId,
        voucherName: result.voucherName,
        voucherType: result.voucherType,
        redeemDate: new Date().toLocaleDateString('id-ID', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        adminName: 'Admin',
        qrCode: result.qrCode || `REDEEM-${voucherCode}`,
        details: result.details
      };

      setPrintData(printDataForReceipt);
      setShowPrintModal(true);
      
      setSuccess(`Voucher dengan kode ${voucherCode} berhasil di-redeem untuk member ${result.memberName}!`);
      setVoucherCode("");
      loadData(); // Refresh data
    } catch (e: any) {
      setError(e?.message || "Failed to redeem voucher by code");
    }
    
    setCodeRedeemLoading(false);
  };

  const generatePDF = async () => {
    if (!printRef.current || !printData) return;

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`bukti-redeem-${printData.receiptNumber}.pdf`);
      setShowPrintModal(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Gagal membuat PDF. Silakan coba lagi.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter claimed vouchers
  const filteredClaimedVouchers = claimedVouchers.filter(voucher => {
    if (filterType !== "ALL" && voucher.type.toUpperCase() !== filterType) return false;
    if (filterStatus !== "ALL" && voucher.status !== filterStatus) return false;
    if (searchQuery.trim() && !voucher.memberName.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !voucher.itemName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (dateFrom && new Date(voucher.claimedAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(voucher.claimedAt) > new Date(dateTo)) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredClaimedVouchers.length / pageSize);
  const paginatedVouchers = filteredClaimedVouchers.slice((page - 1) * pageSize, page * pageSize);

  const getTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ticket': return 'Tiket';
      case 'points': return 'Poin';
      case 'event': return 'Event';
      case 'tourism_ticket': return 'Tiket Wisata';
      case 'benefit': return 'Benefit';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'PENDING':
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case 'REDEEMED':
        return `${baseClass} bg-green-100 text-green-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Redeem Voucher Member</h1>
        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Redeem by Code Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Redeem Voucher dengan Kode</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kode Voucher
            </label>
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Masukkan kode voucher (contoh: TKT-ABC123)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:border-transparent"
              disabled={codeRedeemLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleRedeemByCode();
                }
              }}
            />
          </div>
          <button
            onClick={handleRedeemByCode}
            disabled={codeRedeemLoading || !voucherCode.trim()}
            className="px-6 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {codeRedeemLoading ? "Memproses..." : "Redeem"}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Masukkan kode voucher yang diberikan kepada member untuk melakukan redeem langsung.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="TICKET">Tiket</option>
            <option value="POINTS">Poin</option>
            <option value="EVENT">Event</option>
            <option value="TOURISM_TICKET">Tiket Wisata</option>
            <option value="BENEFIT">Benefit</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Belum Redeem</option>
            <option value="REDEEMED">Sudah Redeem</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dari Tanggal</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sampai Tanggal</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari Member/Voucher</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nama member atau voucher..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Claimed Vouchers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Voucher yang Diklaim Member</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voucher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Klaim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Memuat data...
                  </td>
                </tr>
              ) : paginatedVouchers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada voucher yang diklaim
                  </td>
                </tr>
              ) : (
                paginatedVouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{voucher.memberName}</div>
                      <div className="text-sm text-gray-500">ID: {voucher.memberId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{voucher.itemName}</div>
                      <div className="text-sm text-gray-500">ID: {voucher.itemId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {getTypeLabel(voucher.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadge(voucher.status)}>
                        {voucher.status === 'PENDING' ? 'Belum Redeem' : 'Sudah Redeem'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(voucher.claimedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {voucher.status === 'PENDING' ? (
                        <button
                          onClick={() => handleRedeem(voucher)}
                          className="text-green-600 hover:text-green-900"
                        >
                          Redeem
                        </button>
                      ) : (
                        <span className="text-gray-400">Sudah di-redeem</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredClaimedVouchers.length)} dari {filteredClaimedVouchers.length} voucher
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
              >
                Sebelumnya
              </button>
              <span className="text-sm text-gray-700">
                Halaman {page} dari {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Redeem History Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Riwayat Redeem</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voucher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal Redeem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bukti
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {redeemHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Belum ada riwayat redeem
                  </td>
                </tr>
              ) : (
                redeemHistory.slice(0, 10).map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.memberName}</div>
                      <div className="text-sm text-gray-500">ID: {item.memberId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.voucherLabel || 'N/A'}</div>
                      <div className="text-sm text-gray-500">ID: {item.voucherId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {getTypeLabel(item.voucherType)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.redeemedAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.adminName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.proofUrl ? (
                        <a
                          href={item.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Lihat Bukti
                        </a>
                      ) : (
                        <span className="text-gray-400">Tidak ada</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Redeem Confirmation Modal */}
      {showRedeemModal && selectedVoucher && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6 border border-gray-200">
            <div className="text-lg font-semibold mb-4">Konfirmasi Redeem Voucher</div>
            
            <div className="space-y-3 mb-6">
              <div>
                <span className="text-sm font-medium text-gray-700">Member:</span>
                <div className="text-sm text-gray-900">{selectedVoucher.memberName}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Voucher:</span>
                <div className="text-sm text-gray-900">{selectedVoucher.itemName}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Tipe:</span>
                <div className="text-sm text-gray-900">{getTypeLabel(selectedVoucher.type)}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 mb-6">
              Apakah Anda yakin ingin me-redeem voucher ini? Tindakan ini tidak dapat dibatalkan.
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRedeemModal(false);
                  setSelectedVoucher(null);
                }}
                disabled={redeemLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmRedeem}
                disabled={redeemLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {redeemLoading ? "Memproses..." : "Ya, Redeem"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
       {showPrintModal && printData && (
         <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-lg w-full max-w-md p-6 border border-gray-200">
             <div className="text-lg font-semibold mb-4">Bukti Redeem Berhasil</div>
             
             <div className="text-sm text-gray-600 mb-6">
               Voucher berhasil di-redeem! Anda dapat mencetak atau mengunduh bukti redeem dalam format PDF.
             </div>
   
             <div className="flex justify-end space-x-3">
               <button
                 onClick={() => setShowPrintModal(false)}
                 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
               >
                 Tutup
               </button>
               <button
                 onClick={handlePrint}
                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
               >
                 Cetak
               </button>
               <button
                 onClick={generatePDF}
                 className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
               >
                 Download PDF
               </button>
             </div>
           </div>
         </div>
       )}
   
       {/* Hidden PrintableReceipt for PDF generation */}
       {printData && (
         <div className="fixed -top-[9999px] left-0 opacity-0 pointer-events-none">
           <div ref={printRef}>
             <PrintableReceipt data={printData} />
           </div>
         </div>
       )}
     </div>
   );
 }