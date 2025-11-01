"use client";
import { useEffect, useState } from "react";

interface Accommodation {
  id: string;
  name: string;
  description: string;
  type: string; // Hotel, Villa, Resort, Homestay
  location: string;
  address: string;
  checkInTime: string;
  checkOutTime: string;
  pricePerNight: number;
  discount: number;
  finalPrice: number;
  maxGuests: number;
  totalRooms: number;
  availableRooms: number;
  amenities: string;
  policies: string;
  imageUrl?: string;
  rating: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminAccommodation() {
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [pricePerNight, setPricePerNight] = useState("");
  const [discount, setDiscount] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [totalRooms, setTotalRooms] = useState("");
  const [amenities, setAmenities] = useState("");
  const [policies, setPolicies] = useState("");
  const [rating, setRating] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  // Edit states
  const [showEdit, setShowEdit] = useState(false);
  const [editAccommodation, setEditAccommodation] = useState<Accommodation | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCheckInTime, setEditCheckInTime] = useState("");
  const [editCheckOutTime, setEditCheckOutTime] = useState("");
  const [editPricePerNight, setEditPricePerNight] = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editMaxGuests, setEditMaxGuests] = useState("");
  const [editTotalRooms, setEditTotalRooms] = useState("");
  const [editAmenities, setEditAmenities] = useState("");
  const [editPolicies, setEditPolicies] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Filter and pagination
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadAccommodations = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/accommodations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load accommodations");
      const data = await response.json();
      setAccommodations(data.accommodations || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load accommodations");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAccommodations();
  }, []);

  const resetForm = () => {
    setName("");
    setDescription("");
    setType("");
    setLocation("");
    setAddress("");
    setCheckInTime("");
    setCheckOutTime("");
    setPricePerNight("");
    setDiscount("");
    setMaxGuests("");
    setTotalRooms("");
    setAmenities("");
    setPolicies("");
    setRating("");
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
      formData.append("type", type);
      formData.append("location", location);
      formData.append("address", address);
      formData.append("checkInTime", checkInTime);
      formData.append("checkOutTime", checkOutTime);
      formData.append("pricePerNight", pricePerNight);
      formData.append("discount", discount);
      formData.append("maxGuests", maxGuests);
      formData.append("totalRooms", totalRooms);
      formData.append("amenities", amenities);
      formData.append("policies", policies);
      formData.append("rating", rating);
      formData.append("isActive", isActive.toString());
      
      if (image) {
        formData.append("image", image);
      }

      const response = await fetch(`/api/admin/accommodations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to create accommodation");

      setSuccess("Penginapan berhasil dibuat!");
      resetForm();
      setShowForm(false);
      loadAccommodations();
    } catch (e: any) {
      setError(e?.message || "Failed to create accommodation");
    }
    setSaving(false);
  };

  const handleEdit = (accommodation: Accommodation) => {
    setEditAccommodation(accommodation);
    setEditName(accommodation.name);
    setEditDescription(accommodation.description);
    setEditType(accommodation.type);
    setEditLocation(accommodation.location);
    setEditAddress(accommodation.address);
    setEditCheckInTime(accommodation.checkInTime);
    setEditCheckOutTime(accommodation.checkOutTime);
    setEditPricePerNight(accommodation.pricePerNight.toString());
    setEditDiscount(accommodation.discount.toString());
    setEditMaxGuests(accommodation.maxGuests.toString());
    setEditTotalRooms(accommodation.totalRooms.toString());
    setEditAmenities(accommodation.amenities);
    setEditPolicies(accommodation.policies);
    setEditRating(accommodation.rating.toString());
    setEditIsActive(accommodation.isActive);
    setEditImage(null);
    setShowEdit(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAccommodation) return;

    setEditSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      
      formData.append("name", editName);
      formData.append("description", editDescription);
      formData.append("type", editType);
      formData.append("location", editLocation);
      formData.append("address", editAddress);
      formData.append("checkInTime", editCheckInTime);
      formData.append("checkOutTime", editCheckOutTime);
      formData.append("pricePerNight", editPricePerNight);
      formData.append("discount", editDiscount);
      formData.append("maxGuests", editMaxGuests);
      formData.append("totalRooms", editTotalRooms);
      formData.append("amenities", editAmenities);
      formData.append("policies", editPolicies);
      formData.append("rating", editRating);
      formData.append("isActive", editIsActive.toString());
      
      if (editImage) {
        formData.append("image", editImage);
      }

      const response = await fetch(`/api/admin/accommodations/${editAccommodation.id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to update accommodation");

      setSuccess("Penginapan berhasil diupdate!");
      setShowEdit(false);
      setEditAccommodation(null);
      loadAccommodations();
    } catch (e: any) {
      setError(e?.message || "Failed to update accommodation");
    }
    setEditSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus penginapan ini?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/accommodations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete accommodation");

      setSuccess("Penginapan berhasil dihapus!");
      loadAccommodations();
    } catch (e: any) {
      setError(e?.message || "Failed to delete accommodation");
    }
  };

  const filteredAccommodations = accommodations.filter((accommodation) => {
    const matchesType = filterType === "ALL" || accommodation.type === filterType;
    const matchesSearch = accommodation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         accommodation.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const paginatedAccommodations = filteredAccommodations.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredAccommodations.length / pageSize);

  const calculateFinalPrice = (price: number, discount: number) => {
    return price - (price * discount / 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Penginapan</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Tambah Penginapan
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
              Tipe Penginapan
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="Hotel">Hotel</option>
              <option value="Villa">Villa</option>
              <option value="Resort">Resort</option>
              <option value="Homestay">Homestay</option>
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
              placeholder="Cari nama atau lokasi..."
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

      {/* Accommodations List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Memuat penginapan...</p>
          </div>
        ) : paginatedAccommodations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Tidak ada penginapan yang ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Penginapan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Harga/Malam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kamar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
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
                {paginatedAccommodations.map((accommodation) => (
                  <tr key={accommodation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {accommodation.imageUrl && (
                          <img
                            src={accommodation.imageUrl}
                            alt={accommodation.name}
                            className="h-12 w-12 rounded-lg object-cover mr-4"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {accommodation.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {accommodation.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {accommodation.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {accommodation.discount > 0 ? (
                          <>
                            <span className="line-through text-gray-500">
                              Rp {accommodation.pricePerNight.toLocaleString()}
                            </span>
                            <br />
                            <span className="font-medium text-green-600">
                              Rp {calculateFinalPrice(accommodation.pricePerNight, accommodation.discount).toLocaleString()}
                            </span>
                            <span className="text-xs text-red-500 ml-1">
                              (-{accommodation.discount}%)
                            </span>
                          </>
                        ) : (
                          <span className="font-medium">
                            Rp {accommodation.pricePerNight.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {accommodation.availableRooms}/{accommodation.totalRooms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1 text-sm text-gray-900">{accommodation.rating}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        accommodation.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {accommodation.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEdit(accommodation)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(accommodation.id)}
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
                Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredAccommodations.length)} dari {filteredAccommodations.length} penginapan
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
                <h2 className="text-xl font-bold text-gray-900">Tambah Penginapan</h2>
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
                      Nama Penginapan *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: Hotel Santika Bandung"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe Penginapan *
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Tipe</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Villa">Villa</option>
                      <option value="Resort">Resort</option>
                      <option value="Homestay">Homestay</option>
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
                      placeholder="Contoh: Bandung, Jawa Barat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rating (1-5) *
                    </label>
                    <input
                      type="number"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      required
                      min="1"
                      max="5"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 4.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Time *
                    </label>
                    <input
                      type="time"
                      value={checkInTime}
                      onChange={(e) => setCheckInTime(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Time *
                    </label>
                    <input
                      type="time"
                      value={checkOutTime}
                      onChange={(e) => setCheckOutTime(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga per Malam (Rp) *
                    </label>
                    <input
                      type="number"
                      value={pricePerNight}
                      onChange={(e) => setPricePerNight(e.target.value)}
                      required
                      min="0"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 500000"
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
                      placeholder="Contoh: 15"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maksimal Tamu *
                    </label>
                    <input
                      type="number"
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(e.target.value)}
                      required
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 4"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Kamar *
                    </label>
                    <input
                      type="number"
                      value={totalRooms}
                      onChange={(e) => setTotalRooms(e.target.value)}
                      required
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Contoh: 50"
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
                    Alamat Lengkap *
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Alamat lengkap penginapan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Penginapan *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Deskripsi lengkap tentang penginapan..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fasilitas
                  </label>
                  <textarea
                    value={amenities}
                    onChange={(e) => setAmenities(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Contoh: WiFi gratis, AC, TV, Kolam renang, Gym, dll..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kebijakan & Aturan
                  </label>
                  <textarea
                    value={policies}
                    onChange={(e) => setPolicies(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Kebijakan pembatalan, aturan tamu, dll..."
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
                    Aktifkan penginapan
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
      {showEdit && editAccommodation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Edit Penginapan</h2>
                <button
                  onClick={() => {
                    setShowEdit(false);
                    setEditAccommodation(null);
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
                      Nama Penginapan *
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
                      Tipe Penginapan *
                    </label>
                    <select
                      value={editType}
                      onChange={(e) => setEditType(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">Pilih Tipe</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Villa">Villa</option>
                      <option value="Resort">Resort</option>
                      <option value="Homestay">Homestay</option>
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
                      Rating (1-5) *
                    </label>
                    <input
                      type="number"
                      value={editRating}
                      onChange={(e) => setEditRating(e.target.value)}
                      required
                      min="1"
                      max="5"
                      step="0.1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-in Time *
                    </label>
                    <input
                      type="time"
                      value={editCheckInTime}
                      onChange={(e) => setEditCheckInTime(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check-out Time *
                    </label>
                    <input
                      type="time"
                      value={editCheckOutTime}
                      onChange={(e) => setEditCheckOutTime(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Harga per Malam (Rp) *
                    </label>
                    <input
                      type="number"
                      value={editPricePerNight}
                      onChange={(e) => setEditPricePerNight(e.target.value)}
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
                      Maksimal Tamu *
                    </label>
                    <input
                      type="number"
                      value={editMaxGuests}
                      onChange={(e) => setEditMaxGuests(e.target.value)}
                      required
                      min="1"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Kamar *
                    </label>
                    <input
                      type="number"
                      value={editTotalRooms}
                      onChange={(e) => setEditTotalRooms(e.target.value)}
                      required
                      min="1"
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
                    {editAccommodation.imageUrl && (
                      <div className="mt-2">
                        <img
                          src={editAccommodation.imageUrl}
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
                    Alamat Lengkap *
                  </label>
                  <textarea
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    required
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deskripsi Penginapan *
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
                    Fasilitas
                  </label>
                  <textarea
                    value={editAmenities}
                    onChange={(e) => setEditAmenities(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kebijakan & Aturan
                  </label>
                  <textarea
                    value={editPolicies}
                    onChange={(e) => setEditPolicies(e.target.value)}
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
                    Aktifkan penginapan
                  </label>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEdit(false);
                      setEditAccommodation(null);
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