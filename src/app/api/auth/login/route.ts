import { NextResponse } from "next/server";
import { authService } from "@/lib/auth/auth-service";
import type { AuthApiResponse } from "@/types/auth";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json<AuthApiResponse>(
        {
          success: false,
          message: "Malformed request payload. JSON is required.",
          errors: { _general: "Malformed JSON body." },
        },
        { status: 400 }
      );
    }

    const result = await authService.authenticateUser(body);

    const response = NextResponse.json<AuthApiResponse>(
      {
        success: result.success,
        message: result.message,
        user: result.user,
        token: result.token,
        redirectUrl: result.redirectUrl,
        errors: result.errors,
      },
      { status: result.statusCode }
    );

    if (result.success && result.token && result.user) {
      response.cookies.set("qs_session", result.token, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
      });
      response.cookies.set("qs_user", JSON.stringify(result.user), {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24,
      });
    }

    return response;
  } catch (error) {
    console.error("Unhandled error in /api/auth/login:", error);
    return NextResponse.json<AuthApiResponse>(
      {
        success: false,
        message: "An internal server error occurred while processing authentication.",
      },
      { status: 500 }
    );
  }
}
