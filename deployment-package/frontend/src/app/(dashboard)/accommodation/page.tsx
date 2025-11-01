"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Accommodation {
  id: string;
  name: string;
  description: string;
  type: string;
  location: string;
  capacity: number;
  pricePerNight: number;
  discount: number;
  finalPrice: number;
  imageUrl?: string;
  amenities: string;
  checkInTime: string;
  checkOutTime: string;
  policies: string;
  isActive: boolean;
  createdAt: string;
}

export default function AccommodationPage() {
  const router = useRouter();
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("name");

  useEffect(() => {
    loadAccommodations();
  }, []);

  const loadAccommodations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/member/accommodations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Gagal memuat data penginapan");
      }

      const data = await response.json();
      setAccommodations(data.accommodations.filter((acc: Accommodation) => acc.isActive));
    } catch (err: any) {
      console.error("Load accommodations error:", err);
      setError(err.message || "Gagal memuat data penginapan");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredAccommodations = accommodations
    .filter(accommodation => {
      const matchesSearch = accommodation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          accommodation.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          accommodation.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !typeFilter || accommodation.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.finalPrice - b.finalPrice;
        case "capacity":
          return b.capacity - a.capacity;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const accommodationTypes = [...new Set(accommodations.map(acc => acc.type))];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data penginapan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Penginapan</h1>
          <p className="text-gray-600">Temukan penginapan terbaik untuk liburan Anda</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Penginapan
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nama, lokasi, atau deskripsi..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Penginapan
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Tipe</option>
                {accommodationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Urutkan
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Nama A-Z</option>
                <option value="price">Harga Terendah</option>
                <option value="capacity">Kapasitas Terbesar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={loadAccommodations}
              className="mt-2 text-red-600 hover:text-red-700 underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Accommodations Grid */}
        {filteredAccommodations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">
              {searchTerm || typeFilter ? "Tidak ada penginapan yang sesuai dengan filter" : "Belum ada penginapan tersedia"}
            </p>
            {(searchTerm || typeFilter) && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setTypeFilter("");
                }}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAccommodations.map((accommodation) => (
              <div key={accommodation.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                {accommodation.imageUrl && (
                  <img
                    src={accommodation.imageUrl}
                    alt={accommodation.name}
                    className="w-full h-48 object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{accommodation.name}</h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                      {accommodation.type}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{accommodation.description}</p>
                  
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center">
                      <span className="font-medium">📍 Lokasi:</span>
                      <span className="ml-2">{accommodation.location}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">👥 Kapasitas:</span>
                      <span className="ml-2">{accommodation.capacity} orang</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">🕐 Check-in:</span>
                      <span className="ml-2">{accommodation.checkInTime}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="font-medium">🕐 Check-out:</span>
                      <span className="ml-2">{accommodation.checkOutTime}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        {accommodation.discount > 0 && (
                          <span className="text-sm text-gray-500 line-through block">
                            {formatPrice(accommodation.pricePerNight)}
                          </span>
                        )}
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(accommodation.finalPrice)}
                        </span>
                        <span className="text-sm text-gray-600">/malam</span>
                      </div>
                      {accommodation.discount > 0 && (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                          -{accommodation.discount}%
                        </span>
                      )}
                    </div>
                    
                    <button
                      onClick={() => router.push(`/accommodation/${accommodation.id}/book`)}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Pesan Sekarang
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results Count */}
        {filteredAccommodations.length > 0 && (
          <div className="mt-8 text-center text-gray-600">
            Menampilkan {filteredAccommodations.length} dari {accommodations.length} penginapan
          </div>
        )}
      </div>
    </div>
  );
}