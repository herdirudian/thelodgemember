'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const externalId = searchParams.get('external_id');
  const invoiceId = searchParams.get('invoice_id');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  const handleViewBooking = () => {
    if (externalId) {
      // Extract booking type and ID from external_id
      if (externalId.includes('tourism_ticket')) {
        const bookingId = externalId.split('_').pop();
        router.push(`/booking/tourism-tickets/${bookingId}`);
      } else if (externalId.includes('accommodation')) {
        const bookingId = externalId.split('_').pop();
        router.push(`/booking/accommodations/${bookingId}`);
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircleIcon className="w-10 h-10 text-green-600" />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Pembayaran Berhasil!
        </h1>
        
        <p className="text-gray-600 mb-6">
          Terima kasih! Pembayaran Anda telah berhasil diproses. 
          Kami akan mengirimkan konfirmasi booking ke email Anda.
        </p>

        {/* Payment Details */}
        {(externalId || invoiceId) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Detail Pembayaran:</h3>
            {externalId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">ID Booking:</span> {externalId}
              </p>
            )}
            {invoiceId && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID Invoice:</span> {invoiceId}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewBooking}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Lihat Detail Booking
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>

        {/* Auto Redirect Notice */}
        <p className="text-sm text-gray-500 mt-6">
          Anda akan diarahkan ke dashboard dalam {countdown} detik
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}