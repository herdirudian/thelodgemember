"use client";
import { useEffect, useState } from "react";

interface PointTransaction {
  id: string;
  memberId: string;
  memberName: string;
  memberEmail: string;
  type: "EARNED" | "REDEEMED" | "ADJUSTED" | "EXPIRED";
  points: number;
  description: string;
  createdAt: string;
}

interface PointsStats {
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  totalPointsActive: number;
  totalTransactions: number;
}

export default function AdminPoints() {
    const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [stats, setStats] = useState<PointsStats>({
    totalPointsEarned: 0,
    totalPointsRedeemed: 0,
    totalPointsActive: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter states
  const [filterType, setFilterType] = useState<"ALL" | "EARNED" | "REDEEMED" | "ADJUSTED" | "EXPIRED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Bulk adjustment states
  const [showBulkAdjust, setShowBulkAdjust] = useState(false);
  const [bulkMemberType, setBulkMemberType] = useState<"ALL" | "LIFETIME" | "REGULAR">("ALL");
  const [bulkType, setBulkType] = useState<"ADD" | "SUBTRACT">("ADD");
  const [bulkPoints, setBulkPoints] = useState("");
  const [bulkReason, setBulkReason] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Add points to member states
  const [showAddPoints, setShowAddPoints] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [addPointsAmount, setAddPointsAmount] = useState("");
  const [addPointsReason, setAddPointsReason] = useState("");
  const [addPointsSaving, setAddPointsSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (filterType !== "ALL") params.append("type", filterType);
      if (searchQuery) params.append("search", searchQuery);
      if (dateFrom) params.append("dateFrom", dateFrom);
      if (dateTo) params.append("dateTo", dateTo);

      const response = await fetch(`/api/admin/points/transactions?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
      } else {
        setError("Gagal memuat data transaksi");
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      setError("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  // Load stats
  const loadStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/points/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStats({
            totalPointsEarned: result.data.totalPointsUsed || 0,
            totalPointsRedeemed: result.data.totalRedemptions || 0,
            totalPointsActive: result.data.activeRedemptions || 0,
            totalTransactions: result.data.totalRedemptions || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  // Search members function
  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/members?search=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.members || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Error searching members:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle member search change with debounce
  const handleMemberSearchChange = (value: string) => {
    setMemberSearch(value);
    
    // Clear previous timeout
    if ((window as any).searchTimeout) {
      clearTimeout((window as any).searchTimeout);
    }
    
    // Set new timeout for debounced search
    (window as any).searchTimeout = setTimeout(() => {
      searchMembers(value);
    }, 300);
  };

  // Select member from search results
  const selectMember = (member: any) => {
    setSelectedMember(member);
    setSearchResults([]);
    setMemberSearch(member.user?.fullName || '');
  };

  // Handle add points to member
  const handleAddPointsToMember = async () => {
    if (!selectedMember || !addPointsAmount || !addPointsReason) {
      setError("Semua field harus diisi");
      return;
    }

    const points = parseInt(addPointsAmount);
    if (points <= 0) {
      setError("Jumlah poin harus lebih dari 0");
      return;
    }

    setAddPointsSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/members/${selectedMember.id}/points/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          points: points,
          reason: addPointsReason,
        }),
      });

      if (response.ok) {
        setSuccess(`Berhasil menambahkan ${points} poin ke ${selectedMember.user?.fullName}`);
        setShowAddPoints(false);
        setSelectedMember(null);
        setMemberSearch('');
        setSearchResults([]);
        setAddPointsAmount('');
        setAddPointsReason('');
        
        // Reload data
        loadTransactions();
        loadStats();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Gagal menambahkan poin");
      }
    } catch (error) {
      console.error("Error adding points:", error);
      setError("Terjadi kesalahan saat menambahkan poin");
    } finally {
      setAddPointsSaving(false);
    }
  };

  // Handle bulk adjustment
  const handleBulkAdjustment = async () => {
    if (!bulkPoints || !bulkReason) {
      setError("Semua field harus diisi");
      return;
    }

    const points = parseInt(bulkPoints);
    if (points <= 0) {
      setError("Jumlah poin harus lebih dari 0");
      return;
    }

    setBulkSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/points/bulk-adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          memberType: bulkMemberType,
          type: bulkType,
          points: points,
          reason: bulkReason,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Berhasil ${bulkType === "ADD" ? "menambahkan" : "mengurangi"} ${points} poin untuk ${data.affectedMembers} member`);
        setShowBulkAdjust(false);
        setBulkPoints("");
        setBulkReason("");
        
        // Reload data
        loadTransactions();
        loadStats();
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Gagal melakukan penyesuaian massal");
      }
    } catch (error) {
      console.error("Error bulk adjustment:", error);
      setError("Terjadi kesalahan saat melakukan penyesuaian");
    } finally {
      setBulkSaving(false);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilterType("ALL");
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    loadTransactions();
  }, [page, pageSize, filterType, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    loadStats();
  }, []);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Kelola Poin</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAddPoints(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Tambah Poin Member
          </button>
          <button
            onClick={() => setShowBulkAdjust(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Penyesuaian Massal
          </button>
          <button
            onClick={() => {
              loadTransactions();
              loadStats();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Poin Diperoleh</h3>
          <p className="text-2xl font-bold text-green-600">{(stats.totalPointsEarned || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Poin Ditukar</h3>
          <p className="text-2xl font-bold text-red-600">{(stats.totalPointsRedeemed || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Poin Aktif</h3>
          <p className="text-2xl font-bold text-blue-600">{(stats.totalPointsActive || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500">Total Transaksi</h3>
          <p className="text-2xl font-bold text-gray-600">{(stats.totalTransactions || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Transaksi</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="ALL">Semua</option>
              <option value="EARNED">Diperoleh</option>
              <option value="REDEEMED">Ditukar</option>
              <option value="ADJUSTED">Disesuaikan</option>
              <option value="EXPIRED">Kedaluwarsa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Member/Deskripsi</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Nama member atau deskripsi..."
            />
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
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow border">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deskripsi
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada data transaksi
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{transaction.memberName}</div>
                        <div className="text-sm text-gray-500">{transaction.memberEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          transaction.type === "EARNED"
                            ? "bg-green-100 text-green-800"
                            : transaction.type === "REDEEMED"
                            ? "bg-red-100 text-red-800"
                            : transaction.type === "ADJUSTED"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {transaction.type === "EARNED"
                          ? "Diperoleh"
                          : transaction.type === "REDEEMED"
                          ? "Ditukar"
                          : transaction.type === "ADJUSTED"
                          ? "Disesuaikan"
                          : "Kedaluwarsa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          transaction.type === "EARNED" || transaction.type === "ADJUSTED"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "EARNED" || transaction.type === "ADJUSTED" ? "+" : "-"}
                        {transaction.points.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {transaction.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={transactions.length < pageSize}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Halaman <span className="font-medium">{page}</span>
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={transactions.length < pageSize}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Adjustment Modal */}
      {showBulkAdjust && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowBulkAdjust(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Penyesuaian Poin Massal</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Member</label>
                <select
                  value={bulkMemberType}
                  onChange={(e) => setBulkMemberType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ALL">Semua Member</option>
                  <option value="LIFETIME">Member Lifetime</option>
                  <option value="REGULAR">Member Regular</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Penyesuaian</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ADD">Tambah Poin</option>
                  <option value="SUBTRACT">Kurangi Poin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Poin</label>
                <input
                  type="number"
                  value={bulkPoints}
                  onChange={(e) => setBulkPoints(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan jumlah poin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan</label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan alasan penyesuaian"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowBulkAdjust(false);
                  setBulkPoints("");
                  setBulkReason("");
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleBulkAdjustment}
                disabled={bulkSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkSaving ? "Memproses..." : "Proses"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Points to Member Modal */}
      {showAddPoints && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowAddPoints(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Tambah Poin ke Member</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cari Member *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => handleMemberSearchChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ketik nama, email, atau nomor telepon..."
                  />
                  {searchLoading && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-md max-h-40 overflow-y-auto">
                    {searchResults.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => selectMember(member)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-sm">{member.user?.fullName}</div>
                        <div className="text-xs text-gray-500">{member.user?.email}</div>
                        <div className="text-xs text-gray-500">{member.user?.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Selected Member */}
                {selectedMember && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="font-medium text-sm text-blue-900">{selectedMember.user?.fullName}</div>
                    <div className="text-xs text-blue-700">{selectedMember.user?.email}</div>
                    <div className="text-xs text-blue-700">Poin saat ini: {selectedMember.points || 0}</div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Poin *</label>
                <input
                  type="number"
                  value={addPointsAmount}
                  onChange={(e) => setAddPointsAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan jumlah poin"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan *</label>
                <textarea
                  value={addPointsReason}
                  onChange={(e) => setAddPointsReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan alasan penambahan poin"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddPoints(false);
                  setSelectedMember(null);
                  setMemberSearch('');
                  setSearchResults([]);
                  setAddPointsAmount('');
                  setAddPointsReason('');
                }}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleAddPointsToMember}
                disabled={addPointsSaving || !selectedMember}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {addPointsSaving ? "Memproses..." : "Tambah Poin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}