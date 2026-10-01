"use client";

import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showModal]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setPassword("");
    setError("");
    setShake(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showModal) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("กรุณาใส่รหัสผ่าน");
      return;
    }

    setIsChecking(true);
    setError("");

    try {
      const res = await fetch("/api/admin-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (data.success) {
        // Save auth to sessionStorage so refreshing admin page doesn't re-ask
        sessionStorage.setItem("admin_auth", "true");
        handleClose();
        router.push("/admin");
      } else {
        setError(data.message || "รหัสผ่านไม่ถูกต้อง");
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <>
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
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="bg-white text-zinc-950 font-semibold text-sm px-5 py-2 rounded-xl hover:bg-zinc-200 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Admin mode
            </button>
          </div>
        </nav>
      </header>

      {/* Password Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]" />

          {/* Modal Card */}
          <div
            className={`relative w-full max-w-sm mx-4 bg-[#0f0e1a]/95 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_40px_rgba(82,39,255,0.15)] p-6 animate-[scaleIn_200ms_ease-out] ${shake ? "animate-[shakeX_400ms_ease-in-out]" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* Lock Icon */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-violet-500/30 via-fuchsia-500/30 to-purple-500/30 blur-xl animate-pulse" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-center text-lg font-bold text-white mb-1">
              เข้าสู่ระบบ Admin
            </h2>
            <p className="text-center text-xs text-zinc-400 mb-5">
              กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน Admin mode
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="relative mb-4">
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="รหัสผ่าน..."
                  className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 transition-all ${
                    error
                      ? "border-rose-500/50 focus:ring-rose-500/30"
                      : "border-white/10 focus:ring-violet-500/30 focus:border-violet-500/50"
                  }`}
                  disabled={isChecking}
                  autoComplete="off"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <span className="text-xs text-rose-300">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isChecking}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center justify-center gap-2"
              >
                {isChecking ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    ปลดล็อค
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Keyframe Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shakeX {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
      `}</style>
    </>
  );
}
