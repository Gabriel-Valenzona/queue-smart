import { NextResponse } from "next/server";
import type { AuthApiResponse } from "@/types/auth";

export async function POST() {
  const response = NextResponse.json<AuthApiResponse>({
    success: true,
    message: "Logged out successfully.",
  });

  response.cookies.delete("qs_session");
  response.cookies.delete("qs_user");

  return response;
}
