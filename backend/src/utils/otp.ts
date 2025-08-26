// server/src/utils/otp.ts
import bcrypt from "bcryptjs";

export function genPlainOtp(len = 6) {
  const n = Math.pow(10, len - 1);
  return String(Math.floor(n + Math.random() * (9 * n)));
}
export async function hashOtp(otp: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}
export async function verifyOtp(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
