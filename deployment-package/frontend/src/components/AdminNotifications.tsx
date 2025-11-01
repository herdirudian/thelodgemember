'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BellIcon, 
  SpeakerWaveIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface AdminMessage {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  admin: {
    name: string;
  };
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  memberId: string;
  member: {
    fullName: string;
    email: string;
  };
  isRead: boolean;
  createdAt: string;
}

export default function AdminNotifications() {
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const [adminMessages, setAdminMessages] = useState<AdminMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AdminMessage | null>(null);
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  });
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'ADMIN_MESSAGE',
    memberId: '',
    memberEmail: ''
  });
  const [searchMember, setSearchMember] = useState('');
  const [memberSuggestions, setMemberSuggestions] = useState<any[]>([]);
  const router = useRouter();

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const [messagesRes, notificationsRes] = await Promise.all([
        fetch('/api/notifications/admin-messages', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/notifications/all', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setAdminMessages(messagesData.data || []);
      }

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData.data?.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search members
  const searchMembers = async (query: string) => {
    if (!query.trim()) {
      setMemberSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/members?search=${encodeURIComponent(query)}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMemberSuggestions(data.data?.members || []);
      }
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  // Create/Update admin message
  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingMessage 
        ? `/api/notifications/admin-messages/${editingMessage.id}`
        : '/api/notifications/admin-messages';
      
      const method = editingMessage ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageForm)
      });

      if (response.ok) {
        await fetchData();
        setShowMessageForm(false);
        setEditingMessage(null);
        setMessageForm({ title: '', content: '', priority: 'MEDIUM' });
      } else {
        const error = await response.json();
        alert(error.message || 'Gagal menyimpan pesan');
      }
    } catch (error) {
      console.error('Error saving message:', error);
      alert('Terjadi kesalahan saat menyimpan pesan');
    }
  };

  // Create notification
  const handleNotificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/notifications/admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...notificationForm,
          memberId: notificationForm.memberId || undefined
        })
      });

      if (response.ok) {
        await fetchData();
        setShowNotificationForm(false);
        setNotificationForm({
          title: '',
          message: '',
          type: 'ADMIN_MESSAGE',
          memberId: '',
          memberEmail: ''
        });
        setSearchMember('');
        setMemberSuggestions([]);
      } else {
        const error = await response.json();
        alert(error.message || 'Gagal mengirim notifikasi');
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Terjadi kesalahan saat mengirim notifikasi');
    }
  };

  // Toggle message active status
  const toggleMessageStatus = async (messageId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/notifications/admin-messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error toggling message status:', error);
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/notifications/admin-messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus notifikasi ini?')) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID');
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'LOW': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchMembers(searchMember);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchMember]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Notifikasi</h1>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'messages'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <SpeakerWaveIcon className="w-4 h-4 inline mr-2" />
          Pesan Admin
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'notifications'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BellIcon className="w-4 h-4 inline mr-2" />
          Notifikasi Member
        </button>
      </div>

      {/* Admin Messages Tab */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Pesan Admin (Broadcast)</h2>
            <button
              onClick={() => {
                setShowMessageForm(true);
                setEditingMessage(null);
                setMessageForm({ title: '', content: '', priority: 'MEDIUM' });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Buat Pesan</span>
            </button>
          </div>

          <div className="grid gap-4">
            {adminMessages.map((message) => (
              <div key={message.id} className="bg-white border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{message.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(message.priority)}`}>
                        {message.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        message.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {message.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div 
                      className="text-gray-600 mb-3"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                    <div className="text-sm text-gray-500">
                      Dibuat: {formatTime(message.createdAt)} oleh {message.admin.name}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleMessageStatus(message.id, message.isActive)}
                      className={`p-2 rounded-lg ${
                        message.isActive 
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' 
                          : 'bg-green-100 text-green-600 hover:bg-green-200'
                      }`}
                      title={message.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    >
                      {message.isActive ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingMessage(message);
                        setMessageForm({
                          title: message.title,
                          content: message.content,
                          priority: message.priority
                        });
                        setShowMessageForm(true);
                      }}
                      className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      title="Hapus"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Notifikasi Member</h2>
            <button
              onClick={() => {
                setShowNotificationForm(true);
                setNotificationForm({
                  title: '',
                  message: '',
                  type: 'ADMIN_MESSAGE',
                  memberId: '',
                  memberEmail: ''
                });
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Kirim Notifikasi</span>
            </button>
          </div>

          <div className="grid gap-4">
            {notifications.map((notification) => (
              <div key={notification.id} className="bg-white border rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{notification.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        notification.isRead ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {notification.isRead ? 'Dibaca' : 'Belum Dibaca'}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{notification.message}</p>
                    <div className="text-sm text-gray-500">
                      Untuk: {notification.member.fullName} ({notification.member.email})
                      <br />
                      Dikirim: {formatTime(notification.createdAt)}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                    title="Hapus"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Form Modal */}
      {showMessageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingMessage ? 'Edit Pesan Admin' : 'Buat Pesan Admin'}
              </h2>
              
              <form onSubmit={handleMessageSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={messageForm.title}
                    onChange={(e) => setMessageForm({ ...messageForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Konten
                  </label>
                  <textarea
                    value={messageForm.content}
                    onChange={(e) => setMessageForm({ ...messageForm, content: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioritas
                  </label>
                  <select
                    value={messageForm.priority}
                    onChange={(e) => setMessageForm({ ...messageForm, priority: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Rendah</option>
                    <option value="MEDIUM">Sedang</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Mendesak</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowMessageForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingMessage ? 'Update' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Notification Form Modal */}
      {showNotificationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Kirim Notifikasi</h2>
              
              <form onSubmit={handleNotificationSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul
                  </label>
                  <input
                    type="text"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pesan
                  </label>
                  <textarea
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member (kosongkan untuk semua member)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchMember}
                      onChange={(e) => {
                        setSearchMember(e.target.value);
                        setNotificationForm({ ...notificationForm, memberEmail: e.target.value });
                      }}
                      placeholder="Cari berdasarkan nama atau email..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {memberSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {memberSuggestions.map((member) => (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setNotificationForm({
                                ...notificationForm,
                                memberId: member.id,
                                memberEmail: member.email
                              });
                              setSearchMember(`${member.fullName} (${member.email})`);
                              setMemberSuggestions([]);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100"
                          >
                            <div className="font-medium">{member.fullName}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNotificationForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Kirim
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}