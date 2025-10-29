"use client";
import { useEffect, useState } from "react";

interface TourismTicket {
  id: string;
  name: string;
  description: string;
  validDate: string;
  expiryDate: string;
  allotment: number;
  price: number;
  discount: number;
  finalPrice: number;
  imageUrl?: string;
  category: string;
  location: string;
  duration: string;
  includes: string;
  terms: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminTourismTickets() {
    const [tickets, setTickets] = useState<TourismTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validDate, setValidDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [allotment, setAllotment] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [includes, setIncludes] = useState("");
  const [terms, setTerms] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Edit states
  const [showEdit, setShowEdit] = useState(false);
  const [editTicket, setEditTicket] = useState<TourismTicket | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editValidDate, setEditValidDate] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editAllotment, setEditAllotment] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editIncludes, setEditIncludes] = useState("");
  const [editTerms, setEditTerms] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Filter and pagination
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadTickets = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/tourism-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load tourism tickets");
      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load tourism tickets");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setValidDate("");
    setExpiryDate("");
    setAllotment("");
    setPrice("");
    setDiscount("");
    setCategory("");
    setLocation("");
    setDuration("");
    setIncludes("");
    setTerms("");
    setIsActive(true);
    setImage(null);
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      
      formData.append("name", name);
      formData.append("description", description);
      formData.append("validDate", validDate);
      formData.append("expiryDate", expiryDate);
      formData.append("allotment", allotment);
      formData.append("price", price);
      formData.append("discount", discount);
      formData.append("category", category);
      formData.append("location", location);
      formData.append("duration", duration);
      formData.append("includes", includes);
      formData.append("terms", terms);
      formData.append("isActive", isActive.toString());
      
      if (image) {
        formData.append("image", image);
      }

      const response = await fetch(`/api/admin/tourism-tickets`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to create tourism ticket");

      setSuccess("Tiket wisata berhasil dibuat!");
      resetForm();
      setShowForm(false);
      loadTickets();
    } catch (e: any) {
      setError(e?.message || "Failed to create tourism ticket");
    }
    setSaving(false);
  };

  const handleEdit = (ticket: TourismTicket) => {
    setEditTicket(ticket);
    setEditName(ticket.name);
    setEditDescription(ticket.description);
    setEditValidDate(ticket.validDate.split('T')[0]);
    setEditExpiryDate(ticket.expiryDate.split('T')[0]);
    setEditAllotment(ticket.allotment.toString());
    setEditPrice(ticket.price.toString());
    setEditDiscount(ticket.discount.toString());
    setEditCategory(ticket.category);
    setEditLocation(ticket.location);
    setEditDuration(ticket.duration);
    setEditIncludes(ticket.includes);
    setEditTerms(ticket.terms);
    setEditIsActive(ticket.isActive);
    setEditImage(null);
    setShowEdit(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTicket) return;

    setEditSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("validDate", editValidDate);
      formData.append("expiryDate", editExpiryDate);
      formData.append("allotment", editAllotment);
      formData.append("price", editPrice);
      formData.append("discount", editDiscount);
      formData.append("category", editCategory);
      formData.append("location", editLocation);
      formData.append("duration", editDuration);
      formData.append("includes", editIncludes);
      formData.append("terms", editTerms);
      formData.append("isActive", editIsActive.toString());
      
      if (editImage) {
        formData.append("image", editImage);
      }

      const response = await fetch(`/api/admin/tourism-tickets/${editTicket.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update tourism ticket");

      setSuccess("Tiket wisata berhasil diupdate!");
      setShowEdit(false);
      setEditTicket(null);
      loadTickets();
    } catch (e: any) {
      setError(e?.message || "Failed to update tourism ticket");
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus tiket wisata ini?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/tourism-tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete tourism ticket");

      setSuccess("Tiket wisata berhasil dihapus!");
      loadTickets();
    } catch (e: any) {
      setError(e?.message || "Failed to delete tourism ticket");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesCategory = filterCategory === "ALL" || ticket.category === filterCategory;
    const matchesSearch = ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const paginatedTickets = filteredTickets.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredTickets.length / pageSize);

  const calculateFinalPrice = (price: number, discount: number) => {
    return price - (price * discount / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Tiket Wisata</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tambah Tiket Wisata
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori
            </label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Adventure">Adventure</option>
              <option value="Nature">Nature</option>
              <option value="Cultural">Cultural</option>
              <option value="Family">Family</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pencarian
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau deskripsi..."
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items per halaman
            </label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Memuat tiket wisata...</p>
          </div>
        ) : paginatedTickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Tidak ada tiket wisata yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tiket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategori
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Allotment
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
                {paginatedTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {ticket.imageUrl && (
                          <img
                            src={ticket.imageUrl}
                            alt={ticket.name}
                            className="h-12 w-12 rounded-lg object-cover mr-4"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {ticket.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {ticket.location} • {ticket.duration}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ticket.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {ticket.discount > 0 ? (
                          <>
                            <span className="line-through text-gray-500">
                              Rp {ticket.price.toLocaleString()}
                            </span>
                            <br />
                            <span className="font-medium text-green-600">
                              Rp {calculateFinalPrice(ticket.price, ticket.discount).toLocaleString()}
                            </span>
                            <span className="text-xs text-red-500 ml-1">
                              (-{ticket.discount}%)
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            Rp {ticket.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {ticket.allotment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ticket.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(ticket)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(ticket.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredTickets.length)} dari {filteredTickets.length} tiket
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <span className="px-3 py-1 text-sm">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Tambah Tiket Wisata</h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Tiket *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: Tiket Masuk Curug Maribaya"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Kategori</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Nature">Nature</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Family">Family</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: Curug Maribaya, Lembang"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durasi *
                    </label>
                    <input
                      type="text"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 3-4 jam"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Berlaku *
                    </label>
                    <input
                      type="date"
                      value={validDate}
                      onChange={(e) => setValidDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Berakhir *
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah Allotment *
                    </label>
                    <input
                      type="number"
                      value={allotment}
                      onChange={(e) => setAllotment(e.target.value)}
                      required
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Tiket (Rp) *
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 50000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Gambar
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Tiket *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Deskripsi lengkap tentang tiket wisata..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yang Termasuk
                  </label>
                  <textarea
                    value={includes}
                    onChange={(e) => setIncludes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Contoh: Tiket masuk, Guide, Snack, dll..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Syarat & Ketentuan
                  </label>
                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Syarat dan ketentuan penggunaan tiket..."
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Aktifkan tiket
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEdit && editTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Tiket Wisata</h2>
                <button
                  onClick={() => {
                    setShowEdit(false);
                    setEditTicket(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Tiket *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategori *
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Kategori</option>
                      <option value="Adventure">Adventure</option>
                      <option value="Nature">Nature</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Family">Family</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lokasi *
                    </label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Durasi *
                    </label>
                    <input
                      type="text"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Berlaku *
                    </label>
                    <input
                      type="date"
                      value={editValidDate}
                      onChange={(e) => setEditValidDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tanggal Berakhir *
                    </label>
                    <input
                      type="date"
                      value={editExpiryDate}
                      onChange={(e) => setEditExpiryDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jumlah Allotment *
                    </label>
                    <input
                      type="number"
                      value={editAllotment}
                      onChange={(e) => setEditAllotment(e.target.value)}
                      required
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga Tiket (Rp) *
                    </label>
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      required
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Diskon (%)
                    </label>
                    <input
                      type="number"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                      min="0"
                      max="100"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Gambar Baru
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                    {editTicket.imageUrl && (
                      <div className="mt-2">
                        <img
                          src={editTicket.imageUrl}
                          alt="Current"
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-500 mt-1">Gambar saat ini</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Tiket *
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Yang Termasuk
                  </label>
                  <textarea
                    value={editIncludes}
                    onChange={(e) => setEditIncludes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Syarat & Ketentuan
                  </label>
                  <textarea
                    value={editTerms}
                    onChange={(e) => setEditTerms(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="editIsActive"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <label htmlFor="editIsActive" className="ml-2 text-sm text-gray-700">
                    Aktifkan tiket
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setEditTicket(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editSaving ? "Menyimpan..." : "Update"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}