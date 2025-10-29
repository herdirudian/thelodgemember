"use client";
import { useEffect, useState } from "react";

type AdminRole = "CASHIER" | "MODERATOR" | "OWNER" | "SUPER_ADMIN";

interface AdminItem {
  id: string;
  fullName: string;
  email: string;
  adminRole: AdminRole;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminAdmins() {
    const [items, setItems] = useState<AdminItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form tambah admin
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("CASHIER");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  // Filter states
  const [filterRole, setFilterRole] = useState<AdminRole | "ALL">("ALL");
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  // Search and pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showEdit, setShowEdit] = useState(false);
  const [editAdmin, setEditAdmin] = useState<AdminItem | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AdminRole>("CASHIER");
  const [editActive, setEditActive] = useState<boolean>(true);
  const [editSaving, setEditSaving] = useState(false);
  // Sorting states
  const [sortKey, setSortKey] = useState<'fullName' | 'email' | 'adminRole' | 'isActive' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  // Reset password states
  const [showReset, setShowReset] = useState(false);
  const [resetAdmin, setResetAdmin] = useState<AdminItem | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetSaving, setResetSaving] = useState(false);
  // Helpers
  const validateEmail = (val: string) => /\S+@\S+\.\S+/.test(val);
  // Delete confirmation states
  const [showDelete, setShowDelete] = useState(false);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<AdminItem | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Token tidak ditemukan");
      const res = await fetch(`/api/admin/admins`, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "Gagal memuat admins");
      const list: AdminItem[] = Array.isArray(body.data) ? body.data : (Array.isArray(body) ? body : []);
      setItems(list);
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  // Load saved filters from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("admins_filters");
      if (raw) {
        const { role, active, search, size, sortKey: sk, sortDir: sd } = JSON.parse(raw);
        if (role) setFilterRole(role);
        if (active) setFilterActive(active);
        if (search) setSearchQuery(search);
        if (size) setPageSize(size);
        if (sk) setSortKey(sk);
        if (sd) setSortDir(sd);
      }
    } catch {}
  }, []);
  // Persist filters to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = { role: filterRole, active: filterActive, search: searchQuery, size: pageSize, sortKey, sortDir };
    localStorage.setItem("admins_filters", JSON.stringify(payload));
  }, [filterRole, filterActive, searchQuery, pageSize, sortKey, sortDir]);
  // Reset page when filters/items change
  useEffect(() => { setPage(1); }, [filterRole, filterActive, searchQuery, items]);

  const submit = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Token tidak ditemukan");
      const res = await fetch(`/api/admin/admins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, email, password, adminRole }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "Gagal membuat admin");
      setSuccess("Admin berhasil dibuat");
      setFullName("");
      setEmail("");
      setPassword("");
      setAdminRole("CASHIER");
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setSaving(false);
    }
  };

  // Edit admin handlers
  const openEdit = (a: AdminItem) => {
    setEditAdmin(a);
    setEditFullName(a.fullName || "");
    setEditEmail(a.email || "");
    setEditRole(a.adminRole);
    setEditActive(Boolean(a.isActive));
    setShowEdit(true);
  };

  const submitEdit = async () => {
    try {
      if (!editAdmin) return;
      setEditSaving(true);
      setError("");
      setSuccess("");
      if (!editFullName.trim()) throw new Error("Nama lengkap wajib diisi");
      if (!validateEmail(editEmail)) throw new Error("Format email tidak valid");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Token tidak ditemukan");
      const res = await fetch(`/api/admin/admins/${editAdmin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName: editFullName, email: editEmail, adminRole: editRole, isActive: editActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.message || "Gagal memperbarui admin");
      setSuccess("Admin berhasil diperbarui");
      setShowEdit(false);
      setEditAdmin(null);
      load();
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan saat memperbarui");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteAdmin = async (a: AdminItem) => {
    try {
      if (!window.confirm(`Hapus admin ${a.fullName}?`)) return;
      setError("");
      setSuccess("");
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) throw new Error("Token tidak ditemukan");
      const res = await fetch(`/api/admin/admins/${a.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || "Gagal menghapus admin");
      setSuccess("Admin berhasil dihapus");
      load();
    } catch (e: any) {
      setError(e?.message || "Terjadi kesalahan saat menghapus");
    }
  };

  // Badge helpers
  const roleBadgeClass = (role: AdminRole) => {
    switch (role) {
      case "CASHIER":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200";
      case "MODERATOR":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200";
      case "OWNER":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200";
      case "SUPER_ADMIN":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200";
      default:
        return "bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  // Displayed items after filter & search
  const displayed = items.filter((a) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = q === "" || ((a.fullName || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q));
    const matchesRole = filterRole === "ALL" || a.adminRole === filterRole;
    const matchesActive = filterActive === "ALL" || (filterActive === "ACTIVE" ? a.isActive : !a.isActive);
    return matchesSearch && matchesRole && matchesActive;
  });
  // Sorting
  const toggleSort = (key: 'fullName' | 'email' | 'adminRole' | 'isActive' | 'createdAt') => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  };
  const sorted = [...displayed].sort((a, b) => {
    let va: any = '';
    let vb: any = '';
    if (sortKey === 'fullName') { va = a.fullName || ''; vb = b.fullName || ''; return (va as string).localeCompare(vb as string); }
    if (sortKey === 'email') { va = a.email || ''; vb = b.email || ''; return (va as string).localeCompare(vb as string); }
    if (sortKey === 'adminRole') { va = a.adminRole || ''; vb = b.adminRole || ''; return (String(va)).localeCompare(String(vb)); }
    if (sortKey === 'isActive') { va = a.isActive ? 1 : 0; vb = b.isActive ? 1 : 0; return (va as number) - (vb as number); }
    if (sortKey === 'createdAt') { va = new Date(a.createdAt || 0).getTime(); vb = new Date(b.createdAt || 0).getTime(); return (va as number) - (vb as number); }
    return 0;
  });
  if (sortDir === 'desc') sorted.reverse();

  // Pagination
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginated = sorted.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="py-2 text-sm font-semibold">Admins</div>
        <div>
          <button onClick={() => setShowForm(true)} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white hover:bg-[#0e3f30]">Tambah Admin</button>
        </div>
      </div>

      {loading && <div className="text-xs text-slate-500">Memuat...</div>}
      {error && <div className="text-xs text-red-600">{error}</div>}
      {success && <div className="text-xs text-emerald-600">{success}</div>}

      {/* Filter controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-600 mb-1">Cari</label>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Nama atau email..." className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Filter Role</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as AdminRole | "ALL")} className="px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <option value="ALL">Semua Role</option>
            <option value="CASHIER">CASHIER</option>
            <option value="MODERATOR">MODERATOR</option>
            <option value="OWNER">OWNER</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-600 mb-1">Status</label>
          <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")} className="px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
            <option value="ALL">Semua</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setFilterRole("ALL"); setFilterActive("ALL"); setSearchQuery(""); }} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Reset</button>
          <button onClick={() => {
            try {
              const headers = ["Nama","Email","Role","Status","Dibuat"];
              const rows = sorted.map((a) => [
                a.fullName || "",
                a.email || "",
                a.adminRole || "",
                a.isActive ? "Aktif" : "Nonaktif",
                a.createdAt ? new Date(a.createdAt).toISOString() : ""
              ]);
              const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
              const uri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
              const link = document.createElement("a");
              link.href = uri;
              link.download = "admins.csv";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch {}
          }} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white hover:bg-[#0e3f30]">Export CSV</button>
        </div>
      </div>

      {/* Tabel daftar admins */}
      <div className="rounded-lg border border-slate-200 dark:border-gray-800 overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-gray-800">
          <thead className="bg-slate-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                <button className="flex items-center gap-1" onClick={() => toggleSort('fullName')}>Nama {sortKey==='fullName' && <span>{sortDir==='asc'?'▲':'▼'}</span>}</button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                <button className="flex items-center gap-1" onClick={() => toggleSort('email')}>Email {sortKey==='email' && <span>{sortDir==='asc'?'▲':'▼'}</span>}</button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                <button className="flex items-center gap-1" onClick={() => toggleSort('adminRole')}>Role {sortKey==='adminRole' && <span>{sortDir==='asc'?'▲':'▼'}</span>}</button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                <button className="flex items-center gap-1" onClick={() => toggleSort('isActive')}>Status {sortKey==='isActive' && <span>{sortDir==='asc'?'▲':'▼'}</span>}</button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">
                <button className="flex items-center gap-1" onClick={() => toggleSort('createdAt')}>Dibuat {sortKey==='createdAt' && <span>{sortDir==='asc'?'▲':'▼'}</span>}</button>
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-slate-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-800">
            {displayed.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">Belum ada data.</td></tr>
            )}
            {paginated.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2 text-xs">{a.fullName}</td>
                <td className="px-4 py-2 text-xs">{a.email}</td>
                <td className="px-4 py-2 text-xs">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium ${roleBadgeClass(a.adminRole)}`}>{a.adminRole}</span>
                </td>
                <td className="px-4 py-2 text-xs">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-medium ${a.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200" : "bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200"}`}>{a.isActive ? "Aktif" : "Nonaktif"}</span>
                </td>
                <td className="px-4 py-2 text-xs">{a.createdAt ? new Date(a.createdAt).toLocaleString("id-ID") : "-"}</td>
                <td className="px-4 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(a)} className="px-2 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-gray-800 dark:text-gray-200">Edit</button>
                    <button onClick={() => { setResetAdmin(a); setResetPassword(""); setShowReset(true); }} className="px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600">Reset Password</button>
                    <button onClick={() => { setDeleteAdminTarget(a); setDeleteConfirmText(""); setShowDelete(true); }} className="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="px-4 py-2 flex items-center gap-3">
        <div className="text-xs text-slate-600">Menampilkan {total === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, total)} dari {total}</div>
        <div className="ml-auto flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 rounded bg-slate-200 text-slate-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200">Prev</button>
          <span className="text-xs">Hal {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-2 py-1 rounded bg-slate-200 text-slate-700 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-200">Next</button>
          <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value) || 10)} className="px-2 py-1 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Modal tambah admin */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-4 border border-slate-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-3">Tambah Admin</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nama Lengkap</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Role</label>
                <select value={adminRole} onChange={(e) => setAdminRole(e.target.value as AdminRole)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <option value="CASHIER">CASHIER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="OWNER">OWNER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Batal</button>
              <button disabled={saving} onClick={submit} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white hover:bg-[#0e3f30] disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edit admin */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEdit(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-4 border border-slate-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-3">Edit Admin</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Nama Lengkap</label>
                <input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Email</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Role</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value as AdminRole)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <option value="CASHIER">CASHIER</option>
                  <option value="MODERATOR">MODERATOR</option>
                  <option value="OWNER">OWNER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="editActive" type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                <label htmlFor="editActive" className="text-xs text-slate-600">Aktif</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowEdit(false)} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Batal</button>
              <button disabled={editSaving} onClick={submitEdit} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white hover:bg-[#0e3f30] disabled:opacity-60">{editSaving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal reset password */}
      {showReset && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowReset(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-4 border border-slate-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-3">Reset Password</div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-600 mb-1">Password Baru (min 8 karakter)</label>
                <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowReset(false)} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Batal</button>
              <button disabled={resetSaving} onClick={async () => {
                try {
                  setResetSaving(true);
                  setError("");
                  setSuccess("");
                  if (!resetAdmin) return;
                  if (!resetPassword || resetPassword.length < 8) throw new Error("Password minimal 8 karakter");
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                  if (!token) throw new Error("Token tidak ditemukan");
                  const res = await fetch(`/api/admin/admins/${resetAdmin.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ password: resetPassword })
                  });
                  const body = await res.json();
                  if (!res.ok) throw new Error(body?.message || "Gagal reset password");
                  setSuccess("Password berhasil direset");
                  setShowReset(false);
                  setResetAdmin(null);
                  setResetPassword("");
                  load();
                } catch (e: any) {
                  setError(e?.message || "Terjadi kesalahan saat reset password");
                } finally {
                  setResetSaving(false);
                }
              }} className="px-3 py-2 rounded-md bg-[#0F4D39] text-white hover:bg-[#0e3f30] disabled:opacity-60">{resetSaving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal konfirmasi hapus admin */}
      {showDelete && deleteAdminTarget && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDelete(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-4 border border-slate-200 dark:border-gray-800" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-3">Hapus Admin</div>
            <div className="text-xs text-slate-600 mb-3">Tindakan ini permanen dan tidak dapat dibatalkan. Ketik email admin untuk konfirmasi.</div>
            <div className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-800 rounded p-3 text-xs mb-3">
              <div><span className="text-slate-500">Nama:</span> {deleteAdminTarget.fullName}</div>
              <div><span className="text-slate-500">Email:</span> {deleteAdminTarget.email}</div>
              <div><span className="text-slate-500">Role:</span> {deleteAdminTarget.adminRole}</div>
            </div>
            <div className="space-y-2">
              <label className="block text-xs text-slate-600">Ketik email admin untuk konfirmasi</label>
              <input value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={deleteAdminTarget.email} className="w-full px-3 py-2 rounded border border-slate-300 dark:border-gray-700 bg-white dark:bg-gray-800" />
              {deleteConfirmText && deleteConfirmText !== deleteAdminTarget.email && (
                <div className="text-[11px] text-red-600">Email tidak cocok. Harap ketik persis: {deleteAdminTarget.email}</div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowDelete(false)} className="px-3 py-2 rounded-md bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-200">Batal</button>
              <button disabled={deleteConfirmText !== deleteAdminTarget.email || deleteSaving} onClick={async () => {
                try {
                  setDeleteSaving(true);
                  setError("");
                  setSuccess("");
                  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
                  if (!token) throw new Error("Token tidak ditemukan");
                  const res = await fetch(`/api/admin/admins/${deleteAdminTarget.id}`, {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const body = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(body?.message || "Gagal menghapus admin");
                  setSuccess("Admin berhasil dihapus");
                  setShowDelete(false);
                  setDeleteAdminTarget(null);
                  setDeleteConfirmText("");
                  load();
                } catch (e: any) {
                  setError(e?.message || "Terjadi kesalahan saat menghapus");
                } finally {
                  setDeleteSaving(false);
                }
              }} className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">{deleteSaving ? "Menghapus..." : "Hapus"}</button>
            </div>
          </div>
        </div>
      )}
     </div>
   );
 }