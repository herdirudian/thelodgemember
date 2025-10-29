"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminAuthWrapperProps {
  children: React.ReactNode;
}

export default function AdminAuthWrapper({ children }: AdminAuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/admin/login');
          return;
        }

        // Verify token with backend
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Check if user is admin with valid adminRole
          if (data.user && 
              data.user.role === 'ADMIN' && 
              data.user.isActive && 
              data.user.adminRole && 
              ['SUPER_ADMIN', 'OWNER', 'MODERATOR', 'CASHIER'].includes(data.user.adminRole)) {
            setIsAuthenticated(true);
          } else {
            console.log('Admin auth failed:', {
              role: data.user?.role,
              isActive: data.user?.isActive,
              adminRole: data.user?.adminRole
            });
            localStorage.removeItem('token');
            router.push('/admin/login');
          }
        } else {
          localStorage.removeItem('token');
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('token');
        router.push('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F4D39] mx-auto"></div>
          <p className="mt-4 text-gray-600">Memverifikasi autentikasi...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Mengalihkan ke halaman login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}