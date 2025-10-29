'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconGift, IconStar, IconTrendingUp, IconCoin, IconClock, IconCheck } from '@tabler/icons-react';
import { IconTicket } from '@/components/icons';

interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  category: 'voucher' | 'discount' | 'merchandise' | 'experience';
  imageUrl?: string;
  isAvailable: boolean;
  validUntil?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  maxRedeem?: number;
  quota?: number;
}

interface UserPoints {
  balance: number;
  totalEarned: number;
  totalSpent: number;
}

export default function RewardsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userPoints, setUserPoints] = useState<UserPoints>({ balance: 0, totalEarned: 0, totalSpent: 0 });
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch user data
      const meResponse = await fetch(`/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        setUserPoints({
          balance: meData.member?.pointsBalance || 0,
          totalEarned: meData.member?.pointsBalance || 0, // Simplified
          totalSpent: 0 // Would need transaction history
        });
      }

      // Fetch rewards/programs from API
      const promosResponse = await fetch(`/api/promos`);
      
      if (promosResponse.ok) {
        const promosData = await promosResponse.json();
        const programs = promosData || [];
        
        // Filter programs with type REDEEM_POINTS and convert to Reward format
        const rewardsFromPrograms: Reward[] = programs
          .filter((program: any) => {
            const type = String(program.type || '').toUpperCase();
            const pointsRequired = program.pointsRequired || 0;
            return type === 'REDEEM_POINTS' && pointsRequired > 0;
          })
          .map((program: any) => ({
            id: program.id,
            title: program.title,
            description: program.description,
            pointsRequired: program.pointsRequired || 0,
            category: 'voucher' as const, // Default category for admin programs
            imageUrl: program.imageUrl,
            isAvailable: new Date() >= new Date(program.startDate) && new Date() <= new Date(program.endDate),
            validUntil: program.endDate,
            type: program.type,
            startDate: program.startDate,
            endDate: program.endDate,
            maxRedeem: program.maxRedeem,
            quota: program.quota
          }));

        setRewards(rewardsFromPrograms);
      } else {
        // Fallback to empty array if API fails
        setRewards([]);
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    if (userPoints.balance < reward.pointsRequired) {
      alert('Poin Anda tidak mencukupi');
      return;
    }

    setRedeeming(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Call the redeem API endpoint
      const response = await fetch(`/api/points/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          promoId: reward.id,
          quantity: 1
        })
      });

      if (response.ok) {
        // Update user points
        setUserPoints(prev => ({
          ...prev,
          balance: prev.balance - reward.pointsRequired,
          totalSpent: prev.totalSpent + reward.pointsRequired
        }));
        
        alert('Program berhasil ditukar! Silakan cek menu "Tukar Poin" untuk melihat voucher Anda.');
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Gagal menukar program. Silakan coba lagi.');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert('Gagal menukar program. Silakan coba lagi.');
    } finally {
      setRedeeming(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'voucher':
        return <IconTicket className="w-5 h-5" />;
      case 'discount':
        return <IconCoin className="w-5 h-5" />;
      case 'merchandise':
        return <IconGift className="w-5 h-5" />;
      case 'experience':
        return <IconStar className="w-5 h-5" />;
      default:
        return <IconGift className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'voucher':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'discount':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'merchandise':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900/20';
      case 'experience':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const filteredRewards = rewards.filter(reward => {
    if (filter === 'all') return true;
    if (filter === 'available') return reward.isAvailable;
    if (filter === 'affordable') return reward.pointsRequired <= userPoints.balance;
    return reward.category === filter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Memuat rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <IconArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Profil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rewards</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Tukar poin Anda dengan berbagai reward menarik</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Points Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <IconCoin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{userPoints.balance}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Poin Tersedia</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Poin yang dapat digunakan</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <IconTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">{userPoints.totalEarned}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Total Diperoleh</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total poin yang diperoleh</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <IconGift className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{userPoints.totalSpent}</span>
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Total Ditukar</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total poin yang ditukar</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter('available')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'available'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Tersedia
            </button>
            <button
              onClick={() => setFilter('affordable')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'affordable'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Terjangkau
            </button>
            <button
              onClick={() => setFilter('voucher')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'voucher'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Voucher
            </button>
            <button
              onClick={() => setFilter('discount')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'discount'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Diskon
            </button>
            <button
              onClick={() => setFilter('merchandise')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'merchandise'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Merchandise
            </button>
            <button
              onClick={() => setFilter('experience')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'experience'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Experience
            </button>
          </div>
        </div>

        {/* Rewards Grid */}
        {filteredRewards.length === 0 ? (
          <div className="text-center py-12">
            <IconGift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Belum Ada Program Tersedia</h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Saat ini belum ada program tukar poin yang tersedia. Silakan cek kembali nanti.'
                : `Tidak ada program dengan kategori "${filter}" yang tersedia saat ini.`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRewards.map((reward) => (
              <div key={reward.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{reward.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      reward.category === 'voucher' ? 'bg-blue-100 text-blue-800' :
                      reward.category === 'discount' ? 'bg-green-100 text-green-800' :
                      reward.category === 'merchandise' ? 'bg-purple-100 text-purple-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {reward.category}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-amber-600">
                        <IconCoin className="w-4 h-4 mr-1" />
                        <span className="font-semibold">{reward.pointsRequired} poin</span>
                      </div>
                      {reward.maxRedeem && (
                        <div className="text-xs text-gray-500">
                          Max: {reward.maxRedeem}x
                        </div>
                      )}
                    </div>
                    
                    {reward.validUntil && (
                      <div className="flex items-center text-gray-500 text-xs">
                        <IconClock className="w-3 h-3 mr-1" />
                        <span>Berlaku hingga {new Date(reward.validUntil).toLocaleDateString('id-ID')}</span>
                      </div>
                    )}
                    
                    {!reward.isAvailable && reward.endDate && new Date() > new Date(reward.endDate) && (
                      <div className="text-xs text-red-500">
                        Program telah berakhir
                      </div>
                    )}
                  </div>
                  
                  <button
                     onClick={() => handleRedeem(reward)}
                     disabled={!reward.isAvailable || userPoints.balance < reward.pointsRequired || redeeming}
                     className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                       reward.isAvailable && userPoints.balance >= reward.pointsRequired && !redeeming
                         ? 'bg-blue-600 text-white hover:bg-blue-700'
                         : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                     }`}
                   >
                     {redeeming ? 'Menukar...' : 
                      !reward.isAvailable ? 'Tidak Tersedia' :
                      userPoints.balance < reward.pointsRequired ? 'Poin Tidak Cukup' :
                      'Tukar Sekarang'}
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}