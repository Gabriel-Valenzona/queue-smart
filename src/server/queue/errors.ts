export type QueueErrorCode =
  | "validation_error"
  | "invalid_json"
  | "service_not_found"
  | "entry_not_found"
  | "queue_closed"
  | "already_in_queue"
  | "queue_empty"
  | "invalid_move";

const statusByCode: Record<QueueErrorCode, number> = {
  validation_error: 400,
  invalid_json: 400,
  service_not_found: 404,
  entry_not_found: 404,
  queue_closed: 409,
  already_in_queue: 409,
  queue_empty: 409,
  invalid_move: 409,
};

/** A business-rule or validation failure that maps to an HTTP error response. */
export class QueueError extends Error {
  readonly status: number;

  constructor(
    readonly code: QueueErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "QueueError";
    this.status = statusByCode[code];
  }
}
