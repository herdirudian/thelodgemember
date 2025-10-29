"use client";
import { useEffect, useState } from "react";

const API = "";

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



export default function TourismTicketsPage() {
  const [tickets, setTickets] = useState<TourismTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // State untuk keranjang tiket
  const [selectedTickets, setSelectedTickets] = useState<{[key: string]: number}>({});
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<TourismTicket | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // State untuk form pengisian identitas
  const [showIdentityForm, setShowIdentityForm] = useState(false);
  const [identityData, setIdentityData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/member/tourism-tickets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load tourism tickets");
      }

      const data = await response.json();
      setTickets(data.tickets || []);
    } catch (err: any) {
      console.error("Load tickets error:", err);
      setError(err.message || "Failed to load tourism tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTicket = (ticketId: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setCurrentTicket(ticket);
      setQuantity(1);
      setShowQuantityModal(true);
    }
  };

  const handleConfirmAddTicket = () => {
    if (currentTicket) {
      setSelectedTickets(prev => ({
        ...prev,
        [currentTicket.id]: (prev[currentTicket.id] || 0) + quantity
      }));
      setShowQuantityModal(false);
      setCurrentTicket(null);
      setQuantity(1);
    }
  };

  const handleRemoveTicket = (ticketId: string) => {
    setSelectedTickets(prev => {
      const newSelected = { ...prev };
      delete newSelected[ticketId];
      return newSelected;
    });
  };

  const getTotalPrice = () => {
    return Object.entries(selectedTickets).reduce((total, [ticketId, qty]) => {
      const ticket = tickets.find(t => t.id === ticketId);
      return total + (ticket ? ticket.finalPrice * qty : 0);
    }, 0);
  };

  const getTotalItems = () => {
    return Object.values(selectedTickets).reduce((total, qty) => total + qty, 0);
  };

  // Fungsi validasi form
  const validateForm = () => {
    const errors = [];
    
    if (!identityData.fullName.trim()) {
      errors.push("Nama lengkap harus diisi");
    }
    
    if (!identityData.email.trim()) {
      errors.push("Email harus diisi");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identityData.email)) {
      errors.push("Format email tidak valid");
    }
    
    if (!identityData.phone.trim()) {
      errors.push("Nomor telepon harus diisi");
    } else if (!/^08\d{8,11}$/.test(identityData.phone)) {
      errors.push("Format nomor telepon tidak valid (harus dimulai dengan 08 dan 10-13 digit)");
    }
    
    if (!identityData.address.trim()) {
      errors.push("Alamat lengkap harus diisi");
    }
    
    return errors;
  };

  // Fungsi submit form
  const handleSubmitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors = validateForm();
    
    if (errors.length > 0) {
      alert("Mohon perbaiki kesalahan berikut:\n\n" + errors.join("\n"));
      return;
    }
    
    try {
      // Proses setiap tiket yang dipilih
      const bookingPromises = Object.entries(selectedTickets).map(async ([ticketId, quantity]) => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return null;

        const bookingData = {
          ticketId,
          customerName: identityData.fullName,
          customerEmail: identityData.email,
          customerPhone: identityData.phone,
          customerAddress: identityData.address,
          emergencyContactName: identityData.emergencyContact,
          emergencyContactPhone: identityData.emergencyPhone,
          specialRequests: identityData.specialRequests,
          quantity,
          visitDate: new Date().toISOString(), // Untuk saat ini menggunakan tanggal hari ini
          notes: `Booking tiket ${ticket.name}`
        };

        const response = await fetch(`/api/booking/tourism-tickets`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Gagal membuat booking');
        }

        return await response.json();
      });

      const bookingResults = await Promise.all(bookingPromises);
      const successfulBookings = bookingResults.filter(result => result !== null);

      if (successfulBookings.length === 0) {
        throw new Error('Tidak ada booking yang berhasil dibuat');
      }

      // Ambil invoice URL dari booking pertama (untuk multiple tickets, bisa disesuaikan)
      const firstBooking = successfulBookings[0];
      if (firstBooking.booking && firstBooking.booking.invoiceUrl) {
        // Redirect ke halaman pembayaran Xendit
        window.open(firstBooking.booking.invoiceUrl, '_blank');
        
        // Reset form dan tutup modal
        setShowIdentityForm(false);
        setIdentityData({
          fullName: '',
          email: '',
          phone: '',
          address: ''
        });
        setSelectedTickets({});
        
        alert('Booking berhasil dibuat! Halaman pembayaran akan terbuka di tab baru.');
      } else {
        throw new Error('Invoice URL tidak ditemukan');
      }

    } catch (error: any) {
      console.error('Booking error:', error);
      alert(`Terjadi kesalahan: ${error.message}`);
    }
  };



  const filteredTickets = tickets.filter((ticket) => {
    const matchesCategory = filterCategory === "ALL" || ticket.category === filterCategory;
    const matchesSearch = ticket.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && ticket.isActive;
  });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat tiket wisata...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTickets}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Coba Lagi
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tiket Wisata</h1>
          <p className="text-gray-600">Semua tiket wisata yang diposting oleh admin</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Semua Kategori</option>
                <option value="Adventure">Adventure</option>
                <option value="Cultural">Cultural</option>
                <option value="Nature">Nature</option>
                <option value="Family">Family</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pencarian
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama tiket, deskripsi, atau lokasi..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>



        {/* Single Column Tickets List */}
        {filteredTickets.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <p className="text-gray-500">Tidak ada tiket wisata yang ditemukan.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTickets.map((ticket) => (
              <div key={ticket.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Ticket Header with Image */}
                <div className="p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    {ticket.imageUrl && (
                      <img
                        src={ticket.imageUrl}
                        alt={ticket.name}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {ticket.category}
                        </span>
                        <span className="text-sm text-gray-500">📍 {ticket.location}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{ticket.name}</h3>
                      <p className="text-gray-600 mb-3">{ticket.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>⏱️ {ticket.duration}</span>
                        <span>🎫 {ticket.allotment} tersedia</span>
                        <span>📅 {formatDate(ticket.validDate)} - {formatDate(ticket.expiryDate)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Price Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Harga Tiket</h4>
                        <div className="text-sm text-gray-600">
                          <p>• Tiket berlaku sesuai tanggal yang tertera</p>
                          <p>• Tiket tidak dapat dikembalikan (non-refundable)</p>
                          <p>• Termasuk fasilitas sesuai yang tercantum</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {ticket.discount > 0 && (
                          <div className="text-lg text-gray-500 line-through">
                            {formatPrice(ticket.price)}
                          </div>
                        )}
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(ticket.finalPrice)}
                        </div>
                        {ticket.discount > 0 && (
                          <div className="text-sm text-red-600 font-medium">
                            Hemat {formatPrice(ticket.discount)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add Ticket Button */}
                  <div className="border-t pt-6">
                    <button
                      onClick={() => handleAddTicket(ticket.id)}
                      className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="font-medium">Tambah Tiket</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Keranjang dan Tombol Pembayaran */}
        {getTotalItems() > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Keranjang Tiket ({getTotalItems()} item)</h3>
            
            <div className="space-y-3 mb-6">
              {Object.entries(selectedTickets).map(([ticketId, qty]) => {
                const ticket = tickets.find(t => t.id === ticketId);
                if (!ticket) return null;
                
                return (
                  <div key={ticketId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{ticket.name}</h4>
                      <p className="text-sm text-gray-600">{ticket.location}</p>
                      <p className="text-sm text-green-600 font-medium">
                        {formatPrice(ticket.finalPrice)} x {qty} = {formatPrice(ticket.finalPrice * qty)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveTicket(ticketId)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Hapus dari keranjang"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold">Total Pembayaran:</span>
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(getTotalPrice())}
                </span>
              </div>
              
              <button
                onClick={() => setShowIdentityForm(true)}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 text-lg font-semibold"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span>Lanjutkan Pembayaran</span>
              </button>
            </div>
          </div>
        )}

        {/* Quantity Modal */}
        {showQuantityModal && currentTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Pilih Jumlah Tiket</h3>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-800">{currentTicket.name}</h4>
                <p className="text-sm text-gray-600">{currentTicket.location}</p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  {formatPrice(currentTicket.finalPrice)} / tiket
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Tiket
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(currentTicket.allotment, quantity + 1))}
                    className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Maksimal {currentTicket.allotment} tiket tersedia
                </p>
              </div>

              <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Harga:</span>
                  <span className="text-lg font-bold text-green-600">
                    {formatPrice(currentTicket.finalPrice * quantity)}
                  </span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowQuantityModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleConfirmAddTicket}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Tambah ke Keranjang
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Form Pengisian Identitas */}
        {showIdentityForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Pengisian Data Identitas</h2>
                  <button
                    onClick={() => setShowIdentityForm(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Ringkasan Pesanan */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Ringkasan Pesanan</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedTickets).map(([ticketId, qty]) => {
                      const ticket = tickets.find(t => t.id === ticketId);
                      if (!ticket) return null;
                      return (
                        <div key={ticketId} className="flex justify-between text-sm">
                          <span>{ticket.name} x {qty}</span>
                          <span className="font-medium">{formatPrice(ticket.finalPrice * qty)}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-green-600">{formatPrice(getTotalPrice())}</span>
                    </div>
                  </div>
                </div>

                {/* Form Identitas */}
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nama Lengkap *
                      </label>
                      <input
                        type="text"
                        value={identityData.fullName}
                        onChange={(e) => setIdentityData({...identityData, fullName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={identityData.email}
                        onChange={(e) => setIdentityData({...identityData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="contoh@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nomor Telepon/Whatsapp *
                      </label>
                      <input
                        type="tel"
                        value={identityData.phone}
                        onChange={(e) => setIdentityData({...identityData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="08xxxxxxxxxx"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alamat *
                      </label>
                      <textarea
                        value={identityData.address}
                        onChange={(e) => setIdentityData({...identityData, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Alamat lengkap"
                        rows={3}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowIdentityForm(false)}
                      className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Kembali
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmitIdentity}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Lanjut ke Pembayaran
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}