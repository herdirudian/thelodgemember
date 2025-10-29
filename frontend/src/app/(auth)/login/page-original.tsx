"use client";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Gunakan path relatif agar permintaan di-proxy oleh Next.js (lihat rewrites di next.config.ts)
  // Ini menghindari masalah CORS dari origin http://localhost:3003 ke backend http://localhost:5000
  const API = '';
  // Tambahan: status dan utilitas diagnostik
  const [apiStatus, setApiStatus] = useState("");
  // Hindari hydration mismatch: tentukan origin di client setelah mount
  const [origin, setOrigin] = useState<string>("");
  useEffect(() => {
    try { setOrigin(window.location.origin); } catch {}
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          `Gagal memproses respons dari server. Pastikan API proxy berfungsi. Detail: ${text.slice(0, 120)}...`
        );
      }

      if (!res.ok) throw new Error(data.message || "Login failed");
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    } catch (err: any) {
      const raw = err?.message || "Terjadi kesalahan saat login";
      const isHtmlResp = raw.includes("<!DOCTYPE") || raw.includes("text/html");
      const friendly = err?.message === "Failed to fetch"
        ? `Tidak dapat menghubungi server. Pastikan backend berjalan di https://family.thelodgegroup.id/api dan CORS FRONTEND_URL disetel ke ${origin}.`
        : isHtmlResp || raw.toLowerCase().includes("unexpected token")
          ? `Respons server bukan JSON. Kemungkinan URL API salah atau server mengembalikan halaman HTML (mis. 404/Apache).`
          : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }
  // Tambahan: fungsi diagnostik
  async function testApi() {
    try {
      setApiStatus("Menguji koneksi ke API...");
      const res = await fetch(`/api/`, { method: "GET" });
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        setApiStatus(`Respons bukan JSON (${ct}). Isi: ${text.slice(0, 100)}...`);
        return;
      }
      const body = await res.json();
      setApiStatus(`OK: ${res.status} (${body?.status || "unknown"})`);
    } catch (e: any) {
      setApiStatus(e?.message || "Gagal ping API");
    }
  }
  function clearToken() {
    try { localStorage.removeItem("token"); setApiStatus("Token lokal dihapus"); } catch {}
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Using global Navbar from layout */}
      <div className="mx-auto max-w-md px-4 py-8">
        <h1 className="text-2xl font-semibold text-[#0F4D39] mb-6">Member Login</h1>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" required />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" required />
          </div>
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[#0F4D39] text-white py-2 hover:bg-[#0c3e2d] transition">{loading ? "Signing in..." : "Sign In"}</button>
          <p className="text-sm text-gray-600">
            Don't have an account? <a href="/register" className="text-[#0F4D39] hover:underline">Register</a>
          </p>
        </form>
      </div>
    </div>
  );
}