import { QueueError } from "./errors";

/** Parses a JSON request body, turning malformed JSON into a 400 error. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new QueueError("invalid_json", "Request body must be valid JSON.");
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof QueueError)
    return Response.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status },
    );
  console.error(error);
  return Response.json(
    { error: { code: "internal_error", message: "Something went wrong." } },
    { status: 500 },
  );
}

/** Runs a route handler body and converts thrown errors into JSON responses. */
export async function handle(run: () => Response | Promise<Response>) {
  try {
    return await run();
  } catch (error) {
    return errorResponse(error);
  }
}
