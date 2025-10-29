'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(15);

  const externalId = searchParams.get('external_id');
  const invoiceId = searchParams.get('invoice_id');
  const failureReason = searchParams.get('failure_reason');

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

  const handleRetryPayment = () => {
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

  const getFailureMessage = (reason: string | null) => {
    switch (reason) {
      case 'EXPIRED':
        return 'Waktu pembayaran telah habis. Silakan coba lagi.';
      case 'CANCELLED':
        return 'Pembayaran dibatalkan. Anda dapat mencoba lagi kapan saja.';
      case 'FAILED':
        return 'Pembayaran gagal diproses. Silakan periksa detail pembayaran Anda.';
      default:
        return 'Pembayaran tidak dapat diselesaikan. Silakan coba lagi atau hubungi customer service.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Failed Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <XCircleIcon className="w-10 h-10 text-red-600" />
        </div>

        {/* Failed Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Pembayaran Gagal
        </h1>
        
        <p className="text-gray-600 mb-6">
          {getFailureMessage(failureReason)}
        </p>

        {/* Payment Details */}
        {(externalId || invoiceId) && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Detail Transaksi:</h3>
            {externalId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">ID Booking:</span> {externalId}
              </p>
            )}
            {invoiceId && (
              <p className="text-sm text-gray-600 mb-1">
                <span className="font-medium">ID Invoice:</span> {invoiceId}
              </p>
            )}
            {failureReason && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Alasan:</span> {failureReason}
              </p>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-blue-900 mb-2">Apa yang bisa Anda lakukan?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Periksa saldo atau limit kartu Anda</li>
            <li>• Coba metode pembayaran lain</li>
            <li>• Pastikan koneksi internet stabil</li>
            <li>• Hubungi customer service jika masalah berlanjut</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Coba Lagi
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>

        {/* Customer Service */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Butuh bantuan?</p>
          <p className="text-sm text-blue-600 font-medium">
            Hubungi Customer Service: 
            <a href="tel:+62123456789" className="ml-1 hover:underline">
              +62 123 456 789
            </a>
          </p>
        </div>

        {/* Auto Redirect Notice */}
        <p className="text-sm text-gray-500 mt-4">
          Anda akan diarahkan ke dashboard dalam {countdown} detik
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentFailedContent />
    </Suspense>
  );
}