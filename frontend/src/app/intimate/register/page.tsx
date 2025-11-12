"use client";
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

export default function IntimateRegisterPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  // Gunakan NEXT_PUBLIC_API_URL jika tersedia; hapus suffix /api agar tidak double
  const rawApi = (process.env.NEXT_PUBLIC_API_URL as string | undefined) || origin || '';
  const apiBase = rawApi ? rawApi.replace(/\/api\/?$/, '') : origin || '';
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    quantity: 1,
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<{ event: string; quota: number; registered: number; remaining: number; closed?: boolean } | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [emailVerifySending, setEmailVerifySending] = useState(false);
  const [emailVerifyChecking, setEmailVerifyChecking] = useState(false);
  const [emailVerifyMsg, setEmailVerifyMsg] = useState<string | null>(null);
  const [friendlyCode, setFriendlyCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await fetch(`${apiBase}/api/public/intimate/register/availability`);
        const data = await res.json();
        if (res.ok) setAvailability(data);
      } catch {}
    };
    fetchAvailability();

    // Ping API health untuk deteksi dini konektivitas di VPS
    const pingHealth = async () => {
      try {
        const res = await fetch(`${apiBase}/api/health`);
        if (!res.ok) throw new Error('Health check gagal');
      } catch (e: any) {
        setError(
          `Tidak dapat menghubungi API (${apiBase}/api). Periksa koneksi VPS, port proxy Nginx, atau CORS.`
        );
      }
    };
    pingHealth();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
    if (name === 'email') {
      // Reset verification state if email changes
      setEmailVerified(false);
      setEmailVerificationCode('');
      setEmailVerifyMsg(null);
    }
  };

  const sendEmailVerification = async () => {
    if (!form.email) {
      setError('Harap isi email terlebih dahulu');
      return;
    }
    setEmailVerifySending(true);
    setError(null);
    setMessage(null);
    setEmailVerifyMsg(null);
    try {
      const res = await fetch(`${apiBase}/api/send-email-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, fullName: form.name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Gagal mengirim kode verifikasi');
      }
      setEmailVerifyMsg('Kode verifikasi telah dikirim ke email Anda.');
    } catch (err: any) {
      const msg = err?.message === 'Failed to fetch'
        ? `Tidak dapat menghubungi server. Pastikan API tersedia di ${apiBase}/api dan koneksi internet stabil.`
        : (err?.message || 'Terjadi kesalahan saat mengirim kode verifikasi');
      setError(msg);
    } finally {
      setEmailVerifySending(false);
    }
  };

  const verifyEmailCode = async () => {
    if (!emailVerificationCode || emailVerificationCode.length !== 6) {
      setError('Masukkan kode verifikasi 6 digit');
      return;
    }
    setEmailVerifyChecking(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${apiBase}/api/verify-email-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, verificationCode: emailVerificationCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Kode verifikasi tidak valid atau kadaluarsa');
      }
      setEmailVerified(true);
      setEmailVerifyMsg('Email berhasil diverifikasi.');
    } catch (err: any) {
      const msg = err?.message === 'Failed to fetch'
        ? `Tidak dapat menghubungi server. Pastikan API tersedia di ${apiBase}/api dan koneksi internet stabil.`
        : (err?.message || 'Terjadi kesalahan saat verifikasi email');
      setError(msg);
    } finally {
      setEmailVerifyChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    if (availability?.closed) {
      setLoading(false);
      setError('Pendaftaran untuk acara ini telah berakhir.');
      return;
    }
    if (!emailVerified) {
      setLoading(false);
      setError('Harap verifikasi email terlebih dahulu sebelum mengirim pendaftaran.');
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/public/intimate/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address || undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Gagal mengirim pendaftaran');
      }
      setMessage(data?.message || 'Berhasil, kami akan menghubungi Anda.');
      setFriendlyCode(data?.friendlyCode || null);
      setForm({ name: '', email: '', phone: '', quantity: 1, address: '', notes: '' });
      setEmailVerified(false);
      setEmailVerificationCode('');
      setEmailVerifyMsg(null);
      // Refresh availability
      try {
        const resA = await fetch(`${apiBase}/api/public/intimate/register/availability`);
        const dataA = await resA.json();
        if (resA.ok) setAvailability(dataA);
      } catch {}
    } catch (err: any) {
      const msg = err?.message === 'Failed to fetch'
        ? `Tidak dapat menghubungi server. Pastikan API tersedia di ${apiBase}/api dan koneksi internet stabil.`
        : (err?.message || 'Terjadi kesalahan');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header / Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-600 rounded-2xl text-white shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden">
            <Image src="/climate_coustic_cc-02.svg" alt="Climate Coustic" width={64} height={64} className="object-contain" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Daftar Intimate Konser : Climate Coustic 2.0</h1>
            <p className="text-emerald-100">Gratis. 1 orang = 1 tiket. Unik per email & nomor HP.</p>
            {availability && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-white/10 border border-white/20">
                  Kuota: <span className="ml-1 font-semibold">{availability.quota}</span>
                </span>
                <span className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-white/10 border border-white/20">
                  Terdaftar: <span className="ml-1 font-semibold">{availability.registered}</span>
                </span>
                <span className="inline-flex items-center px-3 py-1 text-sm rounded-full bg-white/10 border border-white/20">
                  Sisa: <span className="ml-1 font-semibold">{availability.remaining}</span>
                </span>
                <span className={`inline-flex items-center px-3 py-1 text-sm rounded-full border ${availability.closed ? 'bg-red-500/20 border-red-300 text-red-100' : 'bg-green-500/20 border-green-300 text-green-100'}`}>
                  Status: <span className="ml-1 font-semibold">{availability.closed ? 'Pendaftaran ditutup — Event selesai' : 'Pendaftaran dibuka'}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        {(availability?.closed) && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-medium">Pendaftaran Ditutup</div>
                <div>Event sudah berakhir. Formulir pendaftaran dinonaktifkan.</div>
              </div>
            </div>
          </div>
        )}
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

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <div className="flex">
              <svg className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
            {friendlyCode && (
              <div className="mt-3 p-3 bg-white border border-green-200 rounded-lg">
                <div className="text-xs text-gray-600">Kode Voucher Anda:</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-base font-semibold text-gray-900">{friendlyCode}</span>
                  <button
                    type="button"
                    className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                    onClick={() => navigator.clipboard.writeText(friendlyCode)}
                  >
                    Salin
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Simpan kode ini. Tunjukkan ke petugas saat verifikasi, atau gunakan menu Admin "Redeem Voucher".
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={Boolean(availability?.closed)}
              placeholder="Masukkan nama lengkap"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              disabled={Boolean(availability?.closed)}
              placeholder="nama@contoh.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            />
            <div className="mt-2 flex items-center gap-2">
              {!emailVerified && (
                <button
                  type="button"
                  onClick={sendEmailVerification}
                  disabled={emailVerifySending || !form.email || Boolean(availability?.closed)}
                  className="px-3 py-1.5 text-sm rounded-md bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60"
                >
                  {emailVerifySending ? 'Mengirim…' : 'Kirim Kode Verifikasi'}
                </button>
              )}
              {emailVerified && (
                <span className="inline-flex items-center px-3 py-1.5 text-sm rounded-md bg-green-100 text-green-800 border border-green-200">Email terverifikasi ✓</span>
              )}
            </div>
            {!emailVerified && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\\d{6}"
                  maxLength={6}
                  name="emailVerificationCode"
                  value={emailVerificationCode}
                  onChange={(e) => setEmailVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Masukkan 6 digit kode"
                  disabled={Boolean(availability?.closed)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={verifyEmailCode}
                  disabled={emailVerifyChecking || emailVerificationCode.length !== 6 || Boolean(availability?.closed)}
                  className="px-3 py-2 text-sm rounded-md bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60"
                >
                  {emailVerifyChecking ? 'Memverifikasi…' : 'Verifikasi'}
                </button>
              </div>
            )}
            {emailVerifyMsg && (
              <p className="mt-2 text-sm text-emerald-700">{emailVerifyMsg}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nomor HP</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              required
              disabled={Boolean(availability?.closed)}
              placeholder="08xxxxxxxxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              rows={3}
              placeholder="Alamat lengkap (jalan, RT/RW, kelurahan/kecamatan, kota)"
              disabled={Boolean(availability?.closed)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            />
          </div>

          <div className="text-sm text-gray-600">Jumlah tiket: 1 (fixed)</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Catatan (opsional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Catatan tambahan (opsional)"
              disabled={Boolean(availability?.closed)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            disabled={loading || Boolean(availability?.closed)}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-2 disabled:opacity-60"
          >
            {availability?.closed ? 'Pendaftaran Ditutup' : (loading ? 'Mengirim...' : 'Kirim Pre-Registrasi')}
          </button>
        </form>

        <div className="mt-6 text-xs text-gray-500">
          Dengan mengirim, Anda menyetujui syarat acara dan kebijakan privasi. Kami akan menghubungi Anda melalui email/nomor HP jika pendaftaran berhasil.
        </div>
      </div>
    </div>
  );
}
