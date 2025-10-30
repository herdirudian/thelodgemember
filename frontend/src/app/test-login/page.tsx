"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TestLoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Token valid untuk member "Herdi Rudian"
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIwMjBiMmEwNS1lOWEzLTRlNzItODgzOS0wNzhhODk1YTVjNTgiLCJyb2xlIjoiTUVNQkVSIiwiaWF0IjoxNzYxNzU0OTA4LCJleHAiOjE3NjIzNTk3MDh9.Cusg_A-5y1ATQvbVcP3ip7DwjlrNgKXY7cxU1YRmPcI';
    
    // Simpan token ke localStorage
    localStorage.setItem('token', validToken);
    
    console.log('✅ Token tersimpan:', validToken);
    console.log('🎯 Redirecting to exclusive member...');
    
    // Redirect ke exclusive member setelah 1 detik
    setTimeout(() => {
      router.push('/exclusive-member');
    }, 1000);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">🔑 Test Login</h1>
        <p className="text-gray-600 mb-4">Menyimpan token valid ke localStorage...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
        <p className="text-sm text-gray-500 mt-4">Akan redirect ke Exclusive Member dalam 1 detik</p>
      </div>
    </div>
  );
}