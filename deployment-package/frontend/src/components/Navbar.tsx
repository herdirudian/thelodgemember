"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const baseLinkClass = "text-[#0F4D39] transition-opacity hover:underline hover:opacity-80";
  const activeClass = "font-semibold underline";

  const linkClass = (href: string) =>
    `${baseLinkClass} ${pathname === href ? activeClass : ""}`;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        {/* Brand logo */}
        <Link href="/dashboard" prefetch={false} aria-label="The Lodge Family - Dashboard" className="flex items-center">
          <Image
            src="/The Lodge Maribaya Logo.svg"
            alt="The Lodge Family"
            width={160}
            height={36}
            priority
            className="h-9 w-auto"
          />
        </Link>
        {/* Desktop links */}
        <div className="hidden md:flex gap-4 items-center">
          <Link prefetch={false} href="/dashboard" className={linkClass("/dashboard")}>Overview</Link>
          <Link prefetch={false} href="/my-ticket" className={linkClass("/my-ticket")}>My Ticket</Link>
          <Link prefetch={false} href="/tourism-tickets" className={linkClass("/tourism-tickets")}>Tourism Tickets</Link>
          <Link prefetch={false} href="/accommodation" className={linkClass("/accommodation")}>Accommodation</Link>
          <Link prefetch={false} href="/exclusive-member" className={linkClass("/exclusive-member")}>Exclusive Member</Link>
          <Link prefetch={false} href="/redeem-points" className={linkClass("/redeem-points")}>Redeem Points</Link>
          <Link prefetch={false} href="/profile" className={linkClass("/profile")}>Profile</Link>
          <NotificationBell />
        </div>
        {/* Mobile toggle */}
        <button
          type="button"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-2 rounded border border-gray-300 text-[#0F4D39] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F4D39]"
        >
          {open ? (
            // X icon when menu is open
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 6l12 12" />
              <path d="M6 18L18 6" />
            </svg>
          ) : (
            // Hamburger icon when menu is closed
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          )}
        </button>
      </div>
      {/* Mobile menu */}
      <div className={`md:hidden ${open ? "block" : "hidden"} border-t border-gray-200 bg-white`}>
        <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3">
          <Link prefetch={false} href="/dashboard" className={linkClass("/dashboard")} onClick={() => setOpen(false)}>Overview</Link>
          <Link prefetch={false} href="/my-ticket" className={linkClass("/my-ticket")} onClick={() => setOpen(false)}>My Ticket</Link>
          <Link prefetch={false} href="/tourism-tickets" className={linkClass("/tourism-tickets")} onClick={() => setOpen(false)}>Tourism Tickets</Link>
          <Link prefetch={false} href="/accommodation" className={linkClass("/accommodation")} onClick={() => setOpen(false)}>Accommodation</Link>
          <Link prefetch={false} href="/exclusive-member" className={linkClass("/exclusive-member")} onClick={() => setOpen(false)}>Exclusive Member</Link>
          <Link prefetch={false} href="/redeem-points" className={linkClass("/redeem-points")} onClick={() => setOpen(false)}>Redeem Points</Link>
          <Link prefetch={false} href="/notifications" className={linkClass("/notifications")} onClick={() => setOpen(false)}>Notifikasi</Link>
          <Link prefetch={false} href="/profile" className={linkClass("/profile")} onClick={() => setOpen(false)}>Profile</Link>
        </div>
      </div>
    </nav>
  );
}