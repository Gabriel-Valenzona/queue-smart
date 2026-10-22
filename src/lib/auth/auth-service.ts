import crypto from "node:crypto";
import type {
  User,
  StoredUser,
  UserRole,
  AuthServiceResult,
  RegisterPayload,
  LoginPayload,
} from "@/types/auth";
import { validateRegisterInput, validateLoginInput } from "./validation";
import { UserStore, userStore as defaultStore } from "./user-store";
import { generateSalt, hashPassword, verifyPassword } from "./crypto";

const SESSION_SECRET =
  process.env.AUTH_SECRET || "queuesmart_dev_session_secret_2026_cosc4353";

export class AuthService {
  private store: UserStore;

  constructor(store: UserStore = defaultStore) {
    this.store = store;
  }

  /**
   * Sanitizes a StoredUser into a public User object, stripping sensitive hashes and salts.
   */
  public sanitizeUser(stored: StoredUser): User {
    return {
      id: stored.id,
      name: stored.name,
      email: stored.email,
      role: stored.role,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    };
  }

  /**
   * Generates a signed session token containing user metadata and an HMAC signature.
   */
  public createSessionToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      issuedAt: Date.now(),
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verifies and decodes a signed session token.
   */
  public verifySessionToken(token: string): {
    valid: boolean;
    payload?: { userId: string; email: string; name: string; role: UserRole; issuedAt: number };
  } {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      return { valid: false };
    }
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) {
      return { valid: false };
    }

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    try {
      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedSignature);
      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return { valid: false };
      }

      const decoded = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf-8")
      );
      return { valid: true, payload: decoded };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Registers a new user account with validations, duplicate checks, and role assignment.
   */
  public async registerUser(payload: unknown): Promise<AuthServiceResult> {
    // 1. Validate payload
    const validation = validateRegisterInput(payload);
    if (!validation.valid) {
      return {
        success: false,
        statusCode: 400,
        message: "Validation failed. Please correct the highlighted errors.",
        errors: validation.errors,
      };
    }

    const data = payload as RegisterPayload;
    const email = String(data.email).trim().toLowerCase();
    const password = String(data.password);
    const role: UserRole =
      typeof data.role === "string" && (data.role.toLowerCase() === "admin" || data.role.toLowerCase() === "user")
        ? (data.role.toLowerCase() as UserRole)
        : "user";

    // Format display name or derive from email
    let name = typeof data.name === "string" && data.name.trim().length > 0
      ? data.name.trim()
      : email.split("@")[0]
          .split(/[._-]/)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

    if (!name) name = role === "admin" ? "Administrator" : "QueueSmart User";

    // 2. Check for duplicate registration
    const existing = await this.store.findByEmail(email);
    if (existing) {
      return {
        success: false,
        statusCode: 409,
        message: "An account with this email address already exists.",
        errors: {
          email: "This email address is already registered. Please log in instead.",
        },
      };
    }

    // 3. Hash password and store user
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const storedUser = await this.store.create({
      name,
      email,
      role,
      passwordHash,
      salt,
    });

    const user = this.sanitizeUser(storedUser);
    const token = this.createSessionToken(user);
    const redirectUrl = role === "admin" ? "/admin" : "/user";

    return {
      success: true,
      statusCode: 201,
      message: `Account created successfully as ${role === "admin" ? "Administrator" : "User"}.`,
      user,
      token,
      redirectUrl,
    };
  }

  /**
   * Authenticates user credentials and returns session data and role-based redirect URL.
   */
  public async authenticateUser(payload: unknown): Promise<AuthServiceResult> {
    // 1. Validate input format
    const validation = validateLoginInput(payload);
    if (!validation.valid) {
      return {
        success: false,
        statusCode: 400,
        message: "Validation failed. Please enter your email and password.",
        errors: validation.errors,
      };
    }

    const data = payload as LoginPayload;
    const email = String(data.email).trim().toLowerCase();
    const password = String(data.password);

    // 2. Lookup user by email
    const storedUser = await this.store.findByEmail(email);
    if (!storedUser) {
      return {
        success: false,
        statusCode: 401,
        message: "Invalid email or password.",
        errors: {
          _general: "Invalid email or password. Please verify your credentials and try again.",
        },
      };
    }

    // 3. Verify password
    const matches = verifyPassword(password, storedUser.passwordHash, storedUser.salt);
    if (!matches) {
      return {
        success: false,
        statusCode: 401,
        message: "Invalid email or password.",
        errors: {
          _general: "Invalid email or password. Please verify your credentials and try again.",
        },
      };
    }

    // 4. Build response & session token
    const user = this.sanitizeUser(storedUser);
    const token = this.createSessionToken(user);
    const redirectUrl = user.role === "admin" ? "/admin" : "/user";

    return {
      success: true,
      statusCode: 200,
      message: `Welcome back, ${user.name}!`,
      user,
      token,
      redirectUrl,
    };
  }

  /**
   * Retrieves a sanitized user by their unique ID.
   */
  public async getUserById(id: string): Promise<User | null> {
    const stored = await this.store.findById(id);
    return stored ? this.sanitizeUser(stored) : null;
  }
}

export const authService = new AuthService(defaultStore);
