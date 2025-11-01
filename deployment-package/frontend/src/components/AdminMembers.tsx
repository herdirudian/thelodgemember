"use client";
import { useEffect, useState } from "react";

interface MemberItem {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  pointsBalance: number;
  isLifetime: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminMembers() {
  const [items, setItems] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter and search states
  const [filterType, setFilterType] = useState<"ALL" | "LIFETIME" | "REGULAR">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit states
  const [showEdit, setShowEdit] = useState(false);
  const [editMember, setEditMember] = useState<MemberItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editIsLifetime, setEditIsLifetime] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Points adjustment states
  const [showPointsAdjust, setShowPointsAdjust] = useState(false);
  const [adjustMember, setAdjustMember] = useState<MemberItem | null>(null);
  const [adjustType, setAdjustType] = useState<"ADD" | "SUBTRACT">("ADD");
  const [adjustPoints, setAdjustPoints] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const loadMembers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load members");
      const data = await response.json();
      // Ensure we always have an array
      const members = data.members || data.data || data || [];
      setItems(Array.isArray(members) ? members : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load members");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleEdit = (member: MemberItem) => {
    setEditMember(member);
    setEditFullName(member.fullName);
    setEditEmail(member.email);
    setEditPhone(member.phone || "");
    setEditPoints(member.pointsBalance.toString());
    setEditIsLifetime(member.isLifetime);
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editMember || !editFullName.trim() || !editEmail.trim()) {
      setError("Please fill all required fields");
      return;
    }

    setEditSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/members/${editMember.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editFullName,
          email: editEmail,
          phone: editPhone || null,
          pointsBalance: parseInt(editPoints) || 0,
          isLifetime: editIsLifetime,
        }),
      });

      if (!response.ok) throw new Error("Failed to update member");
      
      setSuccess("Member updated successfully!");
      setShowEdit(false);
      loadMembers();
    } catch (e: any) {
      setError(e?.message || "Failed to update member");
    }
    setEditSaving(false);
  };

  const handlePointsAdjustment = (member: MemberItem) => {
    setAdjustMember(member);
    setAdjustType("ADD");
    setAdjustPoints("");
    setAdjustReason("");
    setShowPointsAdjust(true);
  };

  const handleAdjustPoints = async () => {
    if (!adjustMember || !adjustPoints.trim() || !adjustReason.trim()) {
      setError("Please fill all required fields");
      return;
    }

    const points = parseInt(adjustPoints);
    if (isNaN(points) || points <= 0) {
      setError("Please enter a valid positive number for points");
      return;
    }

    setAdjustSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/members/${adjustMember.id}/adjust-points`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: adjustType,
          points: points,
          reason: adjustReason,
        }),
      });

      if (!response.ok) throw new Error("Failed to adjust points");
      
      setSuccess(`Points ${adjustType === "ADD" ? "added" : "subtracted"} successfully!`);
      setShowPointsAdjust(false);
      loadMembers();
    } catch (e: any) {
      setError(e?.message || "Failed to adjust points");
    }
    setAdjustSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete member "${name}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/members/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete member");
      
      setSuccess("Member deleted successfully!");
      loadMembers();
    } catch (e: any) {
      setError(e?.message || "Failed to delete member");
    }
  };

  // Filter and search logic
  const filteredMembers = Array.isArray(items) ? items.filter(member => {
    const matchesType = filterType === "ALL" || 
                       (filterType === "LIFETIME" && member.isLifetime) ||
                       (filterType === "REGULAR" && !member.isLifetime);
    const matchesSearch = (member.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (member.phone && member.phone.includes(searchQuery));
    return matchesType && matchesSearch;
  }) : [];

  const totalPages = Math.ceil(filteredMembers.length / pageSize);
  const paginatedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Member</h1>
        <button
          onClick={loadMembers}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Tipe</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "ALL" | "LIFETIME" | "REGULAR")}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">Semua Member</option>
            <option value="LIFETIME">Lifetime Member</option>
            <option value="REGULAR">Regular Member</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan nama, email, atau telepon..."
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Member</h3>
          <p className="text-2xl font-bold text-blue-600">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Lifetime Member</h3>
          <p className="text-2xl font-bold text-green-600">
            {items.filter(m => m.isLifetime).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Regular Member</h3>
          <p className="text-2xl font-bold text-orange-600">
            {items.filter(m => !m.isLifetime).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
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
                  Bergabung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada member ditemukan
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.fullName}</div>
                        <div className="text-sm text-gray-500">{member.email}</div>
                        {member.phone && (
                          <div className="text-sm text-gray-500">{member.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.isLifetime 
                          ? "bg-green-100 text-green-800" 
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {member.isLifetime ? "Lifetime" : "Regular"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{(member.pointsBalance || 0).toLocaleString('id-ID')}</span>
                        <button
                          onClick={() => handlePointsAdjustment(member)}
                          className="text-blue-600 hover:text-blue-900 text-xs"
                          title="Adjust Points"
                        >
                          ⚙️
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(member.id, member.fullName)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Hapus
                        </button>
                      </div>
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
                Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredMembers.length)} dari {filteredMembers.length} member
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

      {/* Edit Modal */}
      {showEdit && editMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Edit Member</div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poin</label>
                <input
                  type="number"
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editIsLifetime"
                  checked={editIsLifetime}
                  onChange={(e) => setEditIsLifetime(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="editIsLifetime" className="text-sm text-gray-700">
                  Lifetime Member
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleUpdate}
                disabled={editSaving}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
              >
                {editSaving ? "Menyimpan..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Adjustment Modal */}
      {showPointsAdjust && adjustMember && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowPointsAdjust(false)}>
          <div className="bg-white rounded-lg w-full max-w-md p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Sesuaikan Poin</div>
            <div className="mb-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">Member: <span className="font-medium">{adjustMember.fullName}</span></p>
              <p className="text-sm text-gray-600">Poin Saat Ini: <span className="font-medium">{(adjustMember.pointsBalance || 0).toLocaleString('id-ID')}</span></p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Penyesuaian</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as "ADD" | "SUBTRACT")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="ADD">Tambah Poin</option>
                  <option value="SUBTRACT">Kurangi Poin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Poin *</label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan jumlah poin"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alasan *</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan alasan penyesuaian poin"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPointsAdjust(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={adjustSaving}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
              >
                {adjustSaving ? "Menyimpan..." : "Sesuaikan Poin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}