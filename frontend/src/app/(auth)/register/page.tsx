"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationCode, setRegistrationCode] = useState("");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  // Gunakan URL backend yang benar
    async function sendEmailVerification() {
    if (!email || !fullName) {
      setError("Harap isi nama lengkap dan email terlebih dahulu");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/send-email-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Gagal mengirim kode verifikasi");
      }

      setEmailSent(true);
      setSuccess("Kode verifikasi 6 digit telah dikirim ke email Anda");
      
    } catch (err: any) {
      const msg = err?.message === "Failed to fetch"
        ? `Tidak dapat menghubungi server. Pastikan backend berjalan di https://family.thelodgegroup.id/api dan CORS FRONTEND_URL disetel ke ${typeof window !== 'undefined' ? window.location.origin : 'https://family.thelodgegroup.id'}.`
        : err?.message || "Terjadi kesalahan saat mengirim kode verifikasi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmailCode() {
    if (!emailVerificationCode) {
      setError("Harap masukkan kode verifikasi email");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/verify-email-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, verificationCode: emailVerificationCode }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Kode verifikasi tidak valid");
      }

      setEmailVerified(true);
      setSuccess("Email berhasil diverifikasi!");
      
    } catch (err: any) {
      const msg = err?.message === "Failed to fetch"
        ? `Tidak dapat menghubungi server. Pastikan backend berjalan di https://family.thelodgegroup.id/api dan CORS FRONTEND_URL disetel ke ${typeof window !== 'undefined' ? window.location.origin : 'https://family.thelodgegroup.id'}.`
        : err?.message || "Terjadi kesalahan saat verifikasi email";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    
    if (!emailVerified) {
      setError("Harap verifikasi email terlebih dahulu");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password harus minimal 6 karakter");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Register user directly with email verification completed
      const registerRes = await fetch(`/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fullName,
          email,
          phone,
          password,
          registrationCode
        }),
      });
      
      if (!registerRes.ok) {
        const registerData = await registerRes.json();
        throw new Error(registerData.message || "Registrasi gagal");
      }

      const data = await registerRes.json();
      setSuccess("Registrasi berhasil! " + data.message);
      
      // Store token if provided
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      // Redirect to dashboard or success page after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
    } catch (err: any) {
      const msg = err?.message === "Failed to fetch"
        ? `Tidak dapat menghubungi server. Pastikan backend berjalan di http://localhost:5001 dan CORS FRONTEND_URL disetel ke ${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3003'}.`
        : err?.message || "Terjadi kesalahan saat registrasi";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding - Hidden */}
      <div className="hidden" style={{
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
               <img 
                 src="/LOGO TLG WHITE (1).svg" 
                 alt="The Lodge Family Logo" 
                 className="w-full h-full object-contain"
               />
             </div>
           </div>

           {/* Brand Text */}
           <div className="text-center mb-12">
             <h1 className="text-4xl font-bold mb-4">The Lodge Family</h1>
             <p className="text-xl text-emerald-100 mb-6">Escape to Nature</p>
            
            {/* Features */}
             <div className="space-y-6 text-left">
               <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                   </svg>
                 </div>
                 <div>
                   <h3 className="font-semibold text-lg">Exclusive Member Access</h3>
                   <p className="text-emerald-100">Premium member benefits</p>
                 </div>
               </div>
               
               <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                   </svg>
                 </div>
                 <div>
                   <h3 className="font-semibold text-lg">Redeem & E-Voucher Instan</h3>
                   <p className="text-emerald-100">Instant digital vouchers</p>
                 </div>
               </div>
               
               <div className="flex items-center space-x-4">
                 <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                   <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                   </svg>
                 </div>
                 <div>
                   <h3 className="font-semibold text-lg">Digital Membership Card</h3>
                   <p className="text-emerald-100">Digital member ID card</p>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold text-[#0F4D39] mb-6">Daftar Member</h1>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">{success}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" 
              required 
              disabled={emailVerified}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="flex gap-2">
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" 
                required 
                disabled={emailSent}
              />
              {!emailSent && (
                <button 
                  type="button"
                  onClick={sendEmailVerification}
                  disabled={loading || !email || !fullName}
                  className="px-4 py-2 bg-[#0F4D39] text-white rounded-lg hover:bg-[#0c3e2d] transition disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {loading ? "Mengirim..." : "Kirim Kode"}
                </button>
              )}
            </div>
          </div>

          {emailSent && !emailVerified && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Verifikasi Email (6 digit)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={emailVerificationCode} 
                  onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39] text-center text-lg font-mono" 
                  placeholder="123456"
                  maxLength={6}
                  required 
                />
                <button 
                  type="button"
                  onClick={verifyEmailCode}
                  disabled={loading || emailVerificationCode.length !== 6}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 text-sm whitespace-nowrap"
                >
                  {loading ? "Verifikasi..." : "Verifikasi"}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Masukkan kode 6 digit yang dikirim ke email Anda</p>
            </div>
          )}

          {emailVerified && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-medium">Email berhasil diverifikasi</span>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp / HP</label>
            <input 
              type="tel" 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" 
              placeholder="08xxxxxxxxxx"
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" 
                placeholder="Minimal 6 karakter"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kode Registrasi</label>
            <input 
              type="text" 
              value={registrationCode} 
              onChange={(e) => setRegistrationCode(e.target.value)} 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F4D39]" 
              placeholder="Masukkan kode registrasi"
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading || !emailVerified} 
            className="w-full bg-[#0F4D39] text-white py-3 rounded-lg hover:bg-[#0c3e2d] transition disabled:opacity-50 font-medium"
          >
            {loading ? "Mendaftar..." : "Daftar Sekarang"}
          </button>
          
          <p className="text-sm text-gray-600 text-center">
            Sudah punya akun? <a href="/login" className="text-[#0F4D39] hover:underline font-medium">Login</a>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
}