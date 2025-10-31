'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconCalendar, IconGift, IconUser, IconTrendingUp, IconClock } from '@tabler/icons-react';
import { IconTicket } from '@/components/icons';

interface Activity {
  id: string;
  type: 'BOOK' | 'CANCEL' | 'REDEEM' | 'PROFILE' | 'POINTS';
  title: string;
  detail?: string;
  createdAt: string;
  points?: number;
}

export default function MyActivitiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch user data and related activities
      const [meResponse, ticketsResponse, eventsResponse] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/member/me`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/member/tickets/my`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/member/events`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const acts: Activity[] = [];

      if (meResponse.ok && ticketsResponse.ok && eventsResponse.ok) {
        const meJson = await meResponse.json();
        const ticketsJson = await ticketsResponse.json();
        const eventsJson = await eventsResponse.json();

        // 1) Aktivitas redeem points
        const ticketsArr = Array.isArray(ticketsJson?.tickets) ? ticketsJson.tickets : [];
        for (const ticket of ticketsArr) {
          if (ticket.createdAt) {
            acts.push({
              id: `ticket-${ticket.id}`,
              type: 'REDEEM',
              title: `Redeem: ${ticket.eventName || 'Event'}`,
              detail: ticket.validUntil ? `Berlaku hingga: ${new Date(ticket.validUntil).toLocaleDateString('id-ID')}` : undefined,
              createdAt: ticket.createdAt,
              points: ticket.pointsUsed || 0
            });
          }
        }

        // 2) Aktivitas booking event
        const eventsArr = Array.isArray(eventsJson?.events) ? eventsJson.events : [];
        const registrations = meJson?.member?.eventRegistrations || [];
        
        for (const reg of registrations) {
          const event = eventsArr.find((e: any) => e.id === reg.eventId);
          if (reg.status?.toUpperCase() === 'REGISTERED') {
            acts.push({
              id: `book-${reg.id}`,
              type: 'BOOK',
              title: `Booking: ${event?.title || 'Event'}`,
              detail: event?.eventDate ? new Date(event.eventDate).toLocaleDateString('id-ID') : undefined,
              createdAt: reg.createdAt
            });
          }
          if (reg.status?.toUpperCase() === 'CANCELLED') {
            acts.push({
              id: `cancel-${reg.id}`,
              type: 'CANCEL',
              title: `Cancel booking: ${event?.title || 'Event'}`,
              detail: event?.eventDate ? new Date(event.eventDate).toLocaleDateString('id-ID') : undefined,
              createdAt: reg.updatedAt || reg.createdAt
            });
          }
        }

        // 3) Aktivitas perubahan profil
        const userUpdated = meJson?.user?.updatedAt;
        const memberUpdated = meJson?.member?.updatedAt;
        if (memberUpdated && memberUpdated !== meJson?.member?.createdAt) {
          acts.push({
            id: `profile-member-${memberUpdated}`,
            type: 'PROFILE',
            title: 'Perubahan profil member',
            createdAt: memberUpdated
          });
        } else if (userUpdated && userUpdated !== meJson?.user?.createdAt) {
          acts.push({
            id: `profile-user-${userUpdated}`,
            type: 'PROFILE',
            title: 'Perubahan profil akun',
            createdAt: userUpdated
          });
        }

        // 4) Aktivitas poin (simulasi berdasarkan data yang ada)
        if (meJson?.member?.pointsBalance > 0) {
          acts.push({
            id: `points-earned`,
            type: 'POINTS',
            title: 'Poin diperoleh dari aktivitas',
            detail: `Total poin: ${meJson.member.pointsBalance}`,
            createdAt: meJson.member.createdAt || new Date().toISOString(),
            points: meJson.member.pointsBalance
          });
        }

        // Sort by date (newest first)
        acts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setActivities(acts);
      } else {
        setError('Gagal memuat data aktivitas');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'BOOK':
        return <IconTicket className="w-5 h-5 text-blue-600" />;
      case 'CANCEL':
        return <IconTicket className="w-5 h-5 text-red-600" />;
      case 'REDEEM':
        return <IconGift className="w-5 h-5 text-green-600" />;
      case 'PROFILE':
        return <IconUser className="w-5 h-5 text-purple-600" />;
      case 'POINTS':
        return <IconTrendingUp className="w-5 h-5 text-yellow-600" />;
      default:
        return <IconClock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'BOOK':
        return 'bg-blue-50 border-blue-200';
      case 'CANCEL':
        return 'bg-red-50 border-red-200';
      case 'REDEEM':
        return 'bg-green-50 border-green-200';
      case 'PROFILE':
        return 'bg-purple-50 border-purple-200';
      case 'POINTS':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat aktivitas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <IconArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Profil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Aktivitas Saya</h1>
          <p className="text-gray-600 mt-2">Riwayat aktivitas dan transaksi Anda</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Filter Buttons */}
        <div className="mb-6 bg-white rounded-xl shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter('BOOK')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'BOOK'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Booking
            </button>
            <button
              onClick={() => setFilter('REDEEM')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'REDEEM'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Redeem
            </button>
            <button
              onClick={() => setFilter('POINTS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'POINTS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Poin
            </button>
            <button
              onClick={() => setFilter('PROFILE')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'PROFILE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Profil
            </button>
          </div>
        </div>

        {/* Activities List */}
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <IconClock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Belum Ada Aktivitas
              </h3>
              <p className="text-gray-600">
                {filter === 'all' 
                  ? 'Anda belum memiliki aktivitas apapun'
                  : `Tidak ada aktivitas ${filter.toLowerCase()} yang ditemukan`
                }
              </p>
            </div>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={`border rounded-xl p-4 transition-all duration-200 hover:shadow-md ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {activity.title}
                    </h3>
                    {activity.detail && (
                      <p className="text-gray-600 mb-2">
                        {activity.detail}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <IconCalendar className="w-4 h-4" />
                        {new Date(activity.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {activity.points && (
                        <div className="flex items-center gap-1">
                          <IconTrendingUp className="w-4 h-4" />
                          {activity.points} poin
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}