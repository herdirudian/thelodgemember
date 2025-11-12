"use client";
import { useEffect, useMemo, useState } from 'react';

type PublicRegistration = {
  id: string;
  eventName: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
};

type Availability = {
  event: string;
  quota: number;
  registered: number;
  remaining: number;
  closed?: boolean;
};

export default function AdminPublicRegistrations() {
  const [list, setList] = useState<PublicRegistration[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string>("");

  // Settings fields
  const [intimateEventTitle, setIntimateEventTitle] = useState<string>("");
  const [intimateEventQuota, setIntimateEventQuota] = useState<string>("");
  const [intimateEventClosed, setIntimateEventClosed] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string>("");

  const token = useMemo(() => {
    try { return localStorage.getItem('token') || ''; } catch { return ''; }
  }, []);

  const loadAvailability = async () => {
    try {
      const res = await fetch('/api/public/intimate/register/availability');
      if (!res.ok) throw new Error('Gagal mengambil ketersediaan');
      const data = await res.json();
      setAvailability(data);
    } catch (e: any) {
      console.error('availability error', e);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return; // role bisa membatasi akses
      const data = await res.json();
      if (typeof data.intimateEventTitle !== 'undefined' && data.intimateEventTitle) {
        setIntimateEventTitle(String(data.intimateEventTitle));
      }
      if (typeof data.intimateEventQuota !== 'undefined' && data.intimateEventQuota !== null) {
        setIntimateEventQuota(String(data.intimateEventQuota));
      }
      if (typeof data.intimateEventClosed !== 'undefined') {
        setIntimateEventClosed(Boolean(data.intimateEventClosed));
      }
    } catch (e) {
      // ignore
    }
  };

  const loadList = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      if (q.trim()) params.set('q', q.trim());
      if (intimateEventTitle.trim()) params.set('eventName', intimateEventTitle.trim());
      const res = await fetch(`/api/admin/public-registrations?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Gagal mengambil daftar pendaftar');
      const data = await res.json();
      setList(data.list || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadAvailability();
  }, []);

  useEffect(() => {
    loadList();
  }, [page, pageSize, q, intimateEventTitle]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage("");
    try {
      const payload: any = {};
      if (intimateEventTitle.trim()) payload.intimateEventTitle = intimateEventTitle.trim();
      if (intimateEventQuota.trim()) payload.intimateEventQuota = parseInt(intimateEventQuota, 10);
      payload.intimateEventClosed = Boolean(intimateEventClosed);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Tampilkan pesan error dari server jika ada
        throw new Error(body?.message || 'Gagal menyimpan pengaturan');
      }
      const data = body;
      setSettingsMessage('Pengaturan berhasil disimpan');
      // refresh availability & list agar sinkron
      await Promise.all([loadAvailability(), loadList()]);
    } catch (e: any) {
      setSettingsMessage(e?.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  const markEventClosedNow = async () => {
    try {
      setIntimateEventClosed(true);
      await saveSettings();
    } catch {}
  };

  const resendEvoucher = async (registrationId: string) => {
    setActionMessage("");
    setSendingId(registrationId);
    try {
      const res = await fetch(`/api/admin/public-registrations/${registrationId}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.message || 'Gagal mengirim ulang e‑voucher');
      }
      setActionMessage(`E‑voucher dikirim ulang. Kode: ${body?.friendlyCode || ''}`);
    } catch (e: any) {
      setActionMessage(e?.message || 'Gagal mengirim ulang e‑voucher');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pendaftar Intimate Konser</h1>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari nama/email/HP..."
            className="px-3 py-2 border border-gray-300 rounded-md w-64"
          />
          <button onClick={loadList} className="px-3 py-2 bg-[#0F4D39] text-white rounded-md">Refresh</button>
        </div>
      </div>

      {/* Banner status event berakhir */}
      {(availability?.closed || intimateEventClosed) && (
        <div className="p-4 rounded-lg border bg-red-50 border-red-200">
          <div className="text-sm text-red-700">
            Event sudah berakhir. Pendaftaran ditutup dan aksi tertentu dinonaktifkan.
          </div>
        </div>
      )}

      {/* Info kartu kuota */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-white">
          <div className="text-sm text-gray-500">Judul Acara</div>
          <div className="text-lg font-semibold">{availability?.event || intimateEventTitle || 'Climate Coustic 2.0'}</div>
        </div>
        <div className="p-4 rounded-lg border bg-white">
          <div className="text-sm text-gray-500">Kuota</div>
          <div className="text-lg font-semibold">{availability?.quota ?? (intimateEventQuota ? parseInt(intimateEventQuota, 10) : 0)}</div>
        </div>
        <div className="p-4 rounded-lg border bg-white">
          <div className="text-sm text-gray-500">Terdaftar / Sisa</div>
          <div className="text-lg font-semibold">
            {(availability?.registered ?? 0)} / {(availability?.remaining ?? Math.max(((availability?.quota ?? 0) - (availability?.registered ?? 0)), 0))}
          </div>
        </div>
        <div className="p-4 rounded-lg border bg-white">
          <div className="text-sm text-gray-500">Status</div>
          <div className={`text-lg font-semibold ${availability?.closed || intimateEventClosed ? 'text-red-600' : 'text-green-700'}`}>
            {availability?.closed || intimateEventClosed ? 'Acara selesai — Pendaftaran berakhir' : 'Pendaftaran masih dibuka'}
          </div>
        </div>
      </div>

      {/* Form pengaturan kuota & judul */}
      <div className="p-4 rounded-lg border bg-white space-y-3">
        <h2 className="text-lg font-semibold">Pengaturan Acara</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Judul Intimate Konser</label>
            <input
              value={intimateEventTitle}
              onChange={(e) => setIntimateEventTitle(e.target.value)}
              placeholder="mis. Climate Coustic 2.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Kuota</label>
            <input
              value={intimateEventQuota}
              onChange={(e) => setIntimateEventQuota(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="mis. 100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-700">Tutup Pendaftaran (Acara selesai)</label>
          <input
            type="checkbox"
            checked={intimateEventClosed}
            onChange={(e) => setIntimateEventClosed(e.target.checked)}
          />
        </div>
        <div className="flex items-center gap-2">
          <button disabled={savingSettings} onClick={saveSettings} className="px-4 py-2 bg-[#0F4D39] text-white rounded-md disabled:opacity-60">{savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
          {!intimateEventClosed && !availability?.closed && (
            <button
              disabled={savingSettings}
              onClick={markEventClosedNow}
              className="px-4 py-2 bg-red-600 text-white rounded-md disabled:opacity-60"
            >Tandai Event Selesai</button>
          )}
          {settingsMessage && <span className="text-sm text-gray-600">{settingsMessage}</span>}
        </div>
      </div>

      {/* Tabel pendaftar */}
      <div className="rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nama</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Nomor HP</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Memuat data...</td></tr>
              )}
              {!loading && list.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Belum ada pendaftar.</td></tr>
              )}
              {!loading && list.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-sm">{r.name}</td>
                  <td className="px-4 py-2 text-sm">{r.email}</td>
                  <td className="px-4 py-2 text-sm">{r.phone}</td>
                  <td className="px-4 py-2 text-sm">{r.createdAt ? new Date(r.createdAt).toLocaleString('id-ID') : '-'}</td>
                  <td className="px-4 py-2 text-sm">
                    <button
                      onClick={() => resendEvoucher(r.id)}
                      disabled={sendingId === r.id || intimateEventClosed || availability?.closed}
                      title={(intimateEventClosed || availability?.closed) ? 'Event ditutup' : ''}
                      className={`px-3 py-1 rounded-md ${sendingId === r.id || intimateEventClosed || availability?.closed ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#0F4D39] text-white'}`}
                    >{sendingId === r.id ? 'Mengirim…' : (intimateEventClosed || availability?.closed ? 'Ditutup' : 'Kirim ulang e‑voucher')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-sm text-gray-600">Total: {total}</div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >Sebelumnya</button>
            <span className="text-sm">Halaman {page} dari {totalPages}</span>
            <button
              className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >Berikutnya</button>
            <select
              className="px-2 py-1 text-sm border border-gray-300 rounded-md"
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
            >
              {[10,20,50,100].map(n => <option key={n} value={n}>{n}/hal</option>)}
            </select>
          </div>
        </div>
        {error && (
          <div className="px-4 pb-4 text-sm text-red-600">{error}</div>
        )}
        {actionMessage && (
          <div className="px-4 pb-4 text-sm text-gray-700">{actionMessage}</div>
        )}
      </div>
    </div>
  );
}
