"use client";
import { useState, useEffect } from 'react';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';

interface AnalyticsData {
  summary: {
    period: string;
    labels: string[];
    points: {
      pointsUsedSeries: number[];
      pointsRedeemedSeries: number[];
    };
    vouchers: {
      vouchersIssuedSeries: number[];
      vouchersRedeemedSeries: number[];
    };
    redeem: {
      redeemTotalSeries: number[];
    };
  } | null;
  members: {
    period: string;
    labels: string[];
    members: {
      newJoinSeries: number[];
      activeMembersSeries: number[];
      eventParticipationSeries: number[];
    };
  } | null;
  promos: {
    period: string;
    labels: string[];
    usedSeries: number[];
    viewsSeries: number[];
    byPromo: Array<{
      promoId: string;
      title: string;
      type: string;
      usedCount: number;
    }>;
  } | null;
  tickets: {
    period: string;
    labels: string[];
    tourism: {
      salesSeries: number[];
      revenueSeries: number[];
      totalSales: number;
      totalRevenue: number;
      topTickets: Array<{
        title: string;
        sales: number;
        revenue: number;
        quantity: number;
      }>;
    };
    accommodation: {
      salesSeries: number[];
      revenueSeries: number[];
      totalSales: number;
      totalRevenue: number;
      topAccommodations: Array<{
        name: string;
        sales: number;
        revenue: number;
        rooms: number;
        guests: number;
      }>;
    };
    combined: {
      totalSales: number;
      totalRevenue: number;
      salesSeries: number[];
      revenueSeries: number[];
    };
  } | null;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData>({
    summary: null,
    members: null,
    promos: null,
    tickets: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login kembali.');
      }

      const [summaryRes, membersRes, promosRes, ticketsRes] = await Promise.all([
        fetch(`/api/admin/analytics/summary?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/analytics/members?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/analytics/promos?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/admin/analytics/tickets?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!summaryRes.ok || !membersRes.ok || !promosRes.ok || !ticketsRes.ok) {
        throw new Error('Failed to load analytics data');
      }

      const [summary, members, promos, tickets] = await Promise.all([
        summaryRes.json(),
        membersRes.json(),
        promosRes.json(),
        ticketsRes.json()
      ]);

      setData({ summary, members, promos, tickets });
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const getTotal = (series: number[]) => {
    return series.reduce((sum, val) => sum + val, 0);
  };

  const getAverage = (series: number[]) => {
    return series.length > 0 ? Math.round(series.reduce((sum, val) => sum + val, 0) / series.length) : 0;
  };

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      await exportToPDF(data, period);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Gagal mengexport PDF. Silakan coba lagi.');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExportingCSV(true);
      await exportToCSV(data, period);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Gagal mengexport CSV. Silakan coba lagi.');
    } finally {
      setExportingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Analytics</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadAnalytics}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, members, promos, tickets } = data;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Insights dan statistik bisnis The Lodge Family</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Export Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleExportPDF}
              disabled={exportingPDF || loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exportingPDF ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
            <button
              onClick={handleExportCSV}
              disabled={exportingCSV || loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {exportingCSV ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </>
              )}
            </button>
          </div>
          
          {/* Period Filter */}
          <div className="flex gap-2">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Member Baru</p>
              <p className="text-2xl font-bold text-gray-900">
                {members ? formatNumber(getTotal(members.members.newJoinSeries)) : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Rata-rata: {members ? formatNumber(getAverage(members.members.newJoinSeries)) : '0'} per periode
          </p>
        </div>

        {/* Points Activity */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Points Diredem</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary ? formatNumber(getTotal(summary.points.pointsUsedSeries)) : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Voucher diredem: {summary ? formatNumber(getTotal(summary.points.pointsRedeemedSeries)) : '0'}
          </p>
        </div>

        {/* Vouchers */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Voucher Diterbitkan</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary ? formatNumber(getTotal(summary.vouchers.vouchersIssuedSeries)) : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Diredem: {summary ? formatNumber(getTotal(summary.vouchers.vouchersRedeemedSeries)) : '0'}
          </p>
        </div>

        {/* Event Participation */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partisipasi Event</p>
              <p className="text-2xl font-bold text-gray-900">
                {members ? formatNumber(getTotal(members.members.eventParticipationSeries)) : '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Member aktif: {members ? formatNumber(getTotal(members.members.activeMembersSeries)) : '0'}
          </p>
        </div>
      </div>

      {/* Ticket Purchase Analytics KPI Cards */}
      {tickets && (
        <>
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics Pembelian Tiket</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Ticket Sales */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Penjualan Tiket</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(tickets.combined.totalSales)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Wisata: {formatNumber(tickets.tourism.totalSales)} | Akomodasi: {formatNumber(tickets.accommodation.totalSales)}
                </p>
              </div>

              {/* Total Revenue */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {formatNumber(tickets.combined.totalRevenue)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Wisata: Rp {formatNumber(tickets.tourism.totalRevenue)} | Akomodasi: Rp {formatNumber(tickets.accommodation.totalRevenue)}
                </p>
              </div>

              {/* Tourism Tickets */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tiket Wisata</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(tickets.tourism.totalSales)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pendapatan: Rp {formatNumber(tickets.tourism.totalRevenue)}
                </p>
              </div>

              {/* Accommodation Bookings */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Booking Akomodasi</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(tickets.accommodation.totalSales)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Pendapatan: Rp {formatNumber(tickets.accommodation.totalRevenue)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Member Growth Chart */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pertumbuhan Member</h3>
          <div className="space-y-4">
            {members?.labels.map((label, index) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.max(5, (members.members.newJoinSeries[index] / Math.max(...members.members.newJoinSeries)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-8">
                    {members.members.newJoinSeries[index]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Points Activity Chart */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Aktivitas Points</h3>
          <div className="space-y-4">
            {summary?.labels.map((label, index) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="text-gray-900 font-medium">
                    {summary.points.pointsUsedSeries[index]} pts
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ 
                      width: `${Math.max(5, (summary.points.pointsUsedSeries[index] / Math.max(...summary.points.pointsUsedSeries)) * 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Voucher Usage Chart */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Penggunaan Voucher</h3>
          <div className="space-y-4">
            {summary?.labels.map((label, index) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{label}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Diterbitkan: {summary.vouchers.vouchersIssuedSeries[index]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Diredem: {summary.vouchers.vouchersRedeemedSeries[index]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Promos */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Promo Terpopuler</h3>
          <div className="space-y-3">
            {promos?.byPromo
              .sort((a, b) => b.usedCount - a.usedCount)
              .slice(0, 5)
              .map((promo) => (
                <div key={promo.promoId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{promo.title}</p>
                    <p className="text-xs text-gray-500 capitalize">{promo.type.replace('_', ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{promo.usedCount}</p>
                    <p className="text-xs text-gray-500">digunakan</p>
                  </div>
                </div>
              ))}
            {(!promos?.byPromo || promos.byPromo.length === 0) && (
              <p className="text-gray-500 text-center py-4">Belum ada data promo</p>
            )}
          </div>
        </div>

        {/* Ticket Analytics Charts */}
        {tickets && (
          <>
            {/* Ticket Sales Trend */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Penjualan Tiket</h3>
              <div className="space-y-4">
                {tickets.labels.map((label, index) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="text-gray-900 font-medium">
                        {tickets.combined.salesSeries[index]} tiket
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-indigo-500 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(5, (tickets.combined.salesSeries[index] / Math.max(...tickets.combined.salesSeries)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Wisata: {tickets.tourism.salesSeries[index]}</span>
                      <span>Akomodasi: {tickets.accommodation.salesSeries[index]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tren Pendapatan</h3>
              <div className="space-y-4">
                {tickets.labels.map((label, index) => (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="text-gray-900 font-medium">
                        Rp {formatNumber(tickets.combined.revenueSeries[index])}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-500 h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(5, (tickets.combined.revenueSeries[index] / Math.max(...tickets.combined.revenueSeries)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Wisata: Rp {formatNumber(tickets.tourism.revenueSeries[index])}</span>
                      <span>Akomodasi: Rp {formatNumber(tickets.accommodation.revenueSeries[index])}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Tourism Tickets */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiket Wisata Terlaris</h3>
              <div className="space-y-3">
                {tickets.tourism.topTickets.slice(0, 5).map((ticket, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{ticket.title}</p>
                      <p className="text-xs text-gray-500">{ticket.quantity} tiket terjual</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{ticket.sales}</p>
                      <p className="text-xs text-gray-500">Rp {formatNumber(ticket.revenue)}</p>
                    </div>
                  </div>
                ))}
                {tickets.tourism.topTickets.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Belum ada data tiket wisata</p>
                )}
              </div>
            </div>

            {/* Top Accommodations */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Akomodasi Terlaris</h3>
              <div className="space-y-3">
                {tickets.accommodation.topAccommodations.slice(0, 5).map((accommodation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{accommodation.name}</p>
                      <p className="text-xs text-gray-500">{accommodation.rooms} kamar, {accommodation.guests} tamu</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{accommodation.sales}</p>
                      <p className="text-xs text-gray-500">Rp {formatNumber(accommodation.revenue)}</p>
                    </div>
                  </div>
                ))}
                {tickets.accommodation.topAccommodations.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Belum ada data akomodasi</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Periode {period === 'daily' ? 'Harian' : period === 'weekly' ? 'Mingguan' : 'Bulanan'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {members ? formatNumber(getTotal(members.members.newJoinSeries)) : '0'}
            </p>
            <p className="text-sm text-gray-600">Total Member Baru</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {summary ? formatNumber(getTotal(summary.points.pointsUsedSeries)) : '0'}
            </p>
            <p className="text-sm text-gray-600">Total Points Diredem</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">
              {summary ? formatNumber(getTotal(summary.redeem.redeemTotalSeries)) : '0'}
            </p>
            <p className="text-sm text-gray-600">Total Transaksi Redeem</p>
          </div>
          {tickets && (
            <>
              <div className="text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {formatNumber(getTotal(tickets.combined.salesSeries))}
                </p>
                <p className="text-sm text-gray-600">Total Tiket Terjual</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  Rp {formatNumber(getTotal(tickets.combined.revenueSeries))}
                </p>
                <p className="text-sm text-gray-600">Total Pendapatan Tiket</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}