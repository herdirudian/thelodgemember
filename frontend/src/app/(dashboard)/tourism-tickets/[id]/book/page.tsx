"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

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
}

interface BookingData {
  ticketId: string;
  memberId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  visitDate: string;
  notes?: string;
}

export default function BookTourismTicketPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TourismTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1); // Step 1: Quantity, Step 2: Details, Step 3: Confirmation

  // Form data
  const [formData, setFormData] = useState<BookingData>({
    ticketId: ticketId,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    quantity: 1,
    visitDate: "",
    notes: "",
  });

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/member/tourism-tickets/${ticketId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Tiket tidak ditemukan");
      }

      const data = await response.json();
      setTicket(data.ticket);
    } catch (err: any) {
      console.error("Load ticket error:", err);
      setError(err.message || "Gagal memuat data tiket");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "quantity" ? parseInt(value) || 1 : value
    }));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate quantity step
      if (formData.quantity < 1 || formData.quantity > ticket!.allotment) {
        setError(`Jumlah tiket harus antara 1 dan ${ticket!.allotment}`);
        return;
      }
      setError("");
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate details step
      if (!formData.customerName || !formData.customerEmail || !formData.customerPhone || !formData.visitDate) {
        setError("Mohon lengkapi semua field yang wajib diisi");
        return;
      }

      // Check visit date
      const visitDate = new Date(formData.visitDate);
      const validDate = new Date(ticket!.validDate);
      const expiryDate = new Date(ticket!.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (visitDate < today) {
        setError("Tanggal kunjungan tidak boleh di masa lalu");
        return;
      }

      if (visitDate < validDate || visitDate > expiryDate) {
        setError(`Tanggal kunjungan harus antara ${formatDate(ticket!.validDate)} dan ${formatDate(ticket!.expiryDate)}`);
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
      const response = await fetch("/api/booking/tourism-tickets", {
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
        router.push(`/booking/tourism-tickets/${result.bookingId}`);
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
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTotalAmount = () => {
    return ticket ? ticket.finalPrice * formData.quantity : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data tiket...</p>
        </div>
      </div>
    );
  }

  if (error && !ticket) {
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

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Tiket tidak ditemukan</p>
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

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Pilih Jumlah Tiket";
      case 2: return "Informasi Pemesanan";
      case 3: return "Konfirmasi Pemesanan";
      default: return "Pesan Tiket Wisata";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">{getStepTitle()}</h1>
            <p className="text-blue-100 mt-2">
              {currentStep === 1 && "Tentukan berapa tiket yang ingin Anda pesan"}
              {currentStep === 2 && "Lengkapi informasi pemesanan Anda"}
              {currentStep === 3 && "Periksa kembali detail pemesanan Anda"}
            </p>
            
            {/* Progress Steps */}
            <div className="mt-4 flex items-center space-x-4">
              <div className={`flex items-center ${currentStep >= 1 ? 'text-white' : 'text-blue-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                  1
                </div>
                <span className="ml-2 text-sm">Jumlah</span>
              </div>
              <div className={`w-8 h-0.5 ${currentStep >= 2 ? 'bg-white' : 'bg-blue-400'}`}></div>
              <div className={`flex items-center ${currentStep >= 2 ? 'text-white' : 'text-blue-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                  2
                </div>
                <span className="ml-2 text-sm">Detail</span>
              </div>
              <div className={`w-8 h-0.5 ${currentStep >= 3 ? 'bg-white' : 'bg-blue-400'}`}></div>
              <div className={`flex items-center ${currentStep >= 3 ? 'text-white' : 'text-blue-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 3 ? 'bg-white text-blue-600' : 'bg-blue-500'}`}>
                  3
                </div>
                <span className="ml-2 text-sm">Konfirmasi</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Memuat data tiket...</p>
            </div>
          ) : !ticket ? (
            <div className="p-8 text-center">
              <p className="text-red-600">Tiket tidak ditemukan</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Ticket Information */}
              <div className="mb-8 p-6 bg-gray-50 rounded-lg">
                <div className="flex flex-col md:flex-row gap-6">
                  {ticket.imageUrl && (
                    <div className="md:w-1/3">
                      <img
                        src={ticket.imageUrl}
                        alt={ticket.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="md:w-2/3">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{ticket.name}</h2>
                    <p className="text-gray-600 mb-4">{ticket.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">Kategori:</span>
                        <span className="ml-2 text-gray-600">{ticket.category}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Lokasi:</span>
                        <span className="ml-2 text-gray-600">{ticket.location}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Durasi:</span>
                        <span className="ml-2 text-gray-600">{ticket.duration}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Tersedia:</span>
                        <span className="ml-2 text-gray-600">{ticket.allotment} tiket</span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">Berlaku:</span>
                        <span className="ml-2 text-gray-600">
                          {formatDate(ticket.validDate)} - {formatDate(ticket.expiryDate)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-white rounded-lg border">
                      <div className="flex justify-between items-center">
                        <div>
                          {ticket.discount > 0 && (
                            <span className="text-sm text-gray-500 line-through">
                              {formatPrice(ticket.price)}
                            </span>
                          )}
                          <span className="text-2xl font-bold text-blue-600 ml-2">
                            {formatPrice(ticket.finalPrice)}
                          </span>
                          <span className="text-gray-600 ml-1">per tiket</span>
                        </div>
                        {ticket.discount > 0 && (
                          <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded">
                            Diskon {ticket.discount}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-step Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Quantity Selection */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Berapa tiket yang ingin Anda pesan?</h3>
                      <div className="max-w-md mx-auto">
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-3">
                          Pilih Jumlah Tiket
                        </label>
                        <div className="relative">
                          <select
                            id="quantity"
                            name="quantity"
                            value={formData.quantity}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                          >
                            {Array.from({ length: Math.min(ticket.allotment, 10) }, (_, i) => (
                              <option key={i + 1} value={i + 1}>
                                {i + 1} tiket - {formatPrice(ticket.finalPrice * (i + 1))}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          Tersedia {ticket.allotment} tiket
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="text-center">
                        <h4 className="text-lg font-semibold text-blue-900 mb-2">Total Pembayaran</h4>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatPrice(ticket.finalPrice * formData.quantity)}
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          {formData.quantity} tiket × {formatPrice(ticket.finalPrice)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Customer Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                          Nama Lengkap *
                        </label>
                        <input
                          type="text"
                          id="customerName"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>

                      <div>
                        <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          id="customerEmail"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan email"
                        />
                      </div>

                      <div>
                        <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                          Nomor Telepon *
                        </label>
                        <input
                          type="tel"
                          id="customerPhone"
                          name="customerPhone"
                          value={formData.customerPhone}
                          onChange={handleInputChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Masukkan nomor telepon"
                        />
                      </div>

                      <div>
                        <label htmlFor="visitDate" className="block text-sm font-medium text-gray-700 mb-2">
                          Tanggal Kunjungan *
                        </label>
                        <input
                          type="date"
                          id="visitDate"
                          name="visitDate"
                          value={formData.visitDate}
                          onChange={handleInputChange}
                          min={ticket.validDate}
                          max={ticket.expiryDate}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                          Catatan (Opsional)
                        </label>
                        <textarea
                          id="notes"
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Tambahkan catatan khusus untuk pemesanan Anda"
                        />
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Ringkasan Pesanan</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{formData.quantity} tiket × {formatPrice(ticket.finalPrice)}</span>
                        <span className="font-semibold text-gray-900">{formatPrice(ticket.finalPrice * formData.quantity)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Konfirmasi Pemesanan</h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium text-gray-700">Nama:</span>
                            <p className="text-gray-900">{formData.customerName}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Email:</span>
                            <p className="text-gray-900">{formData.customerEmail}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Telepon:</span>
                            <p className="text-gray-900">{formData.customerPhone}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Tanggal Kunjungan:</span>
                            <p className="text-gray-900">{formatDate(formData.visitDate)}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700">Jumlah Tiket:</span>
                            <p className="text-gray-900">{formData.quantity} tiket</p>
                          </div>
                          {formData.notes && (
                            <div className="md:col-span-2">
                              <span className="text-sm font-medium text-gray-700">Catatan:</span>
                              <p className="text-gray-900">{formData.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="text-lg font-semibold text-blue-900">Total Pembayaran</h4>
                          <p className="text-sm text-blue-700">
                            {formData.quantity} tiket × {formatPrice(ticket.finalPrice)}
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatPrice(ticket.finalPrice * formData.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center pt-6 border-t">
                  <div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePrevStep}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                      >
                        Kembali
                      </button>
                    )}
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-600 text-white px-8 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {submitting ? "Memproses..." : (
                       currentStep === 1 ? "Lanjutkan" :
                       currentStep === 2 ? "Konfirmasi" :
                       "Bayar Sekarang")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}