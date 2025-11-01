"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface TourismTicketBooking {
  id: string;
  ticketId: string;
  memberId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  quantity: number;
  visitDate: string;
  notes?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  ticket: {
    id: string;
    name: string;
    description: string;
    category: string;
    location: string;
    duration: string;
    imageUrl?: string;
  };
  payment?: {
    id: string;
    amount: number;
    status: string;
    xenditInvoiceId?: string;
    xenditInvoiceUrl?: string;
    paidAt?: string;
    createdAt: string;
  };
}

export default function TourismTicketBookingPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<TourismTicketBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/booking/tourism-tickets/${bookingId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Booking tidak ditemukan");
      }

      const data = await response.json();
      setBooking(data.booking);
    } catch (err: any) {
      console.error("Load booking error:", err);
      setError(err.message || "Gagal memuat data booking");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking || !confirm("Apakah Anda yakin ingin membatalkan booking ini?")) {
      return;
    }

    try {
      const response = await fetch(`/api/booking/tourism-tickets/${bookingId}/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Gagal membatalkan booking");
      }

      // Reload booking data
      await loadBooking();
    } catch (err: any) {
      console.error("Cancel booking error:", err);
      setError(err.message || "Gagal membatalkan booking");
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "Dikonfirmasi";
      case "pending":
        return "Menunggu Pembayaran";
      case "cancelled":
        return "Dibatalkan";
      case "expired":
        return "Kedaluwarsa";
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return "Lunas";
      case "pending":
        return "Menunggu";
      case "failed":
        return "Gagal";
      case "expired":
        return "Kedaluwarsa";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data booking...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Booking tidak ditemukan"}</p>
          <button
            onClick={() => router.push("/tourism-tickets")}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Kembali ke Tiket Wisata
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
            onClick={() => router.push("/tourism-tickets")}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center"
          >
            ← Kembali ke Tiket Wisata
          </button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Detail Booking</h1>
          <p className="text-gray-600">Booking ID: {booking.id}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Booking Status */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Status Booking</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                  <p className="text-sm text-gray-600 mt-2">
                    Dibuat pada {formatDateTime(booking.createdAt)}
                  </p>
                </div>
                {booking.status.toLowerCase() === "pending" && (
                  <button
                    onClick={handleCancelBooking}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                  >
                    Batalkan Booking
                  </button>
                )}
              </div>
            </div>

            {/* Ticket Information */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informasi Tiket</h2>
              <div className="flex gap-4">
                {booking.ticket.imageUrl && (
                  <img
                    src={booking.ticket.imageUrl}
                    alt={booking.ticket.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{booking.ticket.name}</h3>
                  <p className="text-gray-600 mb-2">{booking.ticket.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Kategori:</span>
                      <p>{booking.ticket.category}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Lokasi:</span>
                      <p>{booking.ticket.location}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Durasi:</span>
                      <p>{booking.ticket.duration}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Detail Booking</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Nama Pemesan:</span>
                  <p>{booking.customerName}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Email:</span>
                  <p>{booking.customerEmail}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Telepon:</span>
                  <p>{booking.customerPhone}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Jumlah Tiket:</span>
                  <p>{booking.quantity} tiket</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tanggal Kunjungan:</span>
                  <p>{formatDate(booking.visitDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Total Pembayaran:</span>
                  <p className="font-semibold text-blue-600">{formatPrice(booking.totalAmount)}</p>
                </div>
              </div>
              {booking.notes && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700">Catatan:</span>
                  <p className="mt-1">{booking.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Information */}
            {booking.payment && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Pembayaran</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-700">Status:</span>
                    <div className="mt-1">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.payment.status)}`}>
                        {getPaymentStatusText(booking.payment.status)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Jumlah:</span>
                    <p className="font-semibold">{formatPrice(booking.payment.amount)}</p>
                  </div>
                  {booking.payment.paidAt && (
                    <div>
                      <span className="font-medium text-gray-700">Dibayar pada:</span>
                      <p>{formatDateTime(booking.payment.paidAt)}</p>
                    </div>
                  )}
                  {booking.payment.xenditInvoiceUrl && booking.payment.status.toLowerCase() === "pending" && (
                    <div className="mt-4">
                      <a
                        href={booking.payment.xenditInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center block"
                      >
                        Bayar Sekarang
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aksi</h3>
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
                >
                  Cetak Booking
                </button>
                {booking.status.toLowerCase() === "confirmed" && (
                  <button
                    onClick={() => {
                      // Generate QR code or ticket
                      alert("Fitur download tiket akan segera tersedia");
                    }}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                  >
                    Download E-Ticket
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}