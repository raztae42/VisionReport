import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { cn } from "@/app/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });


//import Header from "./components/Header";
//import Footer from "./components/Footer";

const jetbrains_mono = JetBrains_Mono({
  variable: "--font-jetbrains_mono",
  subsets: ["latin"],
  style: ['normal'],
  weight: ['400', '500', '600', '700'],
});


export const metadata: Metadata = {
  title: "Vision Report",
  description: "Vision Report Dashboard",
};

// layout.tsx — ไม่ต้องแยก component ก็ได้
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", geist.variable)}>
      <body className="min-h-screen flex flex-col">
        {/* Floating Liquid Capsule Header (React Bits Style) */}
        <header className="fixed top-4 left-0 right-0 z-50 mx-auto w-[94%] max-w-6xl">
          <nav className="flex   items-center justify-between px-6 py-3 rounded-2xl bg-[#0b0a13]/80 backdrop-blur-xl border border-white/15 shadow-[0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              {/* Animated DJ Badge */}
              <div className="relative flex items-center justify-center">
                {/* Glowing rotating gradient aura */}
                <div
                  className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 opacity-75 blur-[2px] group-hover:opacity-100 transition-opacity duration-300 animate-spin"
                  style={{ animationDuration: '4s' }}
                />

                {/* Inner DJ Badge */}
                <div className="relative w-8 h-8 rounded-[10px] bg-[#0b0a13] border border-white/30 flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] group-hover:scale-105 transition-all duration-300">
                  <span className="font-black text-xs tracking-wider bg-gradient-to-br from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent select-none">
                    DJ
                  </span>
                </div>
              </div>

              <span className="font-semibold text-lg tracking-tight text-white group-hover:text-zinc-200 transition-colors">
                Vision Report
              </span>
            </Link>

            {/* Menu Links & CTA Button */}
            <div className="flex items-center gap-6 md:gap-8">
              <Link
                href="/"
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin"
                className="bg-white text-zinc-950 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-zinc-200 active:scale-95 transition-all shadow-sm"
              >
                Admin mode
              </Link>
            </div>
          </nav>
        </header>

        {children}

        <footer className="py-4 px-16 text-center text-sm text-zinc-500">
          © 2026 Vision Report
        </footer>
      </body>
    </html>
  );
}

