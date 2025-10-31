"use client";
import { Suspense, useEffect, useState } from 'react';
import AdminNav from '@/components/AdminNav';
import AdminActivities from '@/components/AdminActivities';
import AdminAdmins from '@/components/AdminAdmins';
import AdminSettingsPanel from '@/components/AdminSettingsPanel';
import AdminRegistrationCodes from '@/components/admin/AdminRegistrationCodes';
import AdminMemberActivities from '@/components/admin/AdminMemberActivities';
import AdminPromos from '@/components/AdminPromos';
import AdminBenefits from '@/components/AdminBenefits';
import AdminOverview from '@/components/AdminOverview';
import AdminMembers from '@/components/AdminMembers';
import AdminPoints from '@/components/AdminPoints';
import AdminEvents from '@/components/AdminEvents';
import AdminSliderImages from '@/components/AdminSliderImages';
import AdminVouchers from '@/components/AdminVouchers';
import AdminRedeemVoucher from '@/components/AdminRedeemVoucher';
import AdminMemberTickets from '@/components/AdminMemberTickets';
import AdminAnalytics from '@/components/AdminAnalytics';
import AdminTourismTickets from '@/components/AdminTourismTickets';
import AdminAccommodation from '@/components/AdminAccommodation';
import AdminNotifications from '@/components/AdminNotifications';
import AdminAuthWrapper from '@/components/AdminAuthWrapper';

export default function AdminPage() {
  return (
    <AdminAuthWrapper>
      <Suspense fallback={<div className="p-4">Loading...</div>}>
        <AdminRoot />
      </Suspense>
    </AdminAuthWrapper>
  );
}

function AdminRoot() {
  const [menu, setMenu] = useState<'overview' | 'members' | 'points' | 'promos' | 'benefits' | 'slider' | 'vouchers' | 'redeem-voucher' | 'member-tickets' | 'activities' | 'member-activities' | 'admins' | 'settings' | 'events' | 'analytics' | 'registration-codes' | 'tourism-tickets' | 'accommodation' | 'notifications'>('overview');
  
  useEffect(() => {
    const allowed = new Set(['overview', 'members', 'points', 'promos', 'benefits', 'slider', 'vouchers', 'redeem-voucher', 'member-tickets', 'activities', 'member-activities', 'admins', 'settings', 'events', 'analytics', 'registration-codes', 'tourism-tickets', 'accommodation', 'notifications']);
    const syncFromHash = () => {
      try {
        const h = (window.location.hash || '#overview').replace('#', '');
        setMenu(allowed.has(h) ? (h as any) : 'overview');
      } catch {}
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  return (
    <div className="space-y-4">
      {/* Top navigation using AdminNav */}
      <AdminNav active={menu} />
      {/* Content switcher with container padding */}
      <div className="mx-auto max-w-6xl px-6">
        {menu === 'overview' && <AdminOverview />}
        {menu === 'members' && <AdminMembers />}
        {menu === 'points' && <AdminPoints />}
        {menu === 'events' && <AdminEvents />}
        {menu === 'promos' && <AdminPromos />}
        {menu === 'benefits' && <AdminBenefits />}
        {menu === 'tourism-tickets' && <AdminTourismTickets />}
        {menu === 'accommodation' && <AdminAccommodation />}
        {menu === 'slider' && <AdminSliderImages />}
        {menu === 'vouchers' && <AdminVouchers />}
        {menu === 'redeem-voucher' && <AdminRedeemVoucher />}
        {menu === 'member-tickets' && <AdminMemberTickets />}
        {menu === 'registration-codes' && <AdminRegistrationCodes />}
        {menu === 'activities' && <AdminActivities />}
        {menu === 'member-activities' && <AdminMemberActivities />}
        {menu === 'notifications' && <AdminNotifications />}
        {menu === 'admins' && <AdminAdmins />}
        {menu === 'settings' && <AdminSettings />}
        {menu === 'analytics' && <AdminAnalyticsPage />}
      </div>
    </div>
  );
}

function AdminSettings() {
  return <AdminSettingsPanel />;
}

function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}