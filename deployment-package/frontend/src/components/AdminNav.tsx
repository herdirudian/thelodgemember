"use client";
// import Link from "next/link"; // tidak diperlukan lagi karena kita gunakan anchor native

type AdminNavProps = {
  active?:
    | "overview"
    | "members"
    | "points"
    | "events"
    | "promos"
    | "benefits"
    | "slider"
    | "vouchers"
    | "redeem-voucher"
    | "member-tickets"
    | "activities"
    | "member-activities"
    | "admins"
    | "settings"
    | "analytics"
    | "registration-codes"
    | "tourism-tickets"
    | "accommodation"
    | "notifications";
};

export default function AdminNav({ active = "overview" }: AdminNavProps) {
  const baseClass =
    "rounded-md px-3 py-2 text-sm font-medium transition-colors border border-transparent";
  const activeClass =
    "bg-[#0F4D39] text-white border-[#0F4D39] hover:opacity-90";
  const inactiveClass =
    "bg-white text-[#0F4D39] hover:bg-slate-100 border-slate-200";

  const item = (key: NonNullable<AdminNavProps["active"]>, label: string, href: string) => (
    <a
      href={href}
      onClick={(e) => {
        try {
          e.preventDefault();
          const hash = href.split("#")[1] || "overview";
          // Set hash secara native agar event 'hashchange' terpicu
          window.location.hash = hash;
        } catch {}
      }}
      className={`${baseClass} ${active === key ? activeClass : inactiveClass}`}
    >
      {label}
    </a>
  );

  return (
    <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {item("overview", "Overview", "/admin#overview")}
            {item("members", "Members", "/admin#members")}
            {item("points", "Points", "/admin#points")}
            {item("events", "Events", "/admin#events")}
            {item("promos", "Program", "/admin#promos")}
            {item("benefits", "Benefits", "/admin#benefits")}
            {item("tourism-tickets", "Tiket Wisata", "/admin#tourism-tickets")}
            {item("accommodation", "Penginapan", "/admin#accommodation")}
            {item("slider", "Slider", "/admin#slider")}
            {item("vouchers", "Vouchers", "/admin#vouchers")}
            {item("redeem-voucher", "Redeem Voucher", "/admin#redeem-voucher")}
            {item("member-tickets", "Member Tickets", "/admin#member-tickets")}
            {item("registration-codes", "Registration Codes", "/admin#registration-codes")}
            {item("activities", "Activities", "/admin#activities")}
            {item("member-activities", "Member Activities", "/admin#member-activities")}
            {item("notifications", "Notifikasi", "/admin#notifications")}
            {item("admins", "Admins", "/admin#admins")}
            {item("settings", "Settings", "/admin#settings")}
            {item("analytics", "Analytics", "/admin#analytics")}
          </div>
          <button
            className="rounded-md px-3 py-2 text-sm font-medium bg-red-600 text-white hover:bg-red-700"
            onClick={() => {
              try { localStorage.removeItem('token'); } catch {}
              try { window.location.href = '/login'; } catch {}
            }}
          >Logout</button>
        </div>
      </div>
    </div>
  );
}