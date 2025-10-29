"use client";
import { useEffect, useState } from "react";

interface EventItem {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  maxParticipants?: number;
  currentParticipants: number;
  pointsReward: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminEvents() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter and search states
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<EventItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formMaxParticipants, setFormMaxParticipants] = useState("");
  const [formPointsReward, setFormPointsReward] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/events`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load events");
      const data = await response.json();
      setItems(data.data || data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load events");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const resetForm = () => {
    setEditEvent(null);
    setFormTitle("");
    setFormDescription("");
    setFormStartDate("");
    setFormEndDate("");
    setFormLocation("");
    setFormMaxParticipants("");
    setFormPointsReward("");
    setFormIsActive(true);
  };

  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (event: EventItem) => {
    setEditEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description);
    setFormStartDate(event.startDate.split('T')[0]);
    setFormEndDate(event.endDate.split('T')[0]);
    setFormLocation(event.location || "");
    setFormMaxParticipants(event.maxParticipants?.toString() || "");
    setFormPointsReward(event.pointsReward.toString());
    setFormIsActive(event.isActive);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formDescription.trim() || !formStartDate || !formEndDate) {
      setError("Please fill all required fields");
      return;
    }

    if (new Date(formStartDate) >= new Date(formEndDate)) {
      setError("End date must be after start date");
      return;
    }

    setFormSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const eventData = {
        title: formTitle,
        description: formDescription,
        startDate: new Date(formStartDate).toISOString(),
        endDate: new Date(formEndDate).toISOString(),
        location: formLocation || null,
        maxParticipants: formMaxParticipants ? parseInt(formMaxParticipants) : null,
        pointsReward: parseInt(formPointsReward) || 0,
        isActive: formIsActive,
      };

      const url = editEvent ? `/api/admin/events/${editEvent.id}` : `/api/admin/events`;
      const method = editEvent ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) throw new Error(`Failed to ${editEvent ? "update" : "create"} event`);
      
      setSuccess(`Event ${editEvent ? "updated" : "created"} successfully!`);
      setShowForm(false);
      loadEvents();
    } catch (e: any) {
      setError(e?.message || `Failed to ${editEvent ? "update" : "create"} event`);
    }
    setFormSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete event "${title}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/events/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete event");
      
      setSuccess("Event deleted successfully!");
      loadEvents();
    } catch (e: any) {
      setError(e?.message || "Failed to delete event");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/events/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to toggle event status");
      
      setSuccess(`Event ${!currentStatus ? "activated" : "deactivated"} successfully!`);
      loadEvents();
    } catch (e: any) {
      setError(e?.message || "Failed to toggle event status");
    }
  };

  // Filter and search logic
  const filteredEvents = items.filter(event => {
    const matchesStatus = filterStatus === "ALL" || 
                         (filterStatus === "ACTIVE" && event.isActive) ||
                         (filterStatus === "INACTIVE" && !event.isActive);
    const matchesSearch = (event.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (event.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredEvents.length / pageSize);
  const paginatedEvents = filteredEvents.slice((page - 1) * pageSize, page * pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventStatus = (event: EventItem) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (!event.isActive) return { label: "Nonaktif", color: "bg-gray-100 text-gray-800" };
    if (now < startDate) return { label: "Akan Datang", color: "bg-blue-100 text-blue-800" };
    if (now >= startDate && now <= endDate) return { label: "Berlangsung", color: "bg-green-100 text-green-800" };
    return { label: "Selesai", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Event</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30]"
          >
            Tambah Event
          </button>
          <button
            onClick={loadEvents}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </div>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">Semua Event</option>
            <option value="ACTIVE">Event Aktif</option>
            <option value="INACTIVE">Event Nonaktif</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cari</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan judul, deskripsi, atau lokasi..."
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Event</h3>
          <p className="text-2xl font-bold text-blue-600">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Event Aktif</h3>
          <p className="text-2xl font-bold text-green-600">
            {items.filter(e => e.isActive).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Event Berlangsung</h3>
          <p className="text-2xl font-bold text-orange-600">
            {items.filter(e => {
              const now = new Date();
              const start = new Date(e.startDate);
              const end = new Date(e.endDate);
              return e.isActive && now >= start && now <= end;
            }).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Peserta</h3>
          <p className="text-2xl font-bold text-purple-600">
            {items.reduce((sum, e) => sum + (e.currentParticipants || 0), 0)}
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
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peserta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
                    Loading...
                  </td>
                </tr>
              ) : paginatedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Tidak ada event ditemukan
                  </td>
                </tr>
              ) : (
                paginatedEvents.map((event) => {
                  const status = getEventStatus(event);
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{event.title}</div>
                          <div className="text-sm text-gray-500">{event.description}</div>
                          {event.location && (
                            <div className="text-sm text-gray-500">📍 {event.location}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div>Mulai: {formatDate(event.startDate)}</div>
                          <div>Selesai: {formatDate(event.endDate)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>
                          <span className="font-medium">{event.currentParticipants}</span>
                          {event.maxParticipants && (
                            <span className="text-gray-500"> / {event.maxParticipants}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {event.pointsReward > 0 ? (
                          <span className="text-green-600 font-medium">+{event.pointsReward}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(event)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleStatus(event.id, event.isActive)}
                            className={event.isActive ? "text-orange-600 hover:text-orange-900" : "text-green-600 hover:text-green-900"}
                          >
                            {event.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button
                            onClick={() => handleDelete(event.id, event.title)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">
                Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredEvents.length)} dari {filteredEvents.length} event
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">
              {editEvent ? "Edit Event" : "Tambah Event Baru"}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Event *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan judul event"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan deskripsi event"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai *</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai *</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lokasi</label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan lokasi event"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal Peserta</label>
                  <input
                    type="number"
                    value={formMaxParticipants}
                    onChange={(e) => setFormMaxParticipants(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Kosongkan jika tidak terbatas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Poin Reward</label>
                  <input
                    type="number"
                    value={formPointsReward}
                    onChange={(e) => setFormPointsReward(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="formIsActive" className="text-sm text-gray-700">
                  Event Aktif
                </label>
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
                disabled={formSaving}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
              >
                {formSaving ? "Menyimpan..." : (editEvent ? "Update" : "Tambah")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}