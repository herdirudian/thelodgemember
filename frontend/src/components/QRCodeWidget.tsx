"use client";
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeWidgetProps {
  memberData?: {
    id?: string;
    fullName?: string;
    membershipNumber?: string;
    pointsBalance?: number;
    level?: string;
    isLifetime?: boolean;
  };
  className?: string;
}

export default function QRCodeWidget({ memberData, className = "" }: QRCodeWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrData, setQrData] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Generate QR data berdasarkan member info
  useEffect(() => {
    if (memberData) {
      const qrPayload = {
        type: 'MEMBER_QR',
        memberId: memberData.id,
        membershipNumber: memberData.membershipNumber,
        fullName: memberData.fullName,
        level: memberData.level,
        isLifetime: memberData.isLifetime,
        timestamp: Date.now(),
        // Hash sederhana untuk validasi
        hash: btoa(`${memberData.id}-${memberData.membershipNumber}-${Date.now()}`).slice(0, 16)
      };
      setQrData(JSON.stringify(qrPayload));
    }
  }, [memberData]);

  // Generate QR Code
  useEffect(() => {
    if (qrData && canvasRef.current) {
      setIsGenerating(true);
      QRCode.toCanvas(canvasRef.current, qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#0F4D39',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      }).then(() => {
        setIsGenerating(false);
      }).catch((err) => {
        console.error('QR Code generation error:', err);
        setIsGenerating(false);
      });
    }
  }, [qrData]);

  if (!memberData) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 shadow p-4 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            📱
          </div>
          <p className="text-sm">Member data tidak tersedia</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-[#0F4D39] to-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">QR</span>
            </div>
            <div>
              <h3 className="font-semibold text-[#0F4D39] dark:text-emerald-400">Member QR Code</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Untuk check-in & redeem</p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {showDetails ? 'Sembunyikan' : 'Detail'}
          </button>
        </div>
      </div>

      {/* QR Code */}
      <div className="p-4">
        <div className="relative">
          <div className="flex justify-center mb-3">
            <div className="relative">
              {isGenerating && (
                <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center z-10">
                  <div className="animate-spin w-6 h-6 border-2 border-[#0F4D39] border-t-transparent rounded-full"></div>
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="border border-gray-200 dark:border-gray-600 rounded-lg"
                style={{ maxWidth: '200px', height: 'auto' }}
              />
            </div>
          </div>

          {/* Member Info */}
          <div className="text-center space-y-1">
            <div className="font-medium text-[#0F4D39] dark:text-emerald-400">
              {memberData.fullName}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {memberData.membershipNumber || 'No Member'}
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                memberData.isLifetime 
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
              }`}>
                {memberData.isLifetime ? '👑 Lifetime' : `${memberData.level || 'Bronze'} Member`}
              </span>
            </div>
          </div>

          {/* Expandable Details */}
          {showDetails && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
              <div className="text-xs text-gray-600 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Points Balance:</span>
                  <span className="font-medium">{(memberData.pointsBalance || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>Member ID:</span>
                  <span className="font-mono">{memberData.id?.slice(-8) || '-'}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span>QR Generated:</span>
                  <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              if (canvasRef.current) {
                const link = document.createElement('a');
                link.download = `qr-member-${memberData.membershipNumber || 'code'}.png`;
                link.href = canvasRef.current.toDataURL();
                link.click();
              }
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-[#0F4D39] text-white rounded-lg hover:bg-[#0e3f30] transition-colors"
          >
            📱 Download
          </button>
          <button
            onClick={() => {
              if (navigator.share && canvasRef.current) {
                canvasRef.current.toBlob((blob) => {
                  if (blob) {
                    const file = new File([blob], `qr-member-${memberData.membershipNumber}.png`, { type: 'image/png' });
                    navigator.share({
                      title: 'Member QR Code',
                      text: `QR Code untuk ${memberData.fullName}`,
                      files: [file]
                    });
                  }
                });
              } else {
                // Fallback: copy QR data to clipboard
                navigator.clipboard?.writeText(qrData);
                alert('QR data copied to clipboard!');
              }
            }}
            className="flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            📤 Share
          </button>
        </div>
      </div>
    </div>
  );
}