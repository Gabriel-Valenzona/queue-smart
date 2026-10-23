import { GET as getSession } from "@/app/api/auth/me/route";
import type { AuthApiResponse, User } from "@/types/auth";
import { errorResponse } from "@/server/queue/http";
import { ModuleError } from "./errors";

/** Delegate session verification to the existing auth handler, without an HTTP hop. */
export async function moduleHandler(
  request: Request,
  run: (user: User) => Response | Promise<Response>,
  administratorOnly = false,
): Promise<Response> {
  let response: Response;
  try {
    const session = await getSession(request);
    if (session.status === 401 || session.status === 404)
      throw new ModuleError(401, "unauthenticated", "Sign in to continue.");
    if (!session.ok) throw new Error("Session verification failed.");
    const body: AuthApiResponse = await session.json();
    if (!body.success || !body.user)
      throw new Error("Session response did not contain an account.");
    if (administratorOnly && body.user.role !== "admin")
      throw new ModuleError(
        403,
        "forbidden",
        "Administrator access is required.",
      );
    response = await run(body.user);
  } catch (error) {
    response =
      error instanceof ModuleError
        ? Response.json(
            { error: { code: error.code, message: error.message } },
            { status: error.status },
          )
        : errorResponse(error);
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
