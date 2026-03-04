/**
 * OTP generation, hashing, and verification for password reset.
 * Codes are hashed before storage; never store plain OTP.
 */

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Typed access to PasswordResetOtp model (PrismaClient may not include it until types are regenerated) */
const otpDb = (prisma as unknown as { passwordResetOtp: {
  count: (args: { where: { phone: string; createdAt?: { gte: Date } } }) => Promise<number>;
  create: (args: { data: { phone: string; codeHash: string; userId: string; expiresAt: Date } }) => Promise<unknown>;
  findMany: (args: { where: Record<string, unknown>; orderBy: { createdAt: "desc" } }) => Promise<Array<{ id: string; userId: string; codeHash: string; attempts: number }>>;
  update: (args: { where: { id: string }; data: { usedAt?: Date; attempts?: number } }) => Promise<unknown>;
  updateMany: (args: { where: { phone: string; usedAt: null }; data: { usedAt: Date } }) => Promise<unknown>;
} }).passwordResetOtp;

const OTP_EXPIRY_MINUTES = 5;
const OTP_LENGTH = 6;
const MAX_VERIFY_ATTEMPTS = 5;
const SALT_ROUNDS_OTP = 10;

/** Normalize phone to digits only for storage/lookup */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Compare two phone numbers (01234567890 and 1234567890 match) */
export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (na === nb) return true;
  const strip = (s: string) => s.replace(/^0+/, "") || "0";
  return strip(na) === strip(nb);
}

/** Same canonical form for OTP storage and lookup (so 0123... and 123... match) */
function canonicalPhone(phone: string): string {
  const n = normalizePhone(phone);
  const stripped = n.replace(/^0+/, "");
  return stripped || "0";
}

/** Generate a cryptographically secure 6-digit OTP */
export function generateOtp(): string {
  const min = 100000;
  const max = 999999;
  const array = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
    return String(((array[0]! % (max - min + 1)) + min));
  }
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, SALT_ROUNDS_OTP);
}

export async function verifyOtpHash(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function getOtpExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES);
  return d;
}

/** Rate limit: max 3 OTP requests per phone per 15 minutes */
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

export async function checkOtpRateLimit(phone: string): Promise<{
  allowed: boolean;
  retryAfterSeconds?: number;
}> {
  const key = canonicalPhone(phone);
  if (!key) {
    return { allowed: false };
  }
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recent = await otpDb.count({
    where: {
      phone: key,
      createdAt: { gte: since },
    },
  });
  if (recent >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
    };
  }
  return { allowed: true };
}

export async function createOtpRecord(
  phone: string,
  userId: string,
  code: string
): Promise<void> {
  const key = canonicalPhone(phone);
  const codeHash = await hashOtp(code);
  const expiresAt = getOtpExpiry();
  await otpDb.create({
    data: {
      phone: key,
      codeHash,
      userId,
      expiresAt,
    },
  });
}

/** Invalidate all OTPs for this phone (e.g. after successful reset) */
export async function invalidateOtpsForPhone(phone: string): Promise<void> {
  const key = canonicalPhone(phone);
  await otpDb.updateMany({
    where: { phone: key, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export async function findValidOtp(
  phone: string,
  code: string
): Promise<{ userId: string } | null> {
  const key = canonicalPhone(phone);
  const now = new Date();
  const records = await otpDb.findMany({
    where: {
      phone: key,
      usedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: MAX_VERIFY_ATTEMPTS },
    },
    orderBy: { createdAt: "desc" },
  });
  for (const r of records) {
    const match = await verifyOtpHash(code, r.codeHash);
    if (match) {
      // Don't mark as used here — reset route invalidates after successful password update.
      // This lets the user retry with the same code if they only got the password wrong.
      return { userId: r.userId };
    }
    await otpDb.update({
      where: { id: r.id },
      data: { attempts: r.attempts + 1 },
    });
  }
  return null;
}

export { OTP_EXPIRY_MINUTES, MAX_VERIFY_ATTEMPTS };
