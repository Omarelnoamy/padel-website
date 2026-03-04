/**
 * Password validation for change/reset flows.
 * Never log or return raw passwords.
 */

export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireLetter: true,
  requireNumber: true,
} as const;

export type PasswordValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (typeof password !== "string") {
    return { valid: false, message: "Invalid password" };
  }
  if (password.length < PASSWORD_RULES.minLength) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_RULES.minLength} characters`,
    };
  }
  if (password.length > PASSWORD_RULES.maxLength) {
    return {
      valid: false,
      message: `Password must be at most ${PASSWORD_RULES.maxLength} characters`,
    };
  }
  if (PASSWORD_RULES.requireLetter && !/[a-zA-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter" };
  }
  if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true };
}

export function validatePasswordMatch(
  password: string,
  confirm: string
): PasswordValidationResult {
  if (password !== confirm) {
    return { valid: false, message: "Passwords do not match" };
  }
  return { valid: true };
}
