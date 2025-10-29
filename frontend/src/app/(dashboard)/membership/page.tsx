"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function MembershipPage() {
  const router = useRouter();
  const [tourismTickets, setTourismTickets] = useState<TourismTicket[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingAccommodations, setLoadingAccommodations] = useState(true);
  const [ticketsError, setTicketsError] = useState("");
  const [accommodationsError, setAccommodationsError] = useState("");

  const fetchData = async () => {
    setLoadingTickets(true);
    setLoadingAccommodations(true);
    setTicketsError("");
    setAccommodationsError("");

    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch tourism tickets from public endpoint
      const ticketsResponse = await fetch(`/api/member/tourism-tickets?limit=6`, {
        headers
      });
      
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        console.log('Tourism tickets data received:', ticketsData);
        console.log('Tourism tickets array:', ticketsData.tickets);
        if (ticketsData.tickets) {
          ticketsData.tickets.forEach((ticket: TourismTicket, index: number) => {
            console.log(`Ticket ${index + 1}:`, {
              name: ticket.name,
              imageUrl: ticket.imageUrl,
              hasImage: !!ticket.imageUrl
            });
          });
        }
        setTourismTickets(ticketsData.tickets || []);
      } else {
        console.error('Failed to fetch tourism tickets:', ticketsResponse.status, ticketsResponse.statusText);
        setTicketsError("Gagal memuat data tiket wisata");
      }

      // Fetch accommodations from public endpoint
      const accommodationsResponse = await fetch(`/api/member/accommodations?limit=6`, {
        headers
      });
      
      if (accommodationsResponse.ok) {
        const accommodationsData = await accommodationsResponse.json();
        setAccommodations(accommodationsData.accommodations || []);
      } else {
        setAccommodationsError("Gagal memuat data penginapan");
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setTicketsError("Gagal memuat data tiket wisata");
      setAccommodationsError("Gagal memuat data penginapan");
    } finally {
      setLoadingTickets(false);
      setLoadingAccommodations(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F4D39]">Membership Services</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">Layanan eksklusif untuk member The Lodge Family</p>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/dashboard" className="px-3 py-2 rounded-lg bg-[#0F4D39] text-white hover:bg-[#0e3f30] transition">Dashboard</Link>
          </div>
        </div>

        {/* Tourism Tickets Section */}
        <div className="rounded-xl bg-white border border-gray-200 shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#0F4D39]">Tourism Tickets</h2>
            <Link href="/tourism-tickets" className="text-[#0F4D39] hover:text-[#0e3f30] text-sm font-medium">
              Lihat Semua →
            </Link>
          </div>

          {loadingTickets ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4D39]"></div>
              <p className="ml-3 text-gray-600">Memuat tiket wisata...</p>
            </div>
          ) : ticketsError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{ticketsError}</p>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-lg hover:bg-[#0e3f30] transition"
              >
                Coba Lagi
              </button>
            </div>
          ) : tourismTickets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300">Belum ada tiket wisata yang tersedia</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tourismTickets.map((ticket) => (
                <div key={ticket.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {ticket.imageUrl ? (
                    <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      <img 
                        src={ticket.imageUrl} 
                        alt={ticket.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.log('Image failed to load:', ticket.imageUrl);
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = `
                            <div class="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                              <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                            </div>
                          `;
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', ticket.imageUrl);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{ticket.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{ticket.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{ticket.category}</span>
                      <span className="text-xs text-gray-500">{ticket.location}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        {ticket.discount > 0 && (
                          <span className="text-xs text-gray-500 line-through">{formatPrice(ticket.price)}</span>
                        )}
                        <span className="text-sm font-semibold text-[#0F4D39]">{formatPrice(ticket.finalPrice)}</span>
                      </div>
                      <Link 
                        href={`/tourism-tickets/${ticket.id}/book`}
                        className="px-3 py-1 bg-[#0F4D39] text-white text-xs rounded hover:bg-[#0e3f30] transition"
                      >
                        Pesan
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Accommodation Section */}
        <div className="rounded-xl bg-white border border-gray-200 shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#0F4D39]">Accommodation</h2>
            <Link href="/accommodation" className="text-[#0F4D39] hover:text-[#0e3f30] text-sm font-medium">
              Lihat Semua →
            </Link>
          </div>

          {loadingAccommodations ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F4D39]"></div>
              <p className="ml-3 text-gray-600">Memuat data penginapan...</p>
            </div>
          ) : accommodationsError ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{accommodationsError}</p>
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-[#0F4D39] text-white rounded-lg hover:bg-[#0e3f30] transition"
              >
                Coba Lagi
              </button>
            </div>
          ) : accommodations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-300">Belum ada penginapan yang tersedia</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accommodations.map((accommodation) => (
                <div key={accommodation.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  {accommodation.imageUrl && (
                    <img 
                      src={accommodation.imageUrl} 
                      alt={accommodation.name}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{accommodation.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">{accommodation.description}</p>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{accommodation.type}</span>
                      <span className="text-xs text-gray-500">{accommodation.location}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Kapasitas: {accommodation.capacity} orang</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        {accommodation.discount > 0 && (
                          <span className="text-xs text-gray-500 line-through">{formatPrice(accommodation.pricePerNight)}</span>
                        )}
                        <span className="text-sm font-semibold text-[#0F4D39]">{formatPrice(accommodation.finalPrice)}/malam</span>
                      </div>
                      <Link 
                        href={`/accommodation/${accommodation.id}/book`}
                        className="px-3 py-1 bg-[#0F4D39] text-white text-xs rounded hover:bg-[#0e3f30] transition"
                      >
                        Pesan
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Additional Services */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
            <h3 className="text-lg font-semibold text-[#0F4D39] mb-2">Member Benefits</h3>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              <li>• Diskon khusus untuk tiket wisata</li>
              <li>• Prioritas booking penginapan</li>
              <li>• Akses ke event eksklusif member</li>
              <li>• Poin reward setiap transaksi</li>
            </ul>
          </div>
          <div className="rounded-xl bg-white border border-gray-200 shadow p-4">
            <h3 className="text-lg font-semibold text-[#0F4D39] mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/my-ticket" className="block px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                My Tickets
              </Link>
              <Link href="/exclusive-member" className="block px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                Exclusive Events
              </Link>
              <Link href="/redeem-points" className="block px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                Redeem Points
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}