"use client";
import { useEffect, useState } from "react";

type PromoType = "REDEEM_POINTS" | "EVENT" | "EXCLUSIVE_MEMBER" | "FREE_BENEFIT_NEW_REG";

interface PromoItem {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  type: PromoType;
  imageUrl?: string;
  pointsRequired?: number;
  maxRedeem?: number;
  quota?: number;
  eventId?: string;
  showMoreButton: boolean;
  showJoinButton: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPromos() {
  const [items, setItems] = useState<PromoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [type, setType] = useState<PromoType>("REDEEM_POINTS");
  const [pointsRequired, setPointsRequired] = useState("");
  const [maxRedeem, setMaxRedeem] = useState("");
  const [quota, setQuota] = useState("");
  const [eventId, setEventId] = useState("");
  const [showMoreButton, setShowMoreButton] = useState(true);
  const [showJoinButton, setShowJoinButton] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Edit states
  const [showEdit, setShowEdit] = useState(false);
  const [editItem, setEditItem] = useState<PromoItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editType, setEditType] = useState<PromoType>("REDEEM_POINTS");
  const [editPointsRequired, setEditPointsRequired] = useState("");
  const [editMaxRedeem, setEditMaxRedeem] = useState("");
  const [editQuota, setEditQuota] = useState("");
  const [editEventId, setEditEventId] = useState("");
  const [editShowMoreButton, setEditShowMoreButton] = useState(true);
  const [editShowJoinButton, setEditShowJoinButton] = useState(true);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Filter and pagination
  const [filterType, setFilterType] = useState<PromoType | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/promos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load promos");
      const data = await response.json();
      setItems(data.data || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load promos");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setType("REDEEM_POINTS");
    setPointsRequired("");
    setMaxRedeem("");
    setQuota("");
    setEventId("");
    setShowMoreButton(true);
    setShowJoinButton(true);
    setImage(null);
    setSuccess("");
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !startDate || !endDate) {
      setError("Please fill all required fields");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("startDate", startDate);
      formData.append("endDate", endDate);
      formData.append("type", type);
      formData.append("showMoreButton", showMoreButton.toString());
      formData.append("showJoinButton", showJoinButton.toString());
      
      if (type === "REDEEM_POINTS") {
        if (pointsRequired) formData.append("pointsRequired", pointsRequired);
        if (maxRedeem) formData.append("maxRedeem", maxRedeem);
      }
      
      if (type === "EVENT" || type === "EXCLUSIVE_MEMBER") {
        if (quota) formData.append("quota", quota);
        if (eventId) formData.append("eventId", eventId);
      }
      
      if (image) formData.append("image", image);

      const response = await fetch(`/api/admin/promos`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to create promo");
      
      setSuccess("Promo created successfully!");
      resetForm();
      setShowForm(false);
      loadItems();
    } catch (e: any) {
      setError(e?.message || "Failed to create promo");
    }
    setSaving(false);
  };

  const handleEdit = (item: PromoItem) => {
    setEditItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditStartDate(item.startDate.split('T')[0]);
    setEditEndDate(item.endDate.split('T')[0]);
    setEditType(item.type);
    setEditPointsRequired(item.pointsRequired?.toString() || "");
    setEditMaxRedeem(item.maxRedeem?.toString() || "");
    setEditQuota(item.quota?.toString() || "");
    setEditEventId(item.eventId || "");
    setEditShowMoreButton(item.showMoreButton);
    setEditShowJoinButton(item.showJoinButton);
    setEditImage(null);
    setShowEdit(true);
  };

  const handleUpdate = async () => {
    if (!editItem || !editTitle.trim() || !editDescription.trim() || !editStartDate || !editEndDate) {
      setError("Please fill all required fields");
      return;
    }

    setEditSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("title", editTitle);
      formData.append("description", editDescription);
      formData.append("startDate", editStartDate);
      formData.append("endDate", editEndDate);
      formData.append("type", editType);
      formData.append("showMoreButton", editShowMoreButton.toString());
      formData.append("showJoinButton", editShowJoinButton.toString());
      
      if (editType === "REDEEM_POINTS") {
        if (editPointsRequired) formData.append("pointsRequired", editPointsRequired);
        if (editMaxRedeem) formData.append("maxRedeem", editMaxRedeem);
      }
      
      if (editType === "EVENT" || editType === "EXCLUSIVE_MEMBER") {
        if (editQuota) formData.append("quota", editQuota);
        if (editEventId) formData.append("eventId", editEventId);
      }
      
      if (editImage) formData.append("image", editImage);

      const response = await fetch(`/api/admin/promos/${editItem.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update promo");
      
      setSuccess("Promo updated successfully!");
      setShowEdit(false);
      loadItems();
    } catch (e: any) {
      setError(e?.message || "Failed to update promo");
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this promo?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/promos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete promo");
      
      setSuccess("Promo deleted successfully!");
      loadItems();
    } catch (e: any) {
      setError(e?.message || "Failed to delete promo");
    }
  };

  // Filter and search logic
  const filteredItems = items.filter(item => {
    const matchesType = filterType === "ALL" || item.type === filterType;
    const matchesSearch = (item.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);

  const getTypeLabel = (type: PromoType) => {
    switch (type) {
      case "REDEEM_POINTS": return "Tukar Poin";
      case "EVENT": return "Event";
      case "EXCLUSIVE_MEMBER": return "Member Eksklusif";
      case "FREE_BENEFIT_NEW_REG": return "Member Baru";
      default: return type;
    }
  };

  const getTypeColor = (type: PromoType) => {
    switch (type) {
      case "REDEEM_POINTS": return "bg-blue-100 text-blue-800";
      case "EVENT": return "bg-green-100 text-green-800";
      case "EXCLUSIVE_MEMBER": return "bg-purple-100 text-purple-800";
      case "FREE_BENEFIT_NEW_REG": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Program</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30]"
        >
          Tambah Program
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
            onChange={(e) => setFilterType(e.target.value as PromoType | "ALL")}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="REDEEM_POINTS">Tukar Poin</option>
            <option value="EVENT">Event</option>
            <option value="EXCLUSIVE_MEMBER">Member Eksklusif</option>
            <option value="FREE_BENEFIT_NEW_REG">Member Baru</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul atau deskripsi..."
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Program
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detail
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
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada program ditemukan
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-10 w-10 rounded-lg object-cover mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(item.type)}`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{new Date(item.startDate).toLocaleDateString('id-ID')}</div>
                      <div className="text-gray-500">s/d {new Date(item.endDate).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.type === "REDEEM_POINTS" && (
                        <div>
                          <div>Poin: {item.pointsRequired || 0}</div>
                          <div>Max: {item.maxRedeem || "∞"}</div>
                        </div>
                      )}
                      {(item.type === "EVENT" || item.type === "EXCLUSIVE_MEMBER") && (
                        <div>
                          <div>Kuota: {item.quota || "∞"}</div>
                          {item.eventId && <div>Event ID: {item.eventId}</div>}
                        </div>
                      )}
                      {item.type === "FREE_BENEFIT_NEW_REG" && (
                        <div>
                          <div>Kuota: {item.quota || "∞"}</div>
                          <div>Max/Member: {item.maxRedeem || "1"}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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
                Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredItems.length)} dari {filteredItems.length} program
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

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Tambah Program Baru</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Masukkan judul program"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PromoType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="REDEEM_POINTS">Tukar Poin</option>
                    <option value="EVENT">Event</option>
                    <option value="EXCLUSIVE_MEMBER">Member Eksklusif</option>
                    <option value="FREE_BENEFIT_NEW_REG">Member Baru</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan deskripsi program"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {type === "REDEEM_POINTS" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Poin Diperlukan</label>
                    <input
                      type="number"
                      value={pointsRequired}
                      onChange={(e) => setPointsRequired(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal Redeem</label>
                    <input
                      type="number"
                      value={maxRedeem}
                      onChange={(e) => setMaxRedeem(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Kosongkan untuk unlimited"
                    />
                  </div>
                </div>
              )}

              {(type === "EVENT" || type === "EXCLUSIVE_MEMBER") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kuota</label>
                    <input
                      type="number"
                      value={quota}
                      onChange={(e) => setQuota(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Kosongkan untuk unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event ID</label>
                    <input
                      type="text"
                      value={eventId}
                      onChange={(e) => setEventId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="ID event terkait"
                    />
                  </div>
                </div>
              )}

              {type === "FREE_BENEFIT_NEW_REG" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kuota Benefit</label>
                    <input
                      type="number"
                      value={quota}
                      onChange={(e) => setQuota(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Kosongkan untuk unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal per Member</label>
                    <input
                      type="number"
                      value={maxRedeem}
                      onChange={(e) => setMaxRedeem(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showMoreButton"
                    checked={showMoreButton}
                    onChange={(e) => setShowMoreButton(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="showMoreButton" className="text-sm text-gray-700">
                    Tampilkan tombol "Selengkapnya"
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showJoinButton"
                    checked={showJoinButton}
                    onChange={(e) => setShowJoinButton(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="showJoinButton" className="text-sm text-gray-700">
                    Tampilkan tombol "Ikuti"
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEdit && editItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">Edit Program</div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe *</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as PromoType)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="REDEEM_POINTS">Tukar Poin</option>
                    <option value="EVENT">Event</option>
                    <option value="EXCLUSIVE_MEMBER">Member Eksklusif</option>
                    <option value="FREE_BENEFIT_NEW_REG">Member Baru</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {editType === "REDEEM_POINTS" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Poin Diperlukan</label>
                    <input
                      type="number"
                      value={editPointsRequired}
                      onChange={(e) => setEditPointsRequired(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal Redeem</label>
                    <input
                      type="number"
                      value={editMaxRedeem}
                      onChange={(e) => setEditMaxRedeem(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              {(editType === "EVENT" || editType === "EXCLUSIVE_MEMBER") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kuota</label>
                    <input
                      type="number"
                      value={editQuota}
                      onChange={(e) => setEditQuota(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event ID</label>
                    <input
                      type="text"
                      value={editEventId}
                      onChange={(e) => setEditEventId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              )}

              {editType === "FREE_BENEFIT_NEW_REG" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kuota Benefit</label>
                    <input
                      type="number"
                      value={editQuota}
                      onChange={(e) => setEditQuota(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Kosongkan untuk unlimited"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal per Member</label>
                    <input
                      type="number"
                      value={editMaxRedeem}
                      onChange={(e) => setEditMaxRedeem(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Baru</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                {editItem.imageUrl && (
                  <div className="mt-2">
                    <img src={editItem.imageUrl} alt="Current" className="h-20 w-20 object-cover rounded" />
                    <p className="text-xs text-gray-500 mt-1">Gambar saat ini</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editShowMoreButton"
                    checked={editShowMoreButton}
                    onChange={(e) => setEditShowMoreButton(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="editShowMoreButton" className="text-sm text-gray-700">
                    Tampilkan tombol "Selengkapnya"
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editShowJoinButton"
                    checked={editShowJoinButton}
                    onChange={(e) => setEditShowJoinButton(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="editShowJoinButton" className="text-sm text-gray-700">
                    Tampilkan tombol "Ikuti"
                  </label>
                </div>
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
    </div>
  );
}