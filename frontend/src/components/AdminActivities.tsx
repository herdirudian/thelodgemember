"use client";
import { useEffect, useState } from "react";

interface Activity {
  id?: string;
  adminId?: string;
  adminName?: string;
  adminRole?: string;
  method?: string;
  path?: string;
  status?: number;
  ip?: string;
  userAgent?: string;
  requestBody?: any;
  query?: any;
  createdAt?: string;
}

export default function AdminActivities() {
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [adminId, setAdminId] = useState("");
  const [method, setMethod] = useState("ALL");
  // Multi-select severity: default pilih semua
  const [selectedSeverities, setSelectedSeverities] = useState<Array<'info' | 'warning' | 'error'>>(['info', 'warning', 'error']);

  // helper untuk toggle checkbox severity (harus di dalam komponen)
  const toggleSeverity = (val: 'info' | 'warning' | 'error') => {
    setSelectedSeverities((prev) => (
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    ));
  };
  const [selected, setSelected] = useState<Activity | null>(null);
  // Tambah state untuk quick filter range
  const [quickRange, setQuickRange] = useState<'NONE' | 'TODAY' | '7D' | '30D'>('NONE');
  // Helper: format Date ke value yang diterima oleh input datetime-local (lokal waktu)
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };
  // Terapkan quick range: Today, 7d, 30d
  const applyQuickRange = (range: 'TODAY' | '7D' | '30D') => {
    const now = new Date();
    let startDate = new Date(now);
    if (range === 'TODAY') {
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '7D') {
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === '30D') {
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
    }
    const endDate = new Date(now);
    const s = toLocalInput(startDate);
    const e = toLocalInput(endDate);
    setStart(s);
    setEnd(e);
    setQuickRange(range);
    // Muat ulang data otomatis saat quick filter dipilih dengan override params
    load({ start: s, end: e, adminId, method });
  };
  const clearQuickRange = () => {
    setQuickRange('NONE');
    setStart('');
    setEnd('');
    // Muat ulang tanpa filter tanggal
    load({ start: '', end: '', adminId, method });
  };

  const load = async (opts?: { start?: string; end?: string; adminId?: string; method?: string }) => {
    try {
      setLoading(true);
      setError("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Token tidak ditemukan");
      const params = new URLSearchParams();
      const startParam = opts?.start ?? start;
      const endParam = opts?.end ?? end;
      const adminIdParam = opts?.adminId ?? adminId;
      const methodParam = opts?.method ?? method;
      if (startParam) params.set("start", startParam);
      if (endParam) params.set("end", endParam);
      if (adminIdParam) params.set("adminId", adminIdParam);
      if (methodParam && methodParam !== "ALL") params.set("method", methodParam);
      const res = await fetch(`/api/admin/activities?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "Gagal memuat aktivitas");
      const list: Activity[] = Array.isArray(body?.activities) ? body.activities : (Array.isArray(body) ? body : []);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  const displayed = items.filter((a) => selectedSeverities.includes(statusToSeverity(a.status)));

  // Style tombol quick filter
  const quickBtnClass = (active: boolean) => active
    ? "px-2 py-1 rounded-md bg-slate-900 text-white dark:bg-gray-200 dark:text-gray-900 text-xs"
    : "px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 text-xs";

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        {/* Quick filter */}
        <div className="md:col-span-6 flex items-end gap-2">
          <span className="text-xs text-slate-600">Quick Filter:</span>
          <button className={quickBtnClass(quickRange === 'TODAY')} onClick={() => applyQuickRange('TODAY')}>Today</button>
          <button className={quickBtnClass(quickRange === '7D')} onClick={() => applyQuickRange('7D')}>7d</button>
          <button className={quickBtnClass(quickRange === '30D')} onClick={() => applyQuickRange('30D')}>30d</button>
          <button className="px-2 py-1 rounded-md text-xs bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200" onClick={clearQuickRange}>Reset</button>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Dari</label>
          <input type="datetime-local" value={start} onChange={(e) => { setQuickRange('NONE'); setStart(e.target.value); }} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Sampai</label>
          <input type="datetime-local" value={end} onChange={(e) => { setQuickRange('NONE'); setEnd(e.target.value); }} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Admin ID</label>
          <input value={adminId} onChange={(e) => setAdminId(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <option value="ALL">Semua</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Severity</label>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-1 text-xs">
              <input type="checkbox" checked={selectedSeverities.includes('info')} onChange={() => toggleSeverity('info')} />
              Info
            </label>
            <label className="inline-flex items-center gap-1 text-xs">
              <input type="checkbox" checked={selectedSeverities.includes('warning')} onChange={() => toggleSeverity('warning')} />
              Warning
            </label>
            <label className="inline-flex items-center gap-1 text-xs">
              <input type="checkbox" checked={selectedSeverities.includes('error')} onChange={() => toggleSeverity('error')} />
              Error
            </label>
          </div>
        </div>
        <div className="flex items-end">
          <button onClick={() => load()} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Terapkan</button>
        </div>
      </div>

      {loading && <div className="text-xs text-slate-500">Memuat...</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}

      {/* Activities table */}
      <div className="rounded-lg border border-slate-200 dark:border-gray-800 overflow-x-auto">
        <div className="px-4 py-2 text-sm font-semibold">Aktivitas Admin</div>
        <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800">
          <thead className="bg-slate-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Waktu</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Admin</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Role</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Method</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Path</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
            {displayed.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Belum ada data.</td></tr>
            )}
            {displayed.map((a, idx) => (
              <tr key={a.id || idx}>
                <td className="px-4 py-2 text-xs">{a.createdAt ? new Date(a.createdAt).toLocaleString("id-ID") : "-"}</td>
                <td className="px-4 py-2 text-xs">{a.adminName || a.adminId || "-"}</td>
                <td className="px-4 py-2 text-xs">{a.adminRole || "-"}</td>
                <td className="px-4 py-2 text-xs">{(a.method || "").toUpperCase()}</td>
                <td className="px-4 py-2 text-xs whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis">{a.path || "-"}</td>
                <td className="px-4 py-2 text-xs">
                  {typeof a.status === "number" ? (
                    <span className={severityClass(statusToSeverity(a.status))}>
                      {statusToSeverity(a.status)} {a.status}
                    </span>
                  ) : ("-")}
                </td>
                <td className="px-4 py-2 text-xs">
                  <button onClick={() => setSelected(a)} className="px-2 py-1 text-xs rounded bg-slate-200 dark:bg-gray-800">Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl p-4 border border-slate-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Detail Aktivitas</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-slate-600">Waktu</div>
                <div className="text-xs">{selected.createdAt ? new Date(selected.createdAt).toLocaleString("id-ID") : "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Admin</div>
                <div className="text-xs">{selected.adminName || selected.adminId || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Role</div>
                <div className="text-xs">{selected.adminRole || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Method</div>
                <div className="text-xs">{(selected.method || "").toUpperCase()}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-600">Path</div>
                <div className="text-xs break-all">{selected.path || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Status</div>
                <div className="text-xs">
                  {typeof selected.status === "number" ? (
                    <span className={severityClass(statusToSeverity(selected.status))}>
                      {statusToSeverity(selected.status)} {selected.status}
                    </span>
                  ) : ("-")}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600">IP</div>
                <div className="text-xs">{selected.ip || "-"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs text-slate-600">User Agent</div>
                <div className="text-xs break-all">{selected.userAgent || "-"}</div>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold mt-2">Request Body</div>
                <pre className="text-xs p-2 rounded bg-slate-100 dark:bg-gray-800 overflow-auto max-h-40">{JSON.stringify(selected.requestBody ?? {}, null, 2)}</pre>
              </div>
              <div className="md:col-span-2">
                <div className="text-xs font-semibold">Query</div>
                <pre className="text-xs p-2 rounded bg-slate-100 dark:bg-gray-800 overflow-auto max-h-40">{JSON.stringify(selected.query ?? {}, null, 2)}</pre>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setSelected(null)} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const statusToSeverity = (status?: number): 'info' | 'warning' | 'error' => {
  if (typeof status !== "number") return "info";
  if (status >= 500) return "error";
  if (status >= 400) return "warning";
  if (status >= 200) return "info";
  return "info";
};

const severityClass = (severity: string) => {
  switch (severity) {
    case "error":
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800/60";
    case "warning":
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60";
    default:
      return "inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700";
  }
};