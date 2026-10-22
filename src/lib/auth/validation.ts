import type { RegisterPayload, LoginPayload, ValidationResult, UserRole } from "@/types/auth";

/** RFC 5322 compliant simplified email regex */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const VALID_ROLES: readonly UserRole[] = ["user", "admin"] as const;

export const LIMITS = {
  EMAIL_MAX_LENGTH: 254,
  EMAIL_MIN_LENGTH: 3,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MAX_LENGTH: 100,
} as const;

/**
 * Validates user registration payload.
 * Enforces required fields, types, length boundaries, and formats.
 */
export function validateRegisterInput(payload: unknown): ValidationResult {
  const errors: Record<string, string> = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: { _general: "Request body must be a valid JSON object." },
    };
  }

  const { name, email, password, confirmPassword, role } = payload as RegisterPayload;

  // 1. Email Validations
  if (email === undefined || email === null || email === "") {
    errors.email = "Email address is required.";
  } else if (typeof email !== "string") {
    errors.email = "Email must be a string.";
  } else {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      errors.email = "Email address cannot be empty.";
    } else if (trimmedEmail.length > LIMITS.EMAIL_MAX_LENGTH) {
      errors.email = `Email address cannot exceed ${LIMITS.EMAIL_MAX_LENGTH} characters.`;
    } else if (trimmedEmail.length < LIMITS.EMAIL_MIN_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address format (e.g. user@example.com).";
    }
  }

  // 2. Password Validations
  if (password === undefined || password === null || password === "") {
    errors.password = "Password is required.";
  } else if (typeof password !== "string") {
    errors.password = "Password must be a string.";
  } else {
    if (password.length < LIMITS.PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${LIMITS.PASSWORD_MIN_LENGTH} characters long.`;
    } else if (password.length > LIMITS.PASSWORD_MAX_LENGTH) {
      errors.password = `Password cannot exceed ${LIMITS.PASSWORD_MAX_LENGTH} characters.`;
    }
  }

  // 3. Confirm Password (if supplied or checked)
  if (confirmPassword !== undefined && confirmPassword !== null) {
    if (typeof confirmPassword !== "string") {
      errors.confirmPassword = "Confirm password must be a string.";
    } else if (confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }
  }

  // 4. Name Validations (optional, but typed and bounded if provided)
  if (name !== undefined && name !== null && name !== "") {
    if (typeof name !== "string") {
      errors.name = "Name must be a string.";
    } else if (name.trim().length > LIMITS.NAME_MAX_LENGTH) {
      errors.name = `Name cannot exceed ${LIMITS.NAME_MAX_LENGTH} characters.`;
    }
  }

  // 5. Role Validations (defaults to 'user', must match 'user' | 'admin' if supplied)
  if (role !== undefined && role !== null && role !== "") {
    if (typeof role !== "string") {
      errors.role = "Role must be a string.";
    } else if (!VALID_ROLES.includes(role.toLowerCase() as UserRole)) {
      errors.role = "Role must be either 'user' or 'admin'.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validates user login payload.
 * Enforces required fields, types, and length bounds.
 */
export function validateLoginInput(payload: unknown): ValidationResult {
  const errors: Record<string, string> = {};

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      valid: false,
      errors: { _general: "Request body must be a valid JSON object." },
    };
  }

  const { email, password } = payload as LoginPayload;

  // 1. Email Validations
  if (email === undefined || email === null || email === "") {
    errors.email = "Email address is required.";
  } else if (typeof email !== "string") {
    errors.email = "Email must be a string.";
  } else {
    const trimmedEmail = email.trim();
    if (trimmedEmail.length === 0) {
      errors.email = "Email address cannot be empty.";
    } else if (trimmedEmail.length > LIMITS.EMAIL_MAX_LENGTH) {
      errors.email = `Email address cannot exceed ${LIMITS.EMAIL_MAX_LENGTH} characters.`;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Enter a valid email address format.";
    }
  }

  // 2. Password Validations
  if (password === undefined || password === null || password === "") {
    errors.password = "Password is required.";
  } else if (typeof password !== "string") {
    errors.password = "Password must be a string.";
  } else if (password.length > LIMITS.PASSWORD_MAX_LENGTH) {
    errors.password = `Password cannot exceed ${LIMITS.PASSWORD_MAX_LENGTH} characters.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
