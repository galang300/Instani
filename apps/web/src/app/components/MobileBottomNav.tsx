"use client";

import { Home, MessageCircle, ShoppingBasket, Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/petani", label: "Petani", icon: Sprout },
  { href: "/pembeli", label: "Beli", icon: ShoppingBasket },
  { href: "/consult", label: "AI", icon: MessageCircle }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-100 bg-white/95 px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_30px_rgba(21,32,43,0.12)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`focus-ring flex min-h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold transition ${
                active
                  ? "bg-emerald-50 text-leaf"
                  : "text-slate-500 hover:bg-slate-50 hover:text-ink"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
