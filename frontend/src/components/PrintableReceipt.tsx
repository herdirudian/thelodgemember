"use client";
import React, { forwardRef } from 'react';

interface RedeemReceiptData {
  id: string;
  memberName: string;
  memberId: string;
  voucherName: string;
  voucherType: 'TICKET' | 'POINTS' | 'EVENT' | 'ticket' | 'points' | 'event';
  redeemedAt: string;
  adminName: string;
  adminId: string;
  receiptNumber?: string;
}

interface PrintableReceiptProps {
  data: RedeemReceiptData;
}

const PrintableReceipt = forwardRef<HTMLDivElement, PrintableReceiptProps>(
  ({ data }, ref) => {
    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    const getTypeLabel = (type: string) => {
      switch (type.toUpperCase()) {
        case 'TICKET': return 'Tiket';
        case 'POINTS': return 'Poin';
        case 'EVENT': return 'Event';
        case 'TOURISM_TICKET': return 'Tiket Wisata';
        default: return type;
      }
    };

    const receiptNumber = data.receiptNumber || `RCP-${Date.now()}-${data.id.slice(-6).toUpperCase()}`;

    return (
      <div 
        ref={ref}
        className="bg-white p-8 max-w-2xl mx-auto"
        style={{ 
          fontFamily: 'Arial, sans-serif',
          lineHeight: '1.6',
          color: '#333'
        }}
      >
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-[#0F4D39] mb-2">
              THE LODGE FAMILY
            </h1>
            <p className="text-lg text-gray-600">Bukti Redeem Voucher</p>
          </div>
          
          <div className="bg-[#0F4D39] text-white px-4 py-2 rounded-lg inline-block">
            <span className="font-semibold">No. Bukti: {receiptNumber}</span>
          </div>
        </div>

        {/* Receipt Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-[#0F4D39] mb-3 text-lg border-b border-gray-300 pb-2">
                Informasi Member
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nama:</span>
                  <span className="font-medium">{data.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Member:</span>
                  <span className="font-medium">{data.memberId}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-[#0F4D39] mb-3 text-lg border-b border-gray-300 pb-2">
                Detail Voucher
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nama Voucher:</span>
                  <span className="font-medium">{data.voucherName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipe:</span>
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                    {getTypeLabel(data.voucherType)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-[#0F4D39] mb-3 text-lg border-b border-gray-300 pb-2">
                Informasi Redeem
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tanggal Redeem:</span>
                  <span className="font-medium text-sm">{formatDate(data.redeemedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Admin:</span>
                  <span className="font-medium">{data.adminName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Admin:</span>
                  <span className="font-medium">{data.adminId}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-green-600 font-bold text-xl mb-1">✓ BERHASIL</div>
                  <div className="text-green-700 text-sm">Voucher telah di-redeem</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section (Optional) */}
        <div className="text-center mb-8">
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 p-6 rounded-lg">
            <div className="text-gray-500 mb-2">QR Code Verifikasi</div>
            <div className="w-24 h-24 bg-white border border-gray-300 mx-auto flex items-center justify-center rounded">
              <span className="text-xs text-gray-400">QR Code</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Scan untuk verifikasi keaslian bukti
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="border-t-2 border-gray-300 pt-6">
          <h4 className="font-semibold text-[#0F4D39] mb-3">Syarat & Ketentuan:</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Bukti redeem ini adalah bukti sah bahwa voucher telah digunakan</li>
            <li>Voucher yang telah di-redeem tidak dapat dikembalikan atau ditukar</li>
            <li>Simpan bukti ini sebagai arsip transaksi Anda</li>
            <li>Hubungi customer service jika ada pertanyaan terkait transaksi ini</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Dokumen ini digenerate secara otomatis pada {formatDate(new Date().toISOString())}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            © 2025 The Lodge Group. All rights reserved.
          </p>
        </div>
      </div>
    );
  }
);

PrintableReceipt.displayName = 'PrintableReceipt';

export default PrintableReceipt;