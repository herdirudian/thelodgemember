"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      href: "/dashboard",
      label: "Overview",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      href: "/my-ticket",
      label: "My Ticket",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 11-4 0V7a2 2 0 00-2-2H5z" />
        </svg>
      )
    },
    {
      href: "/exclusive-member",
      label: "Exclusive Member",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    },
    {
      href: "/redeem-points",
      label: "Redeem Points",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      href: "/tourism-tickets",
      label: "Tourism Tickets",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9h4m-4 4h4" />
        </svg>
      )
    },
    {
      href: "/accommodation",
      label: "Accommodation",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      href: "/profile",
      label: "Profile",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      href: "#logout",
      label: "Logout",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      isLogout: true
    }
  ];

  const isActive = (href: string) => pathname === href;

  const handleLogout = () => {
    try { 
      localStorage.removeItem("token"); 
    } catch {}
    window.location.href = "/login";
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 transition-all duration-300 ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}`}>
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
          {/* Logo and Toggle */}
          <div className="flex h-16 shrink-0 items-center justify-between">
            {!isCollapsed && (
              <Link href="/dashboard" className="flex items-center">
                <Image
                  src="/The Lodge Maribaya Logo.svg"
                  alt="The Lodge Family"
                  width={140}
                  height={32}
                  priority
                  className="h-8 w-auto"
                />
              </Link>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {menuItems.map((item) => (
                    <li key={item.href}>
                      {item.isLogout ? (
                        <button
                          onClick={handleLogout}
                          className={`group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200 w-full text-left text-gray-700 hover:text-red-600 hover:bg-red-50`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className={`text-gray-400 group-hover:text-red-600 transition-colors`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          prefetch={false}
                          className={`group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-all duration-200 ${
                            isActive(item.href)
                              ? 'bg-[#0F4D39] text-white shadow-sm'
                              : 'text-gray-700 hover:text-[#0F4D39] hover:bg-gray-50'
                          }`}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className={`${isActive(item.href) ? 'text-white' : 'text-gray-400 group-hover:text-[#0F4D39]'} transition-colors`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile Top Navigation */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Logo di sisi kiri */}
            <div className="flex items-center">
              <Image
                src="/The Lodge Maribaya Logo.svg"
                alt="The Lodge Maribaya"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
            </div>
            
            {/* Hamburger menu di sisi kanan */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0F4D39]"
              >
                <span className="sr-only">Open main menu</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="bg-white border-t border-gray-200">
              <div className="px-2 pt-2 pb-3 space-y-1">
                {menuItems.map((item) => (
                  item.isLogout ? (
                    <button
                      key={item.href}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 w-full text-left text-gray-700 hover:text-red-600 hover:bg-red-50`}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 flex-shrink-0">
                          <div className="w-5 h-5">
                            {item.icon}
                          </div>
                        </span>
                        {item.label}
                      </div>
                    </button>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                        isActive(item.href)
                          ? 'bg-[#0F4D39] text-white'
                          : 'text-gray-700 hover:text-[#0F4D39] hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="mr-3 flex-shrink-0">
                          <div className="w-5 h-5">
                            {item.icon}
                          </div>
                        </span>
                        {item.label}
                      </div>
                    </Link>
                  )
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation - Hidden */}
        <div className="hidden">
          <div className="grid grid-cols-5 gap-0.5 px-1 py-1.5">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex flex-col items-center justify-center p-1.5 rounded-md transition-all duration-200 min-h-[48px] ${
                  isActive(item.href)
                    ? 'bg-[#0F4D39] text-white'
                    : 'text-gray-600 hover:text-[#0F4D39] hover:bg-gray-50'
                }`}
              >
                <span className={`${isActive(item.href) ? 'text-white' : 'text-gray-500'} mb-0.5 flex-shrink-0`}>
                  <div className="w-4 h-4">
                    {item.icon}
                  </div>
                </span>
                <span className="text-[10px] font-medium truncate max-w-full leading-tight text-center">
                  {item.label.includes(' ') ? item.label.split(' ')[0] : item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}