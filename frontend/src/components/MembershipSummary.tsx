import React from "react";

type Props = {
  pointsBalance?: number;
  memberSince?: string;
  activeVouchers?: number;
  actions?: React.ReactNode;
  className?: string;
  iconPoin?: React.ReactNode;
  iconMemberSince?: React.ReactNode;
  iconVoucher?: React.ReactNode;
};

export default function MembershipSummary({
  pointsBalance = 0,
  memberSince = "Belum tersedia",
  activeVouchers = 0,
  actions,
  className = "",
  iconPoin,
  iconMemberSince,
  iconVoucher,
}: Props) {
  const hasActions = Boolean(actions);
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${hasActions ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 auto-rows-fr ${className}`}>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 overflow-hidden relative min-h-[110px]" role="group" aria-label="Ringkasan Poin">
        <div className="flex items-center justify-between text-sm opacity-90">
          <span className="text-gray-700 dark:text-gray-300">Poin</span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-[#0F4D39]/10 text-[#0F4D39]">
            {iconPoin ?? (<span className="inline-block w-4 h-4 rounded bg-[#0F4D39]" aria-hidden="true"></span>)}
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100 leading-snug" aria-live="polite" aria-label={`Jumlah Poin: ${pointsBalance}`}>{pointsBalance}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 overflow-hidden relative min-h-[110px]" role="group" aria-label="Ringkasan Member Sejak">
        <div className="flex items-center justify-between text-sm opacity-90">
          <span className="text-gray-700 dark:text-gray-300">Member Sejak</span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-[#0F4D39]/10 text-[#0F4D39]">
            {iconMemberSince ?? (<span className="inline-block w-4 h-4 rounded bg-[#0F4D39]" aria-hidden="true"></span>)}
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100 leading-snug" aria-live="polite" aria-label={`Member sejak: ${memberSince}`}>{memberSince}</div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 overflow-hidden relative min-h-[110px]" role="group" aria-label="Ringkasan Voucher Aktif">
        <div className="flex items-center justify-between text-sm opacity-90">
          <span className="text-gray-700 dark:text-gray-300">Voucher Aktif</span>
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 bg-[#0F4D39]/10 text-[#0F4D39]">
            {iconVoucher ?? (<span className="inline-block w-4 h-4 rounded bg-[#0F4D39]" aria-hidden="true"></span>)}
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-semibold mt-2 text-gray-900 dark:text-gray-100 leading-snug" aria-live="polite" aria-label={`Voucher aktif: ${activeVouchers}`}>{activeVouchers}</div>
      </div>
      {hasActions && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-2 overflow-hidden relative min-h-[110px]" role="group" aria-label="Aksi Membership">
          {actions}
        </div>
      )}
    </div>
  );
}