/**
 * QueueSmart Authentication & Role Types
 * Assignment 3 - Backend Development & API Implementation
 */

export type UserRole = "user" | "admin";

/** Public-facing user profile (safe to return to clients / front-end) */
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** In-memory stored user record with secure password hash and salt */
export interface StoredUser extends User {
  passwordHash: string;
  salt: string;
}

/** Expected payload for user registration */
export interface RegisterPayload {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  confirmPassword?: unknown;
  role?: unknown;
}

/** Expected payload for user login */
export interface LoginPayload {
  email?: unknown;
  password?: unknown;
}

/** Detailed validation error structure */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/** Validation result returned by backend validation rules */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/** Standard backend API response structure */
export interface AuthApiResponse {
  success: boolean;
  message: string;
  user?: User;
  token?: string;
  redirectUrl?: string;
  errors?: Record<string, string>;
}

/** Internal service operation result */
export interface AuthServiceResult {
  success: boolean;
  statusCode: number;
  message: string;
  user?: User;
  token?: string;
  redirectUrl?: string;
  errors?: Record<string, string>;
}
