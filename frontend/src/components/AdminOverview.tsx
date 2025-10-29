"use client";
import { useEffect, useState } from "react";

interface OverviewStats {
  totalMembers: number;
  totalEvents: number;
  totalRedeemedPoints: number;
  activeVouchers: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<OverviewStats>({
    totalMembers: 0,
    totalEvents: 0,
    totalRedeemedPoints: 0,
    activeVouchers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/admin/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load overview stats");
      const data = await response.json();
      setStats(data.data || data || {});
    } catch (e: any) {
      setError(e?.message || "Failed to load overview stats");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStats();
  }, []);

  const formatNumber = (num: number) => {
    if (isNaN(num) || num === null || num === undefined) {
      return "0";
    }
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const StatCard = ({ title, value, icon, color = "emerald" }: {
    title: string;
    value: string | number;
    icon: string;
    color?: string;
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className={`text-3xl font-bold text-${color}-600`}>
            {loading ? "..." : formatNumber(Number(value) || 0)}
          </p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Admin</h1>
        <button
          onClick={loadStats}
          disabled={loading}
          className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] disabled:opacity-50"
        >
          {loading ? "Memuat..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Member"
          value={stats.totalMembers}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Total Event"
          value={stats.totalEvents}
          icon="📅"
          color="green"
        />
        <StatCard
          title="Poin Ditukar"
          value={stats.totalRedeemedPoints}
          icon="🎯"
          color="purple"
        />
        <StatCard
          title="Voucher Aktif"
          value={stats.activeVouchers}
          icon="🎫"
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/admin#members"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <span className="text-2xl mr-3">👥</span>
            <div>
              <p className="font-medium text-blue-900">Kelola Member</p>
              <p className="text-sm text-blue-600">Lihat dan kelola member</p>
            </div>
          </a>
          <a
            href="/admin#events"
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <span className="text-2xl mr-3">📅</span>
            <div>
              <p className="font-medium text-green-900">Kelola Event</p>
              <p className="text-sm text-green-600">Buat dan kelola event</p>
            </div>
          </a>
          <a
            href="/admin#promos"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <span className="text-2xl mr-3">🎁</span>
            <div>
              <p className="font-medium text-purple-900">Kelola Program</p>
              <p className="text-sm text-purple-600">Buat program dan promo</p>
            </div>
          </a>
          <a
            href="/admin#registration-codes"
            className="flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <span className="text-2xl mr-3">🔑</span>
            <div>
              <p className="font-medium text-orange-900">Kode Registrasi</p>
              <p className="text-sm text-orange-600">Kelola kode registrasi</p>
            </div>
          </a>
        </div>
      </div>

      {/* Recent Activity Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Aktivitas</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-xl mr-3">📊</span>
              <div>
                <p className="font-medium text-gray-900">Statistik Hari Ini</p>
                <p className="text-sm text-gray-600">Data aktivitas member dan sistem</p>
              </div>
            </div>
            <a
              href="/admin#analytics"
              className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] text-sm"
            >
              Lihat Detail
            </a>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <span className="text-xl mr-3">👤</span>
              <div>
                <p className="font-medium text-gray-900">Aktivitas Member</p>
                <p className="text-sm text-gray-600">Pantau aktivitas dan engagement member</p>
              </div>
            </div>
            <a
              href="/admin#member-activities"
              className="px-4 py-2 bg-[#0F4D39] text-white rounded-md hover:bg-[#0e3f30] text-sm"
            >
              Lihat Detail
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}