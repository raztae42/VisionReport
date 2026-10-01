import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/app/lib/utils";
import NavBar from "./components/NavBar";

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
        <NavBar />

        {children}

        <footer className="py-4 px-16 text-center text-sm text-zinc-500">
          © 2026 Vision Report
        </footer>
      </body>
    </html>
  );
}
