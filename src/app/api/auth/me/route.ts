import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authService } from "@/lib/auth/auth-service";
import type { AuthApiResponse } from "@/types/auth";

export async function GET(request: Request) {
  try {
    // Check Authorization header first
    const authHeader = request.headers.get("Authorization");
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    // Fall back to cookie
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
          // Handled gracefully when called in test runner outside Next.js request store
        }
      }
    }

    if (!token) {
      return NextResponse.json<AuthApiResponse>(
        {
          success: false,
          message: "No active authentication session.",
        },
        { status: 401 }
      );
    }

    const verification = authService.verifySessionToken(token);
    if (!verification.valid || !verification.payload) {
      return NextResponse.json<AuthApiResponse>(
        {
          success: false,
          message: "Invalid or expired session token.",
        },
        { status: 401 }
      );
    }

    const user = await authService.getUserById(verification.payload.userId);
    if (!user) {
      return NextResponse.json<AuthApiResponse>(
        {
          success: false,
          message: "User session exists but account could not be found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json<AuthApiResponse>({
      success: true,
      message: "Session is active.",
      user,
      redirectUrl: user.role === "admin" ? "/admin" : "/user",
    });
  } catch (error) {
    console.error("Unhandled error in /api/auth/me:", error);
    return NextResponse.json<AuthApiResponse>(
      {
        success: false,
        message: "An internal server error occurred while retrieving session.",
      },
      { status: 500 }
    );
  }
}
