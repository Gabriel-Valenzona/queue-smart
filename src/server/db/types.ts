/**
 * QueueSmart SQLite Database Layer Types
 * Focus Areas: UserProfile & Service
 */

import type { UserRole } from "@/types/auth";

export type PriorityLevel = "low" | "medium" | "high";

/**
 * User Preferences structure (stored as JSON in SQLite)
 */
export interface UserPreferences {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  pushNotifications?: boolean;
  theme?: "light" | "dark" | "system";
  language?: string;
  [key: string]: unknown;
}

/**
 * Area 2: UserProfile
 * Stores user-related details:
 * - Full name
 * - Email (foreign key or reference)
 * - Optional contact information
 * - Preferences (if applicable)
 */
export interface UserProfile {
  id: string;
  userId: string;
  /** Foreign key referencing users(email) */
  email: string;
  /** Full name of the user */
  fullName: string;
  /** Optional contact information (e.g. phone number, secondary contact info) */
  contactInfo: string | null;
  /** Preferences (if applicable) */
  preferences: UserPreferences | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProfileInput {
  id?: string;
  userId: string;
  email: string;
  fullName: string;
  contactInfo?: string | null;
  preferences?: UserPreferences | string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateUserProfileInput {
  fullName?: string;
  contactInfo?: string | null;
  preferences?: UserPreferences | string | null;
  updatedAt?: string;
}

/**
 * Area 3: Service
 * Stores services offered by the organization:
 * - Service ID
 * - Service name
 * - Description
 * - Expected duration (in minutes)
 * - Priority level ('low' | 'medium' | 'high')
 */
export interface Service {
  /** Service ID */
  id: string;
  /** Service name */
  name: string;
  /** Description */
  description: string;
  /** Expected duration (minutes) */
  expectedDuration: number;
  /** Priority level */
  priorityLevel: PriorityLevel;
  /** Whether the service queue is open */
  open: boolean;
  createdAt: string;
  updatedAt: string;

  /** Alias getters for queue-service compatibility */
  duration: number;
  priority: PriorityLevel;
}

export interface CreateServiceInput {
  id: string;
  name: string;
  description: string;
  /** Expected duration in minutes (accepts expectedDuration or duration) */
  expectedDuration?: number;
  duration?: number;
  /** Priority level (accepts priorityLevel or priority) */
  priorityLevel?: PriorityLevel;
  priority?: PriorityLevel;
  open?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  expectedDuration?: number;
  duration?: number;
  priorityLevel?: PriorityLevel;
  priority?: PriorityLevel;
  open?: boolean;
  updatedAt?: string;
}

/**
 * Stored User Account in SQLite (parent table for user credentials and email foreign key)
 */
export interface DbUserAccount {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDbUserInput {
  id?: string;
  name: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  salt: string;
  contactInfo?: string | null;
  preferences?: UserPreferences | null;
  createdAt?: string;
  updatedAt?: string;
}

