"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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
}

interface BookingData {
  accommodationId: string;
  memberId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  rooms: number;
  notes?: string;
}

export default function BookAccommodationPage() {
  const router = useRouter();
  const params = useParams();
  const accommodationId = params.id as string;

  const [accommodation, setAccommodation] = useState<Accommodation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Dates & Guests, Step 2: Details, Step 3: Confirmation

  // Form data
  const [formData, setFormData] = useState<BookingData>({
    accommodationId: accommodationId,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    checkInDate: "",
    checkOutDate: "",
    guests: 1,
    rooms: 1,
    notes: "",
  });

  useEffect(() => {
    if (accommodationId) {
      loadAccommodation();
    }
  }, [accommodationId]);

  const loadAccommodation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/member/accommodations/${accommodationId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Penginapan tidak ditemukan");
      }

      const data = await response.json();
      setAccommodation(data.accommodation);
    } catch (err: any) {
      console.error("Load accommodation error:", err);
      setError(err.message || "Gagal memuat data penginapan");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "guests" ? parseInt(value) || 1 : value
    }));
  };

  const calculateNights = () => {
    if (!formData.checkInDate || !formData.checkOutDate) return 0;
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const getTotalAmount = () => {
    if (!accommodation) return 0;
    const nights = calculateNights();
    return accommodation.finalPrice * nights * formData.rooms;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate dates and guests step
      if (!formData.checkInDate || !formData.checkOutDate) {
        setError("Mohon pilih tanggal check-in dan check-out");
        return;
      }

      if (formData.rooms < 1) {
        setError("Jumlah kamar minimal 1");
        return;
      }

      if (formData.guests < 1 || formData.guests > accommodation!.capacity * formData.rooms) {
        setError(`Jumlah tamu harus antara 1 dan ${accommodation!.capacity * formData.rooms} (${accommodation!.capacity} per kamar)`);
        return;
      }

      // Check dates
      const checkInDate = new Date(formData.checkInDate);
      const checkOutDate = new Date(formData.checkOutDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        setError("Tanggal check-in tidak boleh di masa lalu");
        return;
      }

      if (checkOutDate <= checkInDate) {
        setError("Tanggal check-out harus setelah tanggal check-in");
        return;
      }

      const nights = calculateNights();
      if (nights < 1) {
        setError("Minimal menginap 1 malam");
        return;
      }

      setError("");
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate details step
      if (!formData.customerName || !formData.customerEmail || !formData.customerPhone) {
        setError("Mohon lengkapi semua field yang wajib diisi");
        return;
      }

      setError("");
      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 3) {
      handleNextStep();
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/booking/accommodations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal membuat pemesanan");
      }

      // Redirect to payment page or booking details
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
      } else {
        router.push(`/booking/accommodations/${result.bookingId}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Pilih Tanggal & Jumlah Tamu";
      case 2:
        return "Detail Pemesanan";
      case 3:
        return "Konfirmasi Pemesanan";
      default:
        return "Pemesanan Akomodasi";
    }
  };

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

  if (error && !accommodation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  if (!accommodation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Penginapan tidak ditemukan</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Kembali
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pesan Penginapan</h1>
          <p className="text-gray-600">Lengkapi informasi booking untuk melanjutkan pembayaran</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Accommodation Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Detail Penginapan</h2>
            
            {accommodation.imageUrl && (
              <img
                src={accommodation.imageUrl}
                alt={accommodation.name}
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{accommodation.name}</h3>
                <p className="text-gray-600">{accommodation.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Tipe:</span>
                  <p>{accommodation.type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Lokasi:</span>
                  <p>{accommodation.location}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Kapasitas:</span>
                  <p>{accommodation.capacity} orang</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Check-in:</span>
                  <p>{accommodation.checkInTime}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Check-out:</span>
                  <p>{accommodation.checkOutTime}</p>
                </div>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Fasilitas:</span>
                <p className="text-sm">{accommodation.amenities}</p>
              </div>
              
              <div>
                <span className="font-medium text-gray-700">Kebijakan:</span>
                <p className="text-sm">{accommodation.policies}</p>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Harga per malam:</span>
                  <div className="text-right">
                    {accommodation.discount > 0 && (
                      <span className="text-sm text-gray-500 line-through block">
                        {formatPrice(accommodation.pricePerNight)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-blue-600">
                      {formatPrice(accommodation.finalPrice)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {getStepTitle()}
              </h2>
              
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    1
                  </div>
                  <div className={`w-16 h-1 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    2
                  </div>
                  <div className={`w-16 h-1 ${currentStep > 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    3
                  </div>
                </div>
              </div>
              
              <div className="text-center text-sm text-gray-600 mb-4">
                <span className="font-medium">Akomodasi:</span> {accommodation.name}
              </div>
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Dates & Guests */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Check-in *
                      </label>
                      <input
                        type="date"
                        name="checkInDate"
                        value={formData.checkInDate}
                        onChange={handleInputChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Check-out *
                      </label>
                      <input
                        type="date"
                        name="checkOutDate"
                        value={formData.checkOutDate}
                        onChange={handleInputChange}
                        required
                        min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jumlah Kamar *
                      </label>
                      <select
                        name="rooms"
                        value={formData.rooms}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: Math.min(accommodation.capacity, 5) }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num} kamar</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Jumlah Tamu *
                      </label>
                      <select
                        name="guests"
                        value={formData.guests}
                        onChange={handleInputChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {Array.from({ length: accommodation.capacity * formData.rooms }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num} orang</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview Summary for Step 1 */}
                  {calculateNights() > 0 && (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <h4 className="font-medium text-gray-900 mb-2">Ringkasan Pemesanan</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Jumlah kamar:</span>
                          <span>{formData.rooms} kamar</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Jumlah tamu:</span>
                          <span>{formData.guests} orang</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lama menginap:</span>
                          <span>{calculateNights()} malam</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Harga per malam per kamar:</span>
                          <span>{formatPrice(accommodation.finalPrice)}</span>
                        </div>
                        <div className="flex justify-between font-semibold text-gray-900 border-t pt-1">
                          <span>Total:</span>
                          <span>{formatPrice(getTotalAmount())}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Customer Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Lengkap *
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan nama lengkap"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nomor Telepon *
                    </label>
                    <input
                      type="tel"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Masukkan nomor telepon"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catatan (Opsional)
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Catatan tambahan..."
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="font-medium text-gray-900 mb-3">Konfirmasi Pemesanan</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nama:</span>
                        <span className="font-medium">{formData.customerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{formData.customerEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Telepon:</span>
                        <span className="font-medium">{formData.customerPhone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in:</span>
                        <span className="font-medium">{formatDate(formData.checkInDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-out:</span>
                        <span className="font-medium">{formatDate(formData.checkOutDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jumlah kamar:</span>
                        <span className="font-medium">{formData.rooms} kamar</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Jumlah tamu:</span>
                        <span className="font-medium">{formData.guests} orang</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Lama menginap:</span>
                        <span className="font-medium">{calculateNights()} malam</span>
                      </div>
                      {formData.notes && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Catatan:</span>
                          <span className="font-medium">{formData.notes}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="border-t mt-3 pt-3">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total Pembayaran:</span>
                        <span className="text-blue-600">{formatPrice(getTotalAmount())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Kembali
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2 rounded-md font-medium ${
                    currentStep < 3
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed ${
                    currentStep === 1 ? 'ml-auto' : ''
                  }`}
                >
                  {submitting 
                    ? "Memproses..." 
                    : currentStep < 3 
                      ? "Lanjutkan" 
                      : "Konfirmasi & Bayar"
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}