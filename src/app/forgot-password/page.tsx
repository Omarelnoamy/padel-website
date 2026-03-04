"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { Loader2, KeyRound, Smartphone, CheckCircle2 } from "lucide-react";

type Method = "current" | "mobile";
type OtpStep = 1 | 2;

const INPUT_CLASS =
  "login-canva-input h-11 rounded-full bg-[#e5e5e5] border-0 text-[#1a1a1a] text-sm placeholder:text-[#737373] placeholder:text-sm focus-visible:ring-2 focus-visible:ring-[#D4A817] focus-visible:ring-offset-0";
const LABEL_CLASS =
  "block text-[#737373] text-xs font-medium uppercase tracking-wider";
const BTN_CLASS =
  "login-canva-btn w-full h-11 rounded-2xl bg-[#1a1a1a] text-white font-bold uppercase tracking-wide text-sm focus-visible:ring-[#D4A817]";

export default function ForgotPasswordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [method, setMethod] = useState<Method>("mobile");
  const [otpStep, setOtpStep] = useState<OtpStep>(1);

  const [changePasswordEmail, setChangePasswordEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [mobile, setMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpNewPassword, setOtpNewPassword] = useState("");
  const [otpConfirmPassword, setOtpConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const isLoggedIn = status === "authenticated" && !!session?.user;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isLoggedIn ? {} : { email: changePasswordEmail.trim() }),
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess("Your password has been changed successfully.");
      setChangePasswordEmail("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOtpSentMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again later.");
        return;
      }
      setOtpSentMessage(
        data.message ??
          "If this number is registered, you will receive a verification code shortly.",
      );
      setOtpStep(2);
    } catch {
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobile.trim(),
          code: otpCode.trim(),
          newPassword: otpNewPassword,
          confirmPassword: otpConfirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess("Your password has been reset. You can now log in.");
      setOtpCode("");
      setOtpNewPassword("");
      setOtpConfirmPassword("");
      setOtpStep(1);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-canva min-h-screen flex flex-col">
      <header className="login-hero flex-shrink-0 flex flex-col items-center justify-center px-4 py-12 sm:py-16 min-h-[28vh] sm:min-h-[30vh]">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/login");
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

      <main className="login-form-section flex-1 bg-white rounded-t-[2rem] sm:rounded-t-[2.5rem] -mt-6 relative z-10 px-6 sm:px-8 pt-6 sm:pt-8 pb-10 sm:pb-12 overflow-auto">
        <div className="max-w-md mx-auto">
          <h1 className="text-[#1a1a1a] text-xl sm:text-2xl font-bold uppercase tracking-tight text-center">
            Forgot / Reset Password
          </h1>
          <p className="text-[#737373] text-xs sm:text-sm uppercase tracking-wide text-center mt-1">
            Choose how you want to reset your password.
          </p>

          {success && (
            <div
              className="mt-6 rounded-2xl bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm flex items-center gap-2"
              role="status"
            >
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              {success}
              <Link
                href="/login"
                className="login-canva-link font-medium text-[#D4A817] ml-1"
              >
                Log in
              </Link>
            </div>
          )}

          {!success && (
            <>
              {/* Method tabs */}
              <div
                className="mt-6 flex rounded-2xl bg-[#e5e5e5] p-1"
                role="tablist"
                aria-label="Reset method"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "mobile"}
                  onClick={() => {
                    setMethod("mobile");
                    setError("");
                    setOtpStep(1);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${method === "mobile" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#737373] hover:text-[#1a1a1a]"}`}
                >
                  <Smartphone className="h-4 w-4" />
                  Reset with mobile
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "current"}
                  onClick={() => {
                    setMethod("current");
                    setError("");
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${method === "current" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#737373] hover:text-[#1a1a1a]"}`}
                >
                  <KeyRound className="h-4 w-4" />I know my password
                </button>
              </div>

              {error && (
                <div
                  className="mt-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {method === "current" && (
                <div className="mt-6">
                  <form
                    onSubmit={handleChangePassword}
                    className="space-y-4"
                    noValidate
                  >
                    {!isLoggedIn && (
                      <div className="space-y-2">
                        <label
                          htmlFor="change-password-email"
                          className={LABEL_CLASS}
                        >
                          Email
                        </label>
                        <Input
                          id="change-password-email"
                          type="email"
                          placeholder="you@example.com"
                          value={changePasswordEmail}
                          onChange={(e) =>
                            setChangePasswordEmail(e.target.value)
                          }
                          autoComplete="email"
                          className={INPUT_CLASS}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label htmlFor="current-password" className={LABEL_CLASS}>
                        Current password
                      </label>
                      <Input
                        id="current-password"
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="new-password" className={LABEL_CLASS}>
                        New password
                      </label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        className={INPUT_CLASS}
                      />
                      <p className="text-xs text-[#737373]">
                        At least 8 characters, one letter and one number.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="confirm-password" className={LABEL_CLASS}>
                        Confirm new password
                      </label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        className={INPUT_CLASS}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading}
                      className={BTN_CLASS}
                    >
                      {loading ? (
                        <>
                          <Loader2
                            className="h-5 w-5 mr-2 animate-spin"
                            aria-hidden
                          />
                          Updating...
                        </>
                      ) : (
                        "Change password"
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {method === "mobile" && (
                <div className="mt-6">
                  {/* Progress indicator */}
                  <div
                    className="flex items-center gap-2 mb-6"
                    aria-label={`Step ${otpStep} of 2`}
                  >
                    <div
                      className={`h-2 flex-1 rounded-full ${otpStep >= 1 ? "bg-[#D4A817]" : "bg-[#e5e5e5]"}`}
                    />
                    <span className="text-xs text-[#737373] font-medium uppercase">
                      {otpStep}/2
                    </span>
                    <div
                      className={`h-2 flex-1 rounded-full ${otpStep >= 2 ? "bg-[#D4A817]" : "bg-[#e5e5e5]"}`}
                    />
                  </div>

                  {otpStep === 1 && (
                    <form
                      onSubmit={handleSendOtp}
                      className="space-y-4"
                      noValidate
                    >
                      <div className="space-y-2">
                        <label htmlFor="reset-mobile" className={LABEL_CLASS}>
                          Registered mobile number
                        </label>
                        <Input
                          id="reset-mobile"
                          type="tel"
                          inputMode="numeric"
                          placeholder="e.g. 01234567890"
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value)}
                          autoComplete="tel"
                          className={INPUT_CLASS}
                        />
                      </div>
                      {otpSentMessage && (
                        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2">
                          {otpSentMessage}
                        </p>
                      )}
                      <Button
                        type="submit"
                        disabled={loading}
                        className={BTN_CLASS}
                      >
                        {loading ? (
                          <>
                            <Loader2
                              className="h-5 w-5 mr-2 animate-spin"
                              aria-hidden
                            />
                            Sending code...
                          </>
                        ) : (
                          "Send verification code"
                        )}
                      </Button>
                    </form>
                  )}

                  {otpStep === 2 && (
                    <form
                      onSubmit={handleResetWithOtp}
                      className="space-y-4"
                      noValidate
                    >
                      <p className="text-sm text-[#737373]">
                        Code sent to{" "}
                        <strong className="text-[#1a1a1a]">{mobile}</strong>.
                        Enter it below and set a new password.
                      </p>
                      <div className="space-y-2">
                        <label htmlFor="otp-code" className={LABEL_CLASS}>
                          6-digit code
                        </label>
                        <Input
                          id="otp-code"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(e.target.value.replace(/\D/g, ""))
                          }
                          autoComplete="one-time-code"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="otp-new-password"
                          className={LABEL_CLASS}
                        >
                          New password
                        </label>
                        <Input
                          id="otp-new-password"
                          type="password"
                          placeholder="••••••••"
                          value={otpNewPassword}
                          onChange={(e) => setOtpNewPassword(e.target.value)}
                          autoComplete="new-password"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor="otp-confirm-password"
                          className={LABEL_CLASS}
                        >
                          Confirm new password
                        </label>
                        <Input
                          id="otp-confirm-password"
                          type="password"
                          placeholder="••••••••"
                          value={otpConfirmPassword}
                          onChange={(e) =>
                            setOtpConfirmPassword(e.target.value)
                          }
                          autoComplete="new-password"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 h-11 rounded-2xl border-[#e5e5e5] text-[#737373] text-sm uppercase font-medium"
                          onClick={() => {
                            setOtpStep(1);
                            setOtpCode("");
                            setError("");
                          }}
                          disabled={loading}
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading}
                          className={`flex-1 ${BTN_CLASS}`}
                        >
                          {loading ? (
                            <>
                              <Loader2
                                className="h-5 w-5 mr-2 animate-spin"
                                aria-hidden
                              />
                              Resetting...
                            </>
                          ) : (
                            "Reset password"
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="login-canva-link text-sm text-[#737373]"
            >
              ← Back to login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
