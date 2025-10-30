'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

interface MemberActivity {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  registrationDate: string;
  isLifetime: boolean;
  pointsBalance: number;
  activities: {
    claimedBenefits: {
      count: number;
      items: Array<{
        id: string;
        name: string;
        claimedAt: string;
        createdAt: string;
      }>;
    };
    joinedEvents: {
      count: number;
      items: Array<{
        id: string;
        eventTitle: string;
        eventDate: string;
        registeredAt: string;
        status: string;
        redeemedAt: string;
      }>;
    };
    redeemedPoints: {
      count: number;
      totalPointsUsed: number;
      items: Array<{
        id: string;
        pointsUsed: number;
        rewardName: string;
        redeemedAt: string;
        createdAt: string;
      }>;
    };
    redeemHistory: {
      count: number;
      items: Array<{
        id: string;
        voucherType: string;
        voucherLabel: string;
        redeemedAt: string;
        adminName: string;
      }>;
    };
  };
  totalActivities: number;
}

interface ActivitySummary {
  totalMembers: number;
  totalBenefits: number;
  totalEvents: number;
  totalRedemptions: number;
  totalActivities: number;
}

interface ActivityItem {
  id: string;
  type: 'benefit' | 'event' | 'redemption' | 'history';
  memberName: string;
  memberEmail: string;
  title: string;
  description: string;
  date: string;
  points?: number;
  status?: string;
}

interface FilterOptions {
  type: 'all' | 'benefit' | 'event' | 'redemption' | 'history';
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  customStartDate: string;
  customEndDate: string;
  member: string;
}

export default function AdminMemberActivities() {
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<MemberActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<MemberActivity | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('benefits');
  const [viewMode, setViewMode] = useState<'summary' | 'activities'>('summary');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    dateRange: 'all',
    customStartDate: '',
    customEndDate: '',
    member: ''
  });
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Summary statistics - memoized to prevent recalculation
  const summary: ActivitySummary = useMemo(() => ({
    totalMembers: Array.isArray(members) ? members.length : 0,
    totalBenefits: Array.isArray(members) ? members.reduce((sum, m) => sum + m.activities.claimedBenefits.count, 0) : 0,
    totalEvents: Array.isArray(members) ? members.reduce((sum, m) => sum + m.activities.joinedEvents.count, 0) : 0,
    totalRedemptions: Array.isArray(members) ? members.reduce((sum, m) => sum + m.activities.redeemedPoints.count, 0) : 0,
    totalActivities: Array.isArray(members) ? members.reduce((sum, m) => sum + m.totalActivities, 0) : 0
  }), [members]);

  // Filter members based on search term and filters - memoized to prevent recalculation
  const filteredMembers = useMemo(() => {
    if (!Array.isArray(members)) return [];
    
    let filtered = members;
    
    // Filter by search term
    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(member =>
        (member.fullName || "").toLowerCase().includes(lowerSearchTerm) ||
        (member.email || "").toLowerCase().includes(lowerSearchTerm) ||
        (member.phone && member.phone.includes(searchTerm))
      );
    }
    
    // Filter by member name/email from filters
    if (filters.member && filters.member.trim()) {
      const lowerMemberFilter = filters.member.toLowerCase();
      filtered = filtered.filter(member =>
        (member.fullName || "").toLowerCase().includes(lowerMemberFilter) ||
        (member.email || "").toLowerCase().includes(lowerMemberFilter)
      );
    }
    
    // Filter by date range
    if (filters.dateRange !== 'all') {
      const today = new Date();
      
      filtered = filtered.filter(member => {
        const registrationDate = new Date(member.registrationDate);
        
        switch (filters.dateRange) {
          case 'today':
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            return registrationDate >= todayStart && registrationDate < todayEnd;
          
          case 'week':
            const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return registrationDate >= weekStart;
          
          case 'month':
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            return registrationDate >= monthStart;
          
          case 'custom':
            if (filters.customStartDate && filters.customEndDate) {
              const startDate = new Date(filters.customStartDate);
              const endDate = new Date(filters.customEndDate);
              endDate.setHours(23, 59, 59, 999);
              return registrationDate >= startDate && registrationDate <= endDate;
            }
            return true;
          
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [members, searchTerm, filters]);

  const loadMemberActivities = async () => {
    try {
      setLoading(true);
      setError('');
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        setError('Token tidak ditemukan');
        return;
      }

      const res = await fetch(`/api/admin/member-activities`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Gagal memuat data aktivitas member');
      }

      const response = await res.json();
      // Backend mengembalikan { success: true, data: [...], summary: {...} }
      // Ambil data dari response.data
      const memberData = response.data || response;
      setMembers(Array.isArray(memberData) ? memberData : []);
      
      // Convert member data to activities list
      const allActivities = convertMembersToActivities(Array.isArray(memberData) ? memberData : []);
      setActivities(allActivities);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  // Convert members data to activities list
  const convertMembersToActivities = (membersData: MemberActivity[]): ActivityItem[] => {
    const allActivities: ActivityItem[] = [];

    membersData.forEach(member => {
      // Add claimed benefits
      member.activities.claimedBenefits.items.forEach(benefit => {
        allActivities.push({
          id: `benefit-${benefit.id}`,
          type: 'benefit',
          memberName: member.fullName,
          memberEmail: member.email,
          title: benefit.name,
          description: `Benefit diklaim oleh ${member.fullName}`,
          date: benefit.claimedAt,
          status: 'REDEEMED'
        });
      });

      // Add joined events
      member.activities.joinedEvents.items.forEach(event => {
        allActivities.push({
          id: `event-${event.id}`,
          type: 'event',
          memberName: member.fullName,
          memberEmail: member.email,
          title: event.eventTitle,
          description: `Event diikuti oleh ${member.fullName}`,
          date: event.registeredAt,
          status: event.status
        });
      });

      // Add redeemed points
      member.activities.redeemedPoints.items.forEach(redemption => {
        allActivities.push({
          id: `redemption-${redemption.id}`,
          type: 'redemption',
          memberName: member.fullName,
          memberEmail: member.email,
          title: redemption.rewardName,
          description: `Poin ditukar oleh ${member.fullName}`,
          date: redemption.redeemedAt,
          points: redemption.pointsUsed,
          status: 'REDEEMED'
        });
      });

      // Add redeem history
      member.activities.redeemHistory.items.forEach(history => {
        allActivities.push({
          id: `history-${history.id}`,
          type: 'history',
          memberName: member.fullName,
          memberEmail: member.email,
          title: history.voucherLabel,
          description: `Voucher digunakan oleh ${member.fullName}`,
          date: history.redeemedAt,
          status: 'USED'
        });
      });
    });

    // Sort by date (newest first)
    return allActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Filter activities based on current filters
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      // Filter by type
      if (filters.type !== 'all' && activity.type !== filters.type) {
        return false;
      }

      // Filter by member
      if (filters.member && !(activity.memberName || "").toLowerCase().includes(filters.member.toLowerCase()) && 
          !(activity.memberEmail || "").toLowerCase().includes(filters.member.toLowerCase())) {
        return false;
      }

      // Filter by date range
      const activityDate = new Date(activity.date);
      const today = new Date();
      
      switch (filters.dateRange) {
        case 'today':
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
          return activityDate >= todayStart && activityDate < todayEnd;
        
        case 'week':
          const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return activityDate >= weekStart;
        
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          return activityDate >= monthStart;
        
        case 'custom':
          if (filters.customStartDate && filters.customEndDate) {
            const startDate = new Date(filters.customStartDate);
            const endDate = new Date(filters.customEndDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            return activityDate >= startDate && activityDate <= endDate;
          }
          return true;
        
        default:
          return true;
      }
    });
  }, [activities, filters]);

  // Update filters with useCallback to prevent re-renders
  const updateFilter = useCallback((key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Memoize view details handler
  const handleViewDetails = useCallback((member: MemberActivity) => {
    setSelectedMember(member);
    setDetailsOpen(true);
    setActiveTab('benefits');
  }, []);

  // Memoize reset filters handler
  const handleResetFilters = useCallback(() => {
    setFilters({
      type: 'all',
      dateRange: 'all',
      customStartDate: '',
      customEndDate: '',
      member: ''
    });
  }, []);

  // Export functions
  const handleExport = useCallback((format: 'csv' | 'excel' | 'summary') => {
    setShowExportMenu(false);
    
    try {
      if (format === 'summary') {
        exportSummaryData();
      } else if (format === 'csv') {
        exportToCSV();
      } else if (format === 'excel') {
        exportToExcel();
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Gagal mengexport data. Silakan coba lagi.');
    }
  }, []);

  const exportSummaryData = useCallback(() => {
    const summaryData = [
      ['Ringkasan Aktivitas Member', ''],
      ['Total Member', summary.totalMembers.toString()],
      ['Total Benefit Diklaim', summary.totalBenefits.toString()],
      ['Total Event Diikuti', summary.totalEvents.toString()],
      ['Total Poin Ditukar', summary.totalRedemptions.toString()],
      ['Total Aktivitas', summary.totalActivities.toString()],
      ['', ''],
      ['Tanggal Export', new Date().toLocaleDateString('id-ID')],
    ];

    const csvContent = summaryData.map(row => row.join(',')).join('\n');
    downloadFile(csvContent, `ringkasan-member-activities-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }, [summary]);

  const exportToCSV = useCallback(() => {
    const dataToExport = viewMode === 'summary' ? filteredMembers : filteredActivities;
    
    // Debug: Log data yang akan di-export
    console.log('Export mode:', viewMode);
    console.log('Members state:', members);
    console.log('Activities state:', activities);
    console.log('Filtered members:', filteredMembers);
    console.log('Filtered activities:', filteredActivities);
    console.log('Data to export:', dataToExport);
    console.log('Data length:', dataToExport.length);
    
    if (!dataToExport || dataToExport.length === 0) {
      console.error('No data available for export');
      setError('Tidak ada data untuk di-export. Pastikan ada data yang tersedia dan halaman sudah ter-load dengan benar.');
      return;
    }
    
    if (viewMode === 'summary') {
      // Export member summary with current filters applied
      const headers = ['Nama Lengkap', 'Email', 'Telepon', 'Tanggal Daftar', 'Status', 'Saldo Poin', 'Benefit Diklaim', 'Event Diikuti', 'Poin Ditukar', 'Total Aktivitas'];
      const csvData = [
        headers,
        ...dataToExport.map(member => [
          `"${member.fullName}"`,
          `"${member.email}"`,
          `"${member.phone}"`,
          `"${new Date(member.registrationDate).toLocaleDateString('id-ID')}"`,
          `"${member.isLifetime ? 'Lifetime' : 'Regular'}"`,
          member.pointsBalance.toString(),
          member.activities.claimedBenefits.count.toString(),
          member.activities.joinedEvents.count.toString(),
          member.activities.redeemedPoints.count.toString(),
          member.totalActivities.toString()
        ])
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const filterInfo = getFilterInfo();
      downloadFile(csvContent, `member-activities-summary${filterInfo}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    } else {
      // Export activities detail with current filters applied
      const headers = ['Tipe', 'Nama Member', 'Email', 'Judul', 'Deskripsi', 'Tanggal', 'Status', 'Poin'];
      const csvData = [
        headers,
        ...dataToExport.map(activity => [
          `"${activity.type}"`,
          `"${activity.memberName}"`,
          `"${activity.memberEmail}"`,
          `"${activity.title}"`,
          `"${activity.description}"`,
          `"${new Date(activity.date).toLocaleDateString('id-ID')}"`,
          `"${activity.status || ''}"`,
          activity.points?.toString() || '0'
        ])
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const filterInfo = getFilterInfo();
      downloadFile(csvContent, `member-activities-detail${filterInfo}-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    }
  }, [viewMode, filteredMembers, filteredActivities, members, activities]);

  const exportToExcel = useCallback(() => {
    // For Excel export, we'll use CSV format with .xlsx extension
    // In a real implementation, you might want to use a library like xlsx
    const dataToExport = viewMode === 'summary' ? filteredMembers : filteredActivities;
    
    // Debug: Log data yang akan di-export
    console.log('Excel Export mode:', viewMode);
    console.log('Members state:', members);
    console.log('Activities state:', activities);
    console.log('Filtered members:', filteredMembers);
    console.log('Filtered activities:', filteredActivities);
    console.log('Excel Data to export:', dataToExport);
    console.log('Excel Data length:', dataToExport.length);
    
    if (!dataToExport || dataToExport.length === 0) {
      console.error('No data available for Excel export');
      setError('Tidak ada data untuk di-export. Pastikan ada data yang tersedia dan halaman sudah ter-load dengan benar.');
      return;
    }
    
    if (viewMode === 'summary') {
      const headers = ['Nama Lengkap', 'Email', 'Telepon', 'Tanggal Daftar', 'Status', 'Saldo Poin', 'Benefit Diklaim', 'Event Diikuti', 'Poin Ditukar', 'Total Aktivitas'];
      const excelData = [
        headers,
        ...dataToExport.map(member => [
          member.fullName,
          member.email,
          member.phone,
          new Date(member.registrationDate).toLocaleDateString('id-ID'),
          member.isLifetime ? 'Lifetime' : 'Regular',
          member.pointsBalance.toString(),
          member.activities.claimedBenefits.count.toString(),
          member.activities.joinedEvents.count.toString(),
          member.activities.redeemedPoints.count.toString(),
          member.totalActivities.toString()
        ])
      ];
      
      const csvContent = excelData.map(row => row.join('\t')).join('\n'); // Use tab separator for Excel
      const filterInfo = getFilterInfo();
      downloadFile(csvContent, `member-activities-summary${filterInfo}-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.ms-excel');
    } else {
      const headers = ['Tipe', 'Nama Member', 'Email', 'Judul', 'Deskripsi', 'Tanggal', 'Status', 'Poin'];
      const excelData = [
        headers,
        ...dataToExport.map(activity => [
          activity.type,
          activity.memberName,
          activity.memberEmail,
          activity.title,
          activity.description,
          new Date(activity.date).toLocaleDateString('id-ID'),
          activity.status || '',
          activity.points?.toString() || '0'
        ])
      ];
      
      const csvContent = excelData.map(row => row.join('\t')).join('\n'); // Use tab separator for Excel
      const filterInfo = getFilterInfo();
      downloadFile(csvContent, `member-activities-detail${filterInfo}-${new Date().toISOString().split('T')[0]}.xlsx`, 'application/vnd.ms-excel');
    }
  }, [viewMode, filteredMembers, filteredActivities, members, activities]);

  // Helper function to generate filter info for filename
  const getFilterInfo = useCallback(() => {
    const filterParts = [];
    
    if (filters.type !== 'all') {
      filterParts.push(`type-${filters.type}`);
    }
    
    if (filters.dateRange !== 'all') {
      if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
        filterParts.push(`${filters.customStartDate}-to-${filters.customEndDate}`);
      } else {
        filterParts.push(`date-${filters.dateRange}`);
      }
    }
    
    if (filters.member.trim()) {
      filterParts.push(`member-filtered`);
    }
    
    return filterParts.length > 0 ? `-filtered-${filterParts.join('-')}` : '';
  }, [filters]);

  const downloadFile = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    // Load real data from API
    loadMemberActivities();
  }, []);

  // Badge component
  const Badge = ({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'secondary' }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      variant === 'secondary' 
        ? 'bg-gray-100 text-gray-800'
        : 'bg-emerald-100 text-emerald-800'
    }`}>
      {children}
    </span>
  );

  // Card components
  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-lg border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  );

  const CardHeader = ({ children }: { children: React.ReactNode }) => (
    <div className="px-6 py-4 border-b border-slate-200">
      {children}
    </div>
  );

  const CardTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-lg font-semibold text-slate-900">
      {children}
    </h3>
  );

  const CardContent = ({ children }: { children: React.ReactNode }) => (
    <div className="px-6 py-4">
      {children}
    </div>
  );

  // Button component
  const Button = ({ children, onClick, variant = 'default', size = 'default', className = '' }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'default' | 'outline';
    size?: 'default' | 'sm';
    className?: string;
  }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${
        variant === 'outline'
          ? 'border border-slate-300 bg-transparent hover:bg-slate-100 text-slate-900'
          : 'bg-emerald-600 text-white hover:bg-emerald-700'
      } ${
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 py-2 px-4 text-sm'
      } ${className}`}
    >
      {children}
    </button>
  );

  // Modal component
  const Modal = ({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {children}
        </div>
      </div>
    );
  };

  // Tab components
  const TabsList = ({ children }: { children: React.ReactNode }) => (
    <div className="inline-flex h-10 items-center justify-center rounded-md bg-slate-100 p-1 text-slate-500">
      {children}
    </div>
  );

  const TabsTrigger = ({ value, children, active, onClick }: { 
    value: string; 
    children: React.ReactNode; 
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        active 
          ? 'bg-white text-slate-900 shadow-sm'
        : 'hover:bg-white/50'
      }`}
    >
      {children}
    </button>
  );

  const TabsContent = ({ value, children, active }: { value: string; children: React.ReactNode; active: boolean }) => {
    if (!active) return null;
    return <div className="mt-4">{children}</div>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Aktivitas Member</h1>
        <p className="text-slate-600">Data member yang telah klaim benefit, ikut event, dan redeem poin</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <span>📊 Export</span>
              <span className="text-xs">▼</span>
            </Button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg z-10">
                <div className="py-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📄 Export ke CSV
                  </button>
                  <button
                    onClick={() => handleExport('excel')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📊 Export ke Excel
                  </button>
                  <button
                    onClick={() => handleExport('summary')}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    📋 Export Ringkasan
                  </button>
                </div>
              </div>
            )}
          </div>
          <Button onClick={loadMemberActivities} disabled={loading}>
            {loading ? 'Memuat...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <div className="w-4 h-4 bg-blue-600 rounded"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Member</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalMembers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <div className="w-4 h-4 bg-green-600 rounded"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Benefit</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalBenefits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <div className="w-4 h-4 bg-purple-600 rounded"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Event</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <div className="w-4 h-4 bg-orange-600 rounded"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Redeem</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalRedemptions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <div className="w-4 h-4 bg-emerald-600 rounded"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Total Aktivitas</p>
                <p className="text-2xl font-bold text-slate-900">{summary.totalActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-slate-700">Tampilan:</span>
            <div className="flex rounded-lg border border-slate-300 p-1">
              <button
                onClick={() => setViewMode('summary')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'summary'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 Ringkasan Member
              </button>
              <button
                onClick={() => setViewMode('activities')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'activities'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Aktivitas per Klaim
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Section - Only show in activities mode */}
      {viewMode === 'activities' && (
        <Card>
          <CardHeader>
            <CardTitle>Filter Aktivitas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Activity Type Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Jenis Aktivitas
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => updateFilter('type', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Aktivitas</option>
                  <option value="benefit">🎁 Benefit</option>
                  <option value="event">📅 Event</option>
                  <option value="redemption">💰 Poin Ditukar</option>
                  <option value="history">📋 Riwayat Redeem</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Periode Waktu
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => updateFilter('dateRange', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="week">7 Hari Terakhir</option>
                  <option value="month">Bulan Ini</option>
                  <option value="custom">Kustom</option>
                </select>
              </div>

              {/* Custom Date Range */}
              {filters.dateRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tanggal Mulai
                    </label>
                    <input
                      type="date"
                      value={filters.customStartDate}
                      onChange={(e) => updateFilter('customStartDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={filters.customEndDate}
                      onChange={(e) => updateFilter('customEndDate', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              {/* Member Filter */}
              <div className={filters.dateRange === 'custom' ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Cari Member
                </label>
                <input
                  type="text"
                  placeholder="Nama atau email member..."
                  value={filters.member}
                  onChange={(e) => updateFilter('member', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Menampilkan {filteredActivities.length} dari {activities.length} aktivitas
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  type: 'all',
                  dateRange: 'all',
                  customStartDate: '',
                  customEndDate: '',
                  member: ''
                })}
              >
                🔄 Reset Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activities List - Only show in activities mode */}
      {viewMode === 'activities' && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Aktivitas per Klaim</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredActivities.length > 0 ? (
              <div className="space-y-3">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge variant={
                            activity.type === 'benefit' ? 'default' :
                            activity.type === 'event' ? 'secondary' :
                            activity.type === 'redemption' ? 'default' : 'secondary'
                          }>
                            {activity.type === 'benefit' && '🎁 Benefit'}
                            {activity.type === 'event' && '📅 Event'}
                            {activity.type === 'redemption' && '💰 Poin'}
                            {activity.type === 'history' && '📋 Riwayat'}
                          </Badge>
                          {activity.status && (
                            <Badge variant="secondary">
                              {activity.status}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-slate-900 mb-1">
                          {activity.title}
                        </h4>
                        <p className="text-sm text-slate-600 mb-2">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-slate-500">
                          <span>👤 {activity.memberName}</span>
                          <span>📧 {activity.memberEmail}</span>
                          <span>📅 {new Date(activity.date).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                          {activity.points && (
                            <span>💰 {activity.points} poin</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500">
                  Tidak ada aktivitas yang sesuai dengan filter
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Members Table - Only show in summary mode */}
      {viewMode === 'summary' && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Member dan Aktivitas</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <div className="w-4 h-4 text-slate-400">🔍</div>
                </div>
                <input
                  type="text"
                  placeholder="Cari member berdasarkan nama, email, atau telepon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-slate-200 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Poin</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Benefit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Poin Ditukar</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Aktivitas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {filteredMembers.map((member) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-slate-900">{member.fullName}</p>
                          <p className="text-sm text-slate-500">{member.email}</p>
                          <p className="text-sm text-slate-500">{member.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={member.isLifetime ? "default" : "secondary"}>
                          {member.isLifetime ? 'Lifetime' : 'Regular'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                        {member.pointsBalance}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">
                          {member.activities.claimedBenefits.count}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">
                          {member.activities.joinedEvents.count}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="secondary">
                          {member.activities.redeemedPoints.count}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge>
                          {member.totalActivities}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(member)}
                        >
                          👁️ Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-500">Tidak ada member yang ditemukan</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Modal open={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Detail Aktivitas - {selectedMember?.fullName}
          </h2>
        </div>
        <div className="px-6 py-4">
          {selectedMember && (
            <div>
              {/* Member Info */}
              <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Email</p>
                    <p className="text-slate-900">{selectedMember.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Telepon</p>
                    <p className="text-slate-900">{selectedMember.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Tipe Member</p>
                    <Badge variant={selectedMember.isLifetime ? "default" : "secondary"}>
                      {selectedMember.isLifetime ? 'Lifetime' : 'Regular'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Poin Saat Ini</p>
                    <p className="text-slate-900">{selectedMember.pointsBalance}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div>
                <TabsList>
                  <TabsTrigger 
                    value="benefits" 
                    active={activeTab === 'benefits'}
                    onClick={() => setActiveTab('benefits')}
                  >
                    🎁 Benefit Diklaim ({selectedMember.activities.claimedBenefits.count})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="events" 
                    active={activeTab === 'events'}
                    onClick={() => setActiveTab('events')}
                  >
                    📅 Event Diikuti ({selectedMember.activities.joinedEvents.count})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="redemptions" 
                    active={activeTab === 'redemptions'}
                    onClick={() => setActiveTab('redemptions')}
                  >
                    💰 Poin Ditukar ({selectedMember.activities.redeemedPoints.count})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    active={activeTab === 'history'}
                    onClick={() => setActiveTab('history')}
                  >
                    📋 Riwayat Redeem ({selectedMember.activities.redeemHistory.count})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="benefits" active={activeTab === 'benefits'}>
                  {selectedMember.activities.claimedBenefits.count > 0 ? (
                    <div className="space-y-3">
                      {selectedMember.activities.claimedBenefits.items.map((benefit, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-900">{benefit.name}</h4>
                              <p className="text-xs text-slate-500 mt-2">
                                Diklaim: {new Date(benefit.claimedAt).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <Badge variant="default">
                              REDEEMED
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Belum ada benefit yang diklaim</p>
                  )}
                </TabsContent>

                <TabsContent value="events" active={activeTab === 'events'}>
                  {selectedMember.activities.joinedEvents.count > 0 ? (
                    <div className="space-y-3">
                      {selectedMember.activities.joinedEvents.items.map((event, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-900">{event.eventTitle}</h4>
                              <p className="text-xs text-slate-500 mt-2">
                                Tanggal Event: {new Date(event.eventDate).toLocaleDateString('id-ID')}
                              </p>
                              <p className="text-xs text-slate-500">
                                Bergabung: {new Date(event.registeredAt).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <Badge variant={event.status === 'CONFIRMED' ? 'default' : 'secondary'}>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Belum ada event yang diikuti</p>
                  )}
                </TabsContent>

                <TabsContent value="redemptions" active={activeTab === 'redemptions'}>
                  {selectedMember.activities.redeemedPoints.count > 0 ? (
                    <div className="space-y-3">
                      {selectedMember.activities.redeemedPoints.items.map((redemption, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-900">{redemption.rewardName}</h4>
                              <p className="text-sm text-slate-600 mt-1">
                                Poin digunakan: {redemption.pointsUsed}
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                Ditukar: {new Date(redemption.redeemedAt).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                            <Badge variant="default">
                              REDEEMED
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Belum ada poin yang ditukar</p>
                  )}
                </TabsContent>

                <TabsContent value="history" active={activeTab === 'history'}>
                  {selectedMember.activities.redeemHistory.count > 0 ? (
                    <div className="space-y-3">
                      {selectedMember.activities.redeemHistory.items.map((history, index) => (
                        <div key={index} className="p-4 border border-slate-200 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-slate-900">{history.voucherLabel}</h4>
                              <p className="text-sm text-slate-600 mt-1">
                                Tipe: {history.voucherType}
                              </p>
                              <p className="text-xs text-slate-500 mt-2">
                                {new Date(history.redeemedAt).toLocaleDateString('id-ID')} - oleh {history.adminName}
                              </p>
                            </div>
                            <Badge variant="default">
                              USED
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Belum ada riwayat redeem</p>
                  )}
                </TabsContent>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}