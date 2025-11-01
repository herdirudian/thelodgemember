import React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & { strokeWidth?: number };

export const IconStar: React.FC<IconProps> = ({ className = "w-5 h-5 text-[#0F4D39] flex-shrink-0", strokeWidth = 1.5, ...rest }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" {...rest}>
    <path d="M12 2l3 7h7l-5.5 4 2.5 7-7-4.5L5 20l2.5-7L2 9h7z" />
  </svg>
);

export const IconCalendar: React.FC<IconProps> = ({ className = "w-5 h-5 text-[#0F4D39] flex-shrink-0", strokeWidth = 1.5, ...rest }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" {...rest}>
    <path d="M16 2v2M8 2v2M3 8h18M5 6h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
  </svg>
);

export const IconTicket: React.FC<IconProps> = ({ className = "w-5 h-5 text-[#0F4D39] flex-shrink-0", strokeWidth = 1.5, ...rest }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true" {...rest}>
    <path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v2a3 3 0 000 6v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a3 3 0 000-6V7z" />
  </svg>
);