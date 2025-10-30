'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  IconArrowLeft, 
  IconMoon, 
  IconSun, 
  IconBell, 
  IconShield, 
  IconLanguage, 
  IconLogout,
  IconUser,
  IconMail,
  IconKey,
  IconTrash,
  IconCheck,
  IconX
} from '@tabler/icons-react';

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
  language: string;
  theme: 'light' | 'dark' | 'system';
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [settings, setSettings] = useState<UserSettings>({
    notifications: {
      email: true,
      push: true,
      marketing: false
    },
    privacy: {
      profileVisible: true,
      activityVisible: false
    },
    language: 'id',
    theme: 'system'
  });

  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
    loadSettings();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
      }
    } catch (err) {
      setError('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error('Error parsing saved settings:', err);
      }
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Save to localStorage (in real app, would save to backend)
      localStorage.setItem('userSettings', JSON.stringify(settings));
      
      // Apply theme
      applyTheme(settings.theme);
      
      setSuccess('Pengaturan berhasil disimpan!');
    } catch (err) {
      setError('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (theme: string) => {
    const root = document.documentElement;
    // Always force light mode - remove dark class regardless of theme setting
    root.classList.remove('dark');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userSettings');
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // In real app, would call delete API
      // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/delete-account`, {
      //   method: 'DELETE',
      //   headers: { 'Authorization': `Bearer ${token}` }
      // });

      // Simulate deletion
      localStorage.removeItem('token');
      localStorage.removeItem('userSettings');
      alert('Akun berhasil dihapus');
      router.push('/');
    } catch (err) {
      setError('Gagal menghapus akun');
    }
  };

  const updateNotificationSetting = (key: keyof UserSettings['notifications'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: value
      }
    }));
  };

  const updatePrivacySetting = (key: keyof UserSettings['privacy'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600">Memuat pengaturan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-6">
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
          <h1 className="text-3xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-gray-600 mt-2">Kelola preferensi dan pengaturan akun Anda</p>
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

        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IconUser className="w-5 h-5" />
              Informasi Akun
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <IconMail className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-sm text-gray-600">{userData?.email}</p>
                  </div>
                </div>
                <Link 
                  href="/profile/edit"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit Profil
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <IconKey className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">Password</p>
                    <p className="text-sm text-gray-600">Terakhir diubah 30 hari yang lalu</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Ubah Password
                </button>
              </div>
            </div>
          </div>

          {/* Theme Settings */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IconSun className="w-5 h-5" />
              Tema
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              {[
                { value: 'light', label: 'Terang', icon: IconSun }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setSettings(prev => ({ ...prev, theme: value as any }))}
                  className="p-4 rounded-lg border-2 transition-colors border-blue-500 bg-blue-50"
                >
                  <Icon className="w-6 h-6 mx-auto mb-2 text-gray-700" />
                  <p className="font-medium text-gray-900">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IconBell className="w-5 h-5" />
              Notifikasi
            </h2>
            
            <div className="space-y-4">
              {[
                { key: 'email', label: 'Email Notifikasi', description: 'Terima notifikasi melalui email' },
                { key: 'push', label: 'Push Notifikasi', description: 'Terima notifikasi push di browser' },
                { key: 'marketing', label: 'Email Marketing', description: 'Terima email promosi dan penawaran' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        [key]: !prev.notifications[key as keyof typeof prev.notifications]
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.notifications[key as keyof typeof settings.notifications]
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.notifications[key as keyof typeof settings.notifications]
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Privacy Settings */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IconShield className="w-5 h-5" />
              Privasi
            </h2>
            
            <div className="space-y-4">
              {[
                { key: 'profileVisible', label: 'Profil Publik', description: 'Tampilkan profil Anda kepada member lain' },
                { key: 'activityVisible', label: 'Aktivitas Publik', description: 'Tampilkan aktivitas Anda kepada member lain' }
              ].map(({ key, label, description }) => (
                <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-600">{description}</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        [key]: !prev.privacy[key as keyof typeof prev.privacy]
                      }
                    }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.privacy[key as keyof typeof settings.privacy]
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.privacy[key as keyof typeof settings.privacy]
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Language Settings */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IconLanguage className="w-5 h-5" />
              Bahasa
            </h2>
            
            <select
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi</h2>
            
            <div className="space-y-4">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <IconCheck className="w-4 h-4" />
                    Simpan Pengaturan
                  </>
                )}
              </button>

              <button
                onClick={handleLogout}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                <IconLogout className="w-4 h-4" />
                Logout
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <IconTrash className="w-4 h-4" />
                Hapus Akun
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                 Hapus Akun
               </h3>
               <p className="text-gray-600 mb-6">
                 Apakah Anda yakin ingin menghapus akun? Tindakan ini tidak dapat dibatalkan.
               </p>
               <div className="flex gap-3">
                 <button
                   onClick={() => setShowDeleteConfirm(false)}
                   className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                 >
                   <IconX className="w-4 h-4" />
                   Batal
                 </button>
                 <button
                   onClick={handleDeleteAccount}
                   className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                 >
                   <IconTrash className="w-4 h-4" />
                   Hapus
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}