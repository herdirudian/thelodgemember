'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { IconArrowLeft, IconUser, IconMail, IconPhone, IconCalendar, IconMapPin, IconCheck, IconX } from '@tabler/icons-react';

interface UserData {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  address?: string;
  profilePicture?: string;
  isPhoneVerified?: boolean;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // WhatsApp verification states
  const [phoneVerification, setPhoneVerification] = useState({
    isRequired: false,
    isSending: false,
    isSent: false,
    isVerifying: false,
    isVerified: false,
    code: '',
    originalPhone: '',
    newPhone: ''
  });
  
  const [formData, setFormData] = useState<UserData>({
    id: '',
    email: '',
    fullName: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    profilePicture: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Data member ada di data.member, bukan data.user
        const userData = {
          id: data.user?.id || '',
          email: data.user?.email || '',
          fullName: data.member?.fullName || '',
          phone: data.member?.phone || '',
          dateOfBirth: data.member?.dateOfBirth ? data.member.dateOfBirth.split('T')[0] : '',
          address: data.member?.address || '',
          profilePicture: data.member?.profilePicture || '',
          isPhoneVerified: data.member?.isPhoneVerified || false
        };
        setFormData(userData);
        
        // Set original phone for verification tracking and check if already verified
        setPhoneVerification(prev => ({
          ...prev,
          originalPhone: userData.phone || '',
          isVerified: userData.isPhoneVerified || false
        }));
      } else {
        setError('Gagal memuat data profil');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Check if phone number changed and require verification
    if (name === 'phone') {
      const phoneChanged = value !== phoneVerification.originalPhone;
      setPhoneVerification(prev => ({
        ...prev,
        isRequired: phoneChanged,
        isSent: phoneChanged ? false : prev.isSent,
        isVerified: phoneChanged ? false : prev.isVerified,
        newPhone: value,
        code: phoneChanged ? '' : prev.code
      }));
    }
  };

  const sendWhatsAppVerification = async () => {
    if (!formData.phone) {
      setError('Masukkan nomor telepon terlebih dahulu');
      return;
    }

    setPhoneVerification(prev => ({ ...prev, isSending: true }));
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/send-whatsapp-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: formData.phone })
      });

      const data = await response.json();

      if (response.ok) {
        setPhoneVerification(prev => ({
          ...prev,
          isSending: false,
          isSent: true
        }));
        setSuccess('Kode verifikasi telah dikirim ke WhatsApp Anda');
      } else {
        throw new Error(data.message || 'Gagal mengirim kode verifikasi');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat mengirim kode verifikasi');
      setPhoneVerification(prev => ({ ...prev, isSending: false }));
    }
  };

  const verifyWhatsAppCode = async () => {
    if (!phoneVerification.code) {
      setError('Masukkan kode verifikasi');
      return;
    }

    setPhoneVerification(prev => ({ ...prev, isVerifying: true }));
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/verify-whatsapp-code`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          phone: formData.phone, 
          verificationCode: phoneVerification.code 
        })
      });

      const data = await response.json();

      if (response.ok) {
        setPhoneVerification(prev => ({
          ...prev,
          isVerifying: false,
          isVerified: true
        }));
        setSuccess('Nomor telepon berhasil diverifikasi');
      } else {
        throw new Error(data.message || 'Kode verifikasi tidak valid');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat verifikasi');
      setPhoneVerification(prev => ({ ...prev, isVerifying: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Check if phone verification is required but not completed
    if (phoneVerification.isRequired && !phoneVerification.isVerified) {
      setError('Silakan verifikasi nomor telepon terlebih dahulu');
      setSaving(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          address: formData.address
        })
      });

      if (response.ok) {
        setSuccess('Profil berhasil diperbarui!');
        setTimeout(() => {
          router.push('/profile');
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Gagal memperbarui profil');
      }
    } catch (err) {
      setError('Terjadi kesalahan saat menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/profile" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <IconArrowLeft className="w-5 h-5 mr-2" />
            Kembali ke Profil
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profil</h1>
          <p className="text-gray-600 mt-2">Perbarui informasi profil Anda</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (Read Only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IconMail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IconUser className="w-4 h-4 inline mr-2" />
                Nama Lengkap *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IconPhone className="w-4 h-4 inline mr-2" />
                Nomor Telepon *
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    placeholder="Masukkan nomor telepon"
                  />
                  {!phoneVerification.isVerified && formData.phone && (
                    <button
                      type="button"
                      onClick={sendWhatsAppVerification}
                      disabled={phoneVerification.isSending || !formData.phone}
                      className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                    >
                      {phoneVerification.isSending ? 'Mengirim...' : 'Kirim Kode'}
                    </button>
                  )}
                  {phoneVerification.isVerified && (
                    <div className="flex items-center px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                      <IconCheck className="w-5 h-5 text-green-600" />
                      <span className="ml-2 text-sm text-green-700">Terverifikasi</span>
                    </div>
                  )}
                </div>

                {/* Verification Code Input */}
                {phoneVerification.isSent && !phoneVerification.isVerified && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700 mb-3">
                      Kode verifikasi telah dikirim ke WhatsApp Anda. Masukkan kode 6 digit:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={phoneVerification.code}
                        onChange={(e) => setPhoneVerification(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="Masukkan kode verifikasi"
                        maxLength={6}
                        className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 text-center text-lg font-mono"
                      />
                      <button
                        type="button"
                        onClick={verifyWhatsAppCode}
                        disabled={phoneVerification.isVerifying || phoneVerification.code.length !== 6}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {phoneVerification.isVerifying ? 'Verifikasi...' : 'Verifikasi'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={sendWhatsAppVerification}
                      disabled={phoneVerification.isSending}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Kirim ulang kode
                    </button>
                  </div>
                )}

                {/* Phone verification status messages */}
                {phoneVerification.isRequired && !phoneVerification.isSent && (
                  <p className="text-sm text-amber-600">
                    ⚠️ Nomor telepon berubah. Verifikasi WhatsApp diperlukan sebelum menyimpan.
                  </p>
                )}
                {!phoneVerification.isVerified && !phoneVerification.isRequired && formData.phone && !phoneVerification.isSent && (
                  <p className="text-sm text-blue-600">
                    📱 Verifikasi nomor WhatsApp Anda untuk keamanan akun yang lebih baik.
                  </p>
                )}
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IconCalendar className="w-4 h-4 inline mr-2" />
                Tanggal Lahir
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
              />
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <IconMapPin className="w-4 h-4 inline mr-2" />
                Alamat
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                placeholder="Masukkan alamat lengkap"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
              <Link
                href="/profile"
                className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors text-center"
              >
                Batal
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}