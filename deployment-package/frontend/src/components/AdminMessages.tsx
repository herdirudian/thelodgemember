'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpeakerWaveIcon, XMarkIcon } from '@heroicons/react/24/outline';

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

interface AdminMessagesProps {
  className?: string;
}

export default function AdminMessages({ className = '' }: AdminMessagesProps) {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set());
  const router = useRouter();

  // Load dismissed messages from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedAdminMessages');
    if (dismissed) {
      setDismissedMessages(new Set(JSON.parse(dismissed)));
    }
  }, []);

  // Fetch admin messages
  const fetchMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/notifications/admin-messages', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(result.data || []);
      } else if (response.status === 401) {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching admin messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Dismiss message
  const dismissMessage = (messageId: string) => {
    const newDismissed = new Set(dismissedMessages);
    newDismissed.add(messageId);
    setDismissedMessages(newDismissed);
    localStorage.setItem('dismissedAdminMessages', JSON.stringify([...newDismissed]));
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'LOW':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'Mendesak';
      case 'HIGH':
        return 'Tinggi';
      case 'MEDIUM':
        return 'Sedang';
      case 'LOW':
        return 'Rendah';
      default:
        return priority;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Baru saja';
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam yang lalu`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} hari yang lalu`;
    
    return date.toLocaleDateString('id-ID');
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  // Filter out dismissed messages
  const visibleMessages = messages.filter(message => 
    message.isActive && !dismissedMessages.has(message.id)
  );

  if (loading || visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {visibleMessages.map((message) => (
        <div
          key={message.id}
          className={`border rounded-lg p-4 ${getPriorityColor(message.priority)}`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <SpeakerWaveIcon className="h-6 w-6 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg">
                    {message.title}
                  </h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-50">
                    {getPriorityLabel(message.priority)}
                  </span>
                </div>
                
                <div 
                  className="text-sm mb-3 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: message.content }}
                />
                
                <div className="flex items-center justify-between text-xs opacity-75">
                  <span>Dari: {message.admin.name}</span>
                  <span>{formatTimeAgo(message.createdAt)}</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => dismissMessage(message.id)}
              className="ml-2 p-1 hover:bg-white hover:bg-opacity-50 rounded-full transition-colors"
              aria-label="Tutup pesan"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}