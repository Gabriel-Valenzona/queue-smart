/**
 * User Profile API Handler
 * Area 2: UserProfile
 * - Full name
 * - Email (foreign key or reference)
 * - Optional contact information
 * - Preferences (if applicable)
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/auth-service";
import { userProfileRepository } from "@/server/db/repositories/user-profile-repository";
import type { UserProfile, UserPreferences } from "@/server/db/types";

interface ProfileApiResponse {
  success: boolean;
  message?: string;
  profile?: UserProfile;
  errors?: Record<string, string>;
}

async function resolveUserFromRequest(request: Request): Promise<{
  email?: string;
  userId?: string;
} | null> {
  const url = new URL(request.url);
  const emailParam = url.searchParams.get("email");
  const userIdParam = url.searchParams.get("userId");

  if (emailParam) return { email: emailParam };
  if (userIdParam) return { userId: userIdParam };

  // Check Bearer authorization header
  const authHeader = request.headers.get("Authorization");
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  // Check cookies
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(/qs_session=([^;]+)/);
      if (match) token = match[1];
    }

    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get("qs_session")?.value;
      } catch {
        // Handled when called outside Next.js request store
      }
    }
  }

  if (token) {
    const verification = authService.verifySessionToken(token);
    if (verification.valid && verification.payload) {
      return {
        email: verification.payload.email,
        userId: verification.payload.userId,
      };
    }
  }

  return null;
}

/**
 * GET /api/user/profile
 * Retrieves user profile details.
 */
export async function GET(request: Request) {
  try {
    const user = await resolveUserFromRequest(request);
    if (!user || (!user.email && !user.userId)) {
      return NextResponse.json<ProfileApiResponse>(
        {
          success: false,
          message: "Authentication required to access user profile.",
        },
        { status: 401 }
      );
    }

    const profile = user.email
      ? userProfileRepository.findByEmail(user.email)
      : userProfileRepository.findByUserId(user.userId!);

    if (!profile) {
      return NextResponse.json<ProfileApiResponse>(
        {
          success: false,
          message: "User profile not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ProfileApiResponse>(
      {
        success: true,
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/user/profile:", error);
    return NextResponse.json<ProfileApiResponse>(
      {
        success: false,
        message: "An internal server error occurred while retrieving user profile.",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT / PATCH /api/user/profile
 * Updates user profile details: full name, contact information, preferences.
 */
async function handleUpdate(request: Request) {
  try {
    const user = await resolveUserFromRequest(request);
    if (!user || (!user.email && !user.userId)) {
      return NextResponse.json<ProfileApiResponse>(
        {
          success: false,
          message: "Authentication required to update user profile.",
        },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<ProfileApiResponse>(
        {
          success: false,
          message: "Malformed request payload. JSON is required.",
          errors: { _general: "Invalid JSON format." },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json<ProfileApiResponse>(
        {
          success: false,
          message: "Payload must be a JSON object.",
        },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const errors: Record<string, string> = {};

    let fullName: string | undefined;
    if (payload.fullName !== undefined) {
      if (typeof payload.fullName !== "string" || payload.fullName.trim().length === 0) {
        errors.fullName = "Full name cannot be empty.";
      } else if (payload.fullName.trim().length > 100) {
        errors.fullName = "Full name cannot exceed 100 characters.";
      } else {
        fullName = payload.fullName.trim();
      }
    }

    let contactInfo: string | null | undefined;
    if (payload.contactInfo !== undefined) {
      if (payload.contactInfo === null || payload.contactInfo === "") {
        contactInfo = null;
      } else if (typeof payload.contactInfo === "string") {
        if (payload.contactInfo.length > 200) {
          errors.contactInfo = "Contact information cannot exceed 200 characters.";
        } else {
          contactInfo = payload.contactInfo.trim();
        }
      } else {
        errors.contactInfo = "Contact information must be a string or null.";
      }
    }

    let preferences: UserPreferences | null | undefined;
    if (payload.preferences !== undefined) {
      if (payload.preferences === null) {
        preferences = null;
      } else if (typeof payload.preferences === "object") {
        preferences = payload.preferences as UserPreferences;
      } else {
        errors.preferences = "Preferences must be a JSON object or null.";
      }
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json<ProfileApiResponse>(
        {
          success: false,
          message: "Validation failed for profile updates.",
          errors,
        },
        { status: 400 }
      );
    }

    const identifier = user.email || user.userId!;
    const updated = userProfileRepository.update(identifier, {
      fullName,
      contactInfo,
      preferences,
    });

    return NextResponse.json<ProfileApiResponse>(
      {
        success: true,
        message: "Profile updated successfully.",
        profile: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json<ProfileApiResponse>(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  return handleUpdate(request);
}

export async function PATCH(request: Request) {
  return handleUpdate(request);
}

