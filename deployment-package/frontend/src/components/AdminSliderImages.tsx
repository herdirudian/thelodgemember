"use client";
import { useEffect, useState } from "react";

interface SliderImage {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  linkUrl?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSliderImages() {
  const [items, setItems] = useState<SliderImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter and search states
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editSlider, setEditSlider] = useState<SliderImage | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formOrder, setFormOrder] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSaving, setFormSaving] = useState(false);

  // Image upload states
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const loadSliderImages = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/slider-images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load slider images");
      const data = await response.json();
      setItems(data.sort((a: SliderImage, b: SliderImage) => a.order - b.order));
    } catch (e: any) {
      setError(e?.message || "Failed to load slider images");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSliderImages();
  }, []);

  const resetForm = () => {
    setEditSlider(null);
    setFormTitle("");
    setFormDescription("");
    setFormImageUrl("");
    setFormLinkUrl("");
    setFormOrder("");
    setFormIsActive(true);
    setSelectedFile(null);
  };

  const handleAdd = () => {
    resetForm();
    const nextOrder = Math.max(...items.map(item => item.order), 0) + 1;
    setFormOrder(nextOrder.toString());
    setShowForm(true);
  };

  const handleEdit = (slider: SliderImage) => {
    setEditSlider(slider);
    setFormTitle(slider.title);
    setFormDescription(slider.description || "");
    setFormImageUrl(slider.imageUrl);
    setFormLinkUrl(slider.linkUrl || "");
    setFormOrder(slider.order.toString());
    setFormIsActive(slider.isActive);
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
      const response = await fetch(`/api/admin/upload/slider-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");
      
      const data = await response.json();
      console.log('Upload response data:', data);
      return data.data.imageUrl;
    } catch (e: any) {
      throw new Error(e?.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formTitle.trim()) {
      setError("Please enter a title");
      return;
    }

    if (!formImageUrl.trim() && !selectedFile) {
      setError("Please provide an image URL or upload an image");
      return;
    }

    setFormSaving(true);
    setError("");
    try {
      let imageUrl = formImageUrl;
      
      // Upload new image if selected
      if (selectedFile) {
        imageUrl = await uploadImage();
        console.log('Uploaded image URL:', imageUrl);
      }

      console.log('Final imageUrl before sending:', imageUrl);

      const token = localStorage.getItem("token");
      const sliderData = {
        title: formTitle,
        description: formDescription || null,
        imageUrl: imageUrl || null,
        linkUrl: formLinkUrl || null,
        position: parseInt(formOrder) || 1,
        isActive: formIsActive,
      };

      const url = editSlider ? `/api/admin/slider-images/${editSlider.id}` : `/api/admin/slider-images`;
      const method = editSlider ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sliderData),
      });

      console.log('Slider request data:', sliderData);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.log('Error response:', errorData);
        throw new Error(`Failed to ${editSlider ? "update" : "create"} slider image: ${errorData}`);
      }
      
      setSuccess(`Slider image ${editSlider ? "updated" : "created"} successfully!`);
      setShowForm(false);
      loadSliderImages();
    } catch (e: any) {
      setError(e?.message || `Failed to ${editSlider ? "update" : "create"} slider image`);
    }
    setFormSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete slider "${title}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/slider-images/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to delete slider image");
      
      setSuccess("Slider image deleted successfully!");
      loadSliderImages();
    } catch (e: any) {
      setError(e?.message || "Failed to delete slider image");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/slider-images/${id}/toggle-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error("Failed to toggle slider status");
      
      setSuccess(`Slider ${!currentStatus ? "activated" : "deactivated"} successfully!`);
      loadSliderImages();
    } catch (e: any) {
      setError(e?.message || "Failed to toggle slider status");
    }
  };

  const handleReorder = async (id: string, newOrder: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/slider-images/${id}/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order: newOrder }),
      });

      if (!response.ok) throw new Error("Failed to reorder slider");
      
      loadSliderImages();
    } catch (e: any) {
      setError(e?.message || "Failed to reorder slider");
    }
  };

  // Filter and search logic
  const filteredSliders = items.filter(slider => {
    const matchesStatus = filterStatus === "ALL" || 
                         (filterStatus === "ACTIVE" && slider.isActive) ||
                         (filterStatus === "INACTIVE" && !slider.isActive);
    const matchesSearch = (slider.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (slider.description && slider.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

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
        <h1 className="text-2xl font-bold text-gray-900">Kelola Slider</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30]"
          >
            Tambah Slider
          </button>
          <button
            onClick={loadSliderImages}
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
            <option value="ALL">Semua Slider</option>
            <option value="ACTIVE">Slider Aktif</option>
            <option value="INACTIVE">Slider Nonaktif</option>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Total Slider</h3>
          <p className="text-2xl font-bold text-blue-600">{items.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Slider Aktif</h3>
          <p className="text-2xl font-bold text-green-600">
            {items.filter(s => s.isActive).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-600">Slider Nonaktif</h3>
          <p className="text-2xl font-bold text-red-600">
            {items.filter(s => !s.isActive).length}
          </p>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Loading...
          </div>
        ) : filteredSliders.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            Tidak ada slider ditemukan
          </div>
        ) : (
          filteredSliders.map((slider) => (
            <div key={slider.id} className="bg-white rounded-lg shadow border overflow-hidden">
              <div className="relative">
                <img
                  src={slider.imageUrl}
                  alt={slider.title}
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder-image.jpg';
                  }}
                />
                <div className="absolute top-2 right-2 flex space-x-1">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    slider.isActive 
                      ? "bg-green-100 text-green-800" 
                      : "bg-red-100 text-red-800"
                  }`}>
                    {slider.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    #{slider.order}
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{slider.title}</h3>
                {slider.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{slider.description}</p>
                )}
                {slider.linkUrl && (
                  <p className="text-sm text-blue-600 mb-3 truncate">
                    🔗 {slider.linkUrl}
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-4">
                  Dibuat: {formatDate(slider.createdAt)}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleEdit(slider)}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(slider.id, slider.isActive)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      slider.isActive 
                        ? "bg-orange-100 text-orange-700 hover:bg-orange-200" 
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    {slider.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    onClick={() => handleDelete(slider.id, slider.title)}
                    className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    Hapus
                  </button>
                </div>
                
                {/* Reorder buttons */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Urutan: {slider.order}</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleReorder(slider.id, (slider.order || 1) - 1)}
                      disabled={slider.order === 1}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded disabled:opacity-50"
                      title="Pindah ke atas"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => handleReorder(slider.id, (slider.order || 1) + 1)}
                      disabled={slider.order === items.length}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded disabled:opacity-50"
                      title="Pindah ke bawah"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-4">
              {editSlider ? "Edit Slider" : "Tambah Slider Baru"}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan judul slider"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Masukkan deskripsi slider"
                />
              </div>
              
              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gambar</label>
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
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
                <input
                  type="url"
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="https://example.com (opsional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  min="1"
                />
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
                  Slider Aktif
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
                {formSaving || uploading ? "Menyimpan..." : (editSlider ? "Update" : "Tambah")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}