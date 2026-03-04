"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-canva min-h-screen flex flex-col">
      {/* Top section: dark branding with logo */}
      <header className="login-hero flex-shrink-0 flex flex-col items-center justify-center px-4 py-12 sm:py-16 min-h-[32vh] sm:min-h-[35vh]">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="absolute top-4 left-4 text-white/90 hover:text-white text-2xl font-medium transition-colors"
          aria-label="Back"
        >
          ←
        </button>
        <div
          className={`flex flex-col items-center text-center transition-all duration-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <Image
            src="/images/starpoint-logo-light.png"
            alt="StarPoint"
            width={300}
            height={100}
            className="h-20 sm:h-24 w-auto object-contain"
            priority
          />
        </div>
      </header>

      {/* Bottom section: white form */}
      <main className="login-form-section flex-1 bg-white rounded-t-[2rem] sm:rounded-t-[2.5rem] -mt-6 relative z-10 px-6 sm:px-8 pt-8 sm:pt-10 pb-10 sm:pb-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-[#1a1a1a] text-3xl sm:text-4xl font-bold uppercase tracking-tight text-center">
            Login
          </h1>
          <p className="text-[#737373] text-sm sm:text-base uppercase tracking-wide text-center mt-1">
            Sign in to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 sm:mt-10 space-y-6">
            {error && (
              <div
                className="rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="login-email"
                className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
              >
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="login-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="login-password"
                className="block text-[#737373] text-xs font-medium uppercase tracking-wider"
              >
                Password
              </label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="login-canva-input h-12 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] placeholder:text-[#737373] focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="login-canva-btn w-full h-12 rounded-2xl bg-[#1a1a1a] text-white font-bold uppercase tracking-wide text-base focus-visible:ring-[#D4A817]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" aria-hidden />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="login-canva-link block text-sm text-[#737373]"
            >
              Forgot Password?
            </Link>
            <Link
              href="/register"
              className="login-canva-link block text-sm text-[#737373] font-medium"
            >
              Signup !
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
