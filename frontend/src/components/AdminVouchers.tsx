"use client";
import { useEffect, useState } from "react";

interface VoucherItem {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  originalPrice?: number;
  discountedPrice?: number;
  discountPercentage?: number;
  imageUrl?: string;
  validFrom: string;
  validUntil: string;
  maxRedemptions?: number;
  currentRedemptions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminVouchers() {
  const [items, setItems] = useState<VoucherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter and search states
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editVoucher, setEditVoucher] = useState<VoucherItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPointsCost, setFormPointsCost] = useState("");
  const [formOriginalPrice, setFormOriginalPrice] = useState("");
  const [formDiscountedPrice, setFormDiscountedPrice] = useState("");
  const [formDiscountPercentage, setFormDiscountPercentage] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formMaxRedemptions, setFormMaxRedemptions] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  // Image upload states
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadVouchers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/vouchers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load vouchers");
      const data = await response.json();
      setItems(data.data || []);
    } catch (e: any) {
      setError(e?.message || "Failed to load vouchers");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const resetForm = () => {
    setEditVoucher(null);
    setFormTitle("");
    setFormDescription("");
    setFormPointsCost("");
    setFormOriginalPrice("");
    setFormDiscountedPrice("");
    setFormDiscountPercentage("");
    setFormImageUrl("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormMaxRedemptions("");
    setFormIsActive(true);
    setSelectedFile(null);
  };

  const handleAdd = () => {
    resetForm();
    // Set default dates
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    
    setFormValidFrom(today.toISOString().split('T')[0]);
    setFormValidUntil(nextMonth.toISOString().split('T')[0]);
    setShowForm(true);
  };

  const handleEdit = (voucher: VoucherItem) => {
    setEditVoucher(voucher);
    setFormTitle(voucher.title);
    setFormDescription(voucher.description);
    setFormPointsCost(voucher.pointsCost.toString());
    setFormOriginalPrice(voucher.originalPrice?.toString() || "");
    setFormDiscountedPrice(voucher.discountedPrice?.toString() || "");
    setFormDiscountPercentage(voucher.discountPercentage?.toString() || "");
    setFormImageUrl(voucher.imageUrl || "");
    setFormValidFrom(voucher.validFrom.split('T')[0]);
    setFormValidUntil(voucher.validUntil.split('T')[0]);
    setFormMaxRedemptions(voucher.maxRedemptions?.toString() || "");
    setFormIsActive(voucher.isActive);
    setSelectedFile(null);
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("File size must be less than 5MB");
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError("Please select an image file");
        return;
      }
      setSelectedFile(file);
      setError("");
    }
  };

  const uploadImage = async (): Promise<string> => {
    if (!selectedFile) return formImageUrl;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/upload/voucher-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");
      
      const data = await response.json();
      return data.imageUrl;
    } catch (e: any) {
      throw new Error(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formDescription.trim() || !formPointsCost.trim() || !formValidFrom || !formValidUntil) {
      setError("Please fill all required fields");
      return;
    }

    if (new Date(formValidFrom) >= new Date(formValidUntil)) {
      setError("Valid until date must be after valid from date");
      return;
    }

    const pointsCost = parseInt(formPointsCost);
    if (isNaN(pointsCost) || pointsCost <= 0) {
      setError("Points cost must be a positive number");
      return;
    }

    setFormSaving(true);
    setError("");
    try {
      let imageUrl = formImageUrl;
      
      // Upload new image if selected
      if (selectedFile) {
        imageUrl = await uploadImage();
      }

      const token = localStorage.getItem("token");
      const voucherData = {
        title: formTitle,
        description: formDescription,
        pointsCost: pointsCost,
        originalPrice: formOriginalPrice ? parseFloat(formOriginalPrice) : null,
        discountedPrice: formDiscountedPrice ? parseFloat(formDiscountedPrice) : null,
        discountPercentage: formDiscountPercentage ? parseInt(formDiscountPercentage) : null,
        imageUrl: imageUrl || null,
        validFrom: new Date(formValidFrom).toISOString(),
        validUntil: new Date(formValidUntil).toISOString(),
        maxRedemptions: formMaxRedemptions ? parseInt(formMaxRedemptions) : null,
        isActive: formIsActive,
      };

      const url = editVoucher ? `/api/admin/vouchers/${editVoucher.id}` : `/api/admin/vouchers`;
      const method = editVoucher ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(voucherData),
      });

      if (!response.ok) throw new Error(`Failed to ${editVoucher ? "update" : "create"} voucher`);
      
      setSuccess(`Voucher ${editVoucher ? "updated" : "created"} successfully!`);
      setShowForm(false);
      loadVouchers();
    } catch (e: any) {
      setError(e?.message || `Failed to ${editVoucher ? "update" : "create"} voucher`);
    }
    setFormSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete voucher "${title}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/vouchers/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete voucher");
      
      setSuccess("Voucher deleted successfully!");
      loadVouchers();
    } catch (e: any) {
      setError(e?.message || "Failed to delete voucher");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/vouchers/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to toggle voucher status");
      
      setSuccess(`Voucher ${!currentStatus ? "activated" : "deactivated"} successfully!`);
      loadVouchers();
    } catch (e: any) {
      setError(e?.message || "Failed to toggle voucher status");
    }
  };

  // Filter and search logic
  const filteredVouchers = items.filter(voucher => {
    const now = new Date();
    const validUntil = new Date(voucher.validUntil);
    const isExpired = validUntil < now;
    
    const matchesStatus = filterStatus === "ALL" || 
                         (filterStatus === "ACTIVE" && voucher.isActive && !isExpired) ||
                         (filterStatus === "INACTIVE" && !voucher.isActive) ||
                         (filterStatus === "EXPIRED" && isExpired);
    const matchesSearch = (voucher.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (voucher.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredVouchers.length / pageSize);
  const paginatedVouchers = filteredVouchers.slice((page - 1) * pageSize, page * pageSize);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getVoucherStatus = (voucher: VoucherItem) => {
    const now = new Date();
    const validFrom = new Date(voucher.validFrom);
    const validUntil = new Date(voucher.validUntil);
    const isExpired = validUntil < now;
    const isNotStarted = validFrom > now;
    
    if (!voucher.isActive) return { label: "Nonaktif", color: "bg-gray-100 text-gray-800" };
    if (isExpired) return { label: "Kedaluwarsa", color: "bg-red-100 text-red-800" };
    if (isNotStarted) return { label: "Belum Dimulai", color: "bg-yellow-100 text-yellow-800" };
    if (voucher.maxRedemptions && voucher.currentRedemptions >= voucher.maxRedemptions) {
      return { label: "Habis", color: "bg-orange-100 text-orange-800" };
    }
    return { label: "Aktif", color: "bg-green-100 text-green-800" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Voucher</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30]"
          >
            Tambah Voucher
          </button>
          <button
            onClick={loadVouchers}
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
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="ALL">Semua Voucher</option>
            <option value="ACTIVE">Voucher Aktif</option>
            <option value="INACTIVE">Voucher Nonaktif</option>
            <option value="EXPIRED">Voucher Kedaluwarsa</option>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Voucher</h3>
          <p className="text-2xl font-bold text-blue-600">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Voucher Aktif</h3>
          <p className="text-2xl font-bold text-green-600">
            {items.filter(v => {
              const now = new Date();
              const validUntil = new Date(v.validUntil);
              return v.isActive && validUntil >= now;
            }).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Penukaran</h3>
          <p className="text-2xl font-bold text-purple-600">
            {items.reduce((sum, v) => sum + (v.currentRedemptions || 0), 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Voucher Kedaluwarsa</h3>
          <p className="text-2xl font-bold text-red-600">
            {items.filter(v => new Date(v.validUntil) < new Date()).length}
          </p>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading...
          </div>
        ) : paginatedVouchers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Tidak ada voucher ditemukan
          </div>
        ) : (
          paginatedVouchers.map((voucher) => {
            const status = getVoucherStatus(voucher);
            return (
              <div key={voucher.id} className="bg-white rounded-lg shadow border overflow-hidden">
                {voucher.imageUrl && (
                  <div className="relative">
                    <img
                      src={voucher.imageUrl}
                      alt={voucher.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder-voucher.jpg';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{voucher.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{voucher.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Biaya Poin:</span>
                      <span className="font-semibold text-blue-600">{(voucher.pointsCost || 0).toLocaleString('id-ID')} poin</span>
                    </div>
                    
                    {voucher.originalPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Harga Asli:</span>
                        <span className="text-sm line-through text-gray-500">{formatPrice(voucher.originalPrice)}</span>
                      </div>
                    )}
                    
                    {voucher.discountedPrice && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Harga Diskon:</span>
                        <span className="font-semibold text-green-600">{formatPrice(voucher.discountedPrice)}</span>
                      </div>
                    )}
                    
                    {voucher.discountPercentage && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Diskon:</span>
                        <span className="font-semibold text-red-600">{voucher.discountPercentage}%</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Berlaku:</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(voucher.validFrom)} - {formatDate(voucher.validUntil)}
                      </span>
                    </div>
                    
                    {voucher.maxRedemptions && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Penukaran:</span>
                        <span className="text-sm text-gray-900">
                          {voucher.currentRedemptions} / {voucher.maxRedemptions}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleEdit(voucher)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(voucher.id, voucher.isActive)}
                      className={`px-3 py-1 text-sm rounded-md ${
                        voucher.isActive 
                          ? "bg-orange-100 text-orange-700 hover:bg-orange-200" 
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {voucher.isActive ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button
                      onClick={() => handleDelete(voucher.id, voucher.title)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">
              Menampilkan {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredVouchers.length)} dari {filteredVouchers.length} voucher
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

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">
              {editVoucher ? "Edit Voucher" : "Tambah Voucher Baru"}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan judul voucher"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan deskripsi voucher"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Poin *</label>
                  <input
                    type="number"
                    value={formPointsCost}
                    onChange={(e) => setFormPointsCost(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maksimal Penukaran</label>
                  <input
                    type="number"
                    value={formMaxRedemptions}
                    onChange={(e) => setFormMaxRedemptions(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Kosongkan jika tidak terbatas"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Asli</label>
                  <input
                    type="number"
                    value={formOriginalPrice}
                    onChange={(e) => setFormOriginalPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Diskon</label>
                  <input
                    type="number"
                    value={formDiscountedPrice}
                    onChange={(e) => setFormDiscountedPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Persentase Diskon (%)</label>
                  <input
                    type="number"
                    value={formDiscountPercentage}
                    onChange={(e) => setFormDiscountPercentage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="0"
                    max="100"
                  />
                </div>
              </div>
              
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Voucher</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Upload Gambar Baru</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">Maksimal 5MB, format: JPG, PNG, GIF</p>
                  </div>
                  
                  {!selectedFile && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Atau URL Gambar</label>
                      <input
                        type="url"
                        value={formImageUrl}
                        onChange={(e) => setFormImageUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                  )}
                  
                  {/* Image Preview */}
                  {(formImageUrl || selectedFile) && (
                    <div className="mt-3">
                      <label className="block text-sm text-gray-600 mb-1">Preview</label>
                      <img
                        src={selectedFile ? URL.createObjectURL(selectedFile) : formImageUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-md border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Dari *</label>
                  <input
                    type="date"
                    value={formValidFrom}
                    onChange={(e) => setFormValidFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Sampai *</label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                  Voucher Aktif
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
                disabled={formSaving || uploading}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
              >
                {formSaving || uploading ? "Menyimpan..." : (editVoucher ? "Update" : "Tambah")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}