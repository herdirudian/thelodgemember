"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function LoginDesign3() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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
        ? `Tidak dapat menghubungi server. Pastikan backend berjalan dan CORS dikonfigurasi dengan benar untuk ${origin}.`
        : isHtmlResp || raw.toLowerCase().includes("unexpected token")
          ? `Respons server bukan JSON. Kemungkinan URL API salah atau server mengembalikan halaman HTML (mis. 404/Apache).`
          : raw;
      setError(friendly);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{
        backgroundImage: 'url(/BG_TheLodge.svg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}>
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F4D39]/80 via-[#1a5a44]/70 to-[#0c3e2d]/80"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm p-4">
              <Image 
                  src="/logo-tlg-white.svg" 
                  alt="The Lodge Family Logo" 
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                />
            </div>
          </div>

          {/* Brand Text */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">The Lodge Family</h1>
            <p className="text-xl text-emerald-100 mb-6">Escape to Nature</p>
            <div className="w-24 h-1 bg-white/30 mx-auto"></div>
          </div>

          {/* Features */}
          <div className="space-y-6 max-w-sm">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Exclusive Member Access</h3>
                <p className="text-sm text-emerald-100">Premium member benefits</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Redeem & E-Voucher Instan</h3>
                <p className="text-sm text-emerald-100">Instant digital vouchers</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Digital Membership Card</h3>
                <p className="text-sm text-emerald-100">Digital member ID card</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-[#0F4D39] rounded-full mx-auto mb-4 flex items-center justify-center p-2">
              <Image 
                src="/logo-tlg-white.svg" 
                alt="The Lodge Family Logo" 
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">The Lodge Family</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
              <p className="text-gray-600">Sign in to your member account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="w-4 h-4 text-[#0F4D39] border-gray-300 rounded focus:ring-[#0F4D39]" />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                <a href="/forgot-password" className="text-sm text-[#0F4D39] hover:underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0F4D39] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#0c3e2d] focus:outline-none focus:ring-2 focus:ring-[#0F4D39] focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <a href="/register" className="text-[#0F4D39] font-medium hover:underline">
                  Create one here
                </a>
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              © 2025 The Lodge Group. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}