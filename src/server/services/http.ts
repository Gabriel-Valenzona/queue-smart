import { NextResponse } from "next/server";
import type { Service } from "@/server/db/types";
import { QueueError } from "@/server/queue/errors";

type ServiceResponse = {
  success: boolean;
  message?: string;
  service?: Service;
  services?: Service[];
  errors?: Record<string, string>;
};

/** Preserve the SQLite API contract and expose errors understood by ServiceEditor. */
export function serviceResponse(body: ServiceResponse, init: { status: number }) {
  if (body.success) return NextResponse.json(body, init);
  const fields = { ...body.errors };
  if (fields.expectedDuration) fields.duration = fields.expectedDuration;
  if (fields.priorityLevel) fields.priority = fields.priorityLevel;
  const code = body.errors?._general ? "invalid_json"
    : init.status === 400 ? "validation_error"
    : init.status === 404 ? "service_not_found"
    : init.status === 409 && /queue or retained history/i.test(body.message ?? "") ? "service_in_use"
    : init.status === 409 ? "duplicate_service"
    : "internal_error";
  return NextResponse.json({ ...body, error: { code, message: body.message, fields } }, init);
}

export function serviceFailure(error: unknown) {
  if (error instanceof QueueError)
    return serviceResponse({ success: false, message: error.message, errors: error.fields }, { status: error.status });
  console.error(error);
  return serviceResponse({ success: false, message: "The service request could not be completed." }, { status: 500 });
}
