import { randomUUID } from "node:crypto";
/**
 * Services API Handler
 * Area 3: Service - Stores services offered by the organization:
 * - Service ID
 * - Service name
 * - Description
 * - Expected duration
 * - Priority level
 */

import { serviceResponse, serviceFailure } from "@/server/services/http";
import { serviceRepository } from "@/server/db/repositories/service-repository";
import { getQueueStore, syncQueueServices } from "@/server/queue/store";
import type { PriorityLevel } from "@/server/db/types";


/**
 * GET /api/services
 * Returns all organization services stored in SQLite.
 */
export async function GET(_request?: Request) {
  try {
    const services = serviceRepository.listAll();
    return serviceResponse(
      {
        success: true,
        services,
      },
      { status: 200 }
    );
  } catch (error) {
    return serviceFailure(error);
  }
}

/**
 * POST /api/services
 * Creates a new service in SQLite.
 * Validates: Service ID, Service name, Description, Expected duration, Priority level.
 */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return serviceResponse(
        {
          success: false,
          message: "Malformed request payload. JSON is required.",
          errors: { _general: "Invalid JSON body." },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return serviceResponse(
        {
          success: false,
          message: "Payload must be a JSON object.",
        },
        { status: 400 }
      );
    }

    const payload = body as Record<string, unknown>;
    const errors: Record<string, string> = {};

    // 1. Service ID
    const rawId = payload.id !== undefined ? payload.id
      : payload.serviceId !== undefined ? payload.serviceId : `service-${randomUUID()}`;
    if (typeof rawId !== "string" || !rawId.trim() || rawId.trim().length > 64 || !/^[a-zA-Z0-9_-]+$/.test(rawId.trim())) {
      errors.id = "Service ID must use 1–64 letters, numbers, hyphens, or underscores.";
    }

    // 2. Service name
    const rawName = payload.name || payload.serviceName;
    if (typeof rawName !== "string" || rawName.trim().length === 0) {
      errors.name = "Service name is required.";
    } else if (rawName.trim().length > 100) {
      errors.name = "Service name cannot exceed 100 characters.";
    }

    // 3. Description
    const rawDescription = payload.description;
    if (typeof rawDescription !== "string" || rawDescription.trim().length === 0) {
      errors.description = "Description is required.";
    } else if (rawDescription.trim().length > 500) {
      errors.description = "Description cannot exceed 500 characters.";
    }

    // 4. Expected duration
    const rawDuration =
      payload.expectedDuration !== undefined ? payload.expectedDuration : payload.duration;
    const durationNum = Number(rawDuration);
    if (rawDuration === undefined || rawDuration === null || !Number.isFinite(durationNum) || durationNum <= 0) {
      errors.expectedDuration = "Expected duration must be a positive integer number of minutes.";
    } else if (!Number.isInteger(durationNum)) {
      errors.expectedDuration = "Expected duration must be a whole number of minutes.";
    }

    // 5. Priority level
    const rawPriority =
      payload.priorityLevel !== undefined ? payload.priorityLevel : payload.priority;
    const priorityStr = typeof rawPriority === "string" ? rawPriority.trim().toLowerCase() : "";
    if (!["low", "medium", "high"].includes(priorityStr)) {
      errors.priorityLevel = "Priority level must be 'low', 'medium', or 'high'.";
    }

    if (payload.open !== undefined && typeof payload.open !== "boolean")
      errors.open = "open must be a boolean.";

    if (Object.keys(errors).length > 0) {
      return serviceResponse(
        {
          success: false,
          message: "Validation failed. Please correct the highlighted errors.",
          errors,
        },
        { status: 400 }
      );
    }

    const serviceId = String(rawId).trim();
    const existing = serviceRepository.findById(serviceId);
    if (existing) {
      return serviceResponse(
        {
          success: false,
          message: `Service with ID "${serviceId}" already exists.`,
          errors: { id: "A service with this ID already exists." },
        },
        { status: 409 }
      );
    }

    const open = payload.open === true;

    const created = serviceRepository.create({
      id: serviceId,
      name: String(rawName).trim(),
      description: String(rawDescription).trim(),
      expectedDuration: durationNum,
      priorityLevel: priorityStr as PriorityLevel,
      open,
    });

    // Synchronize queue runtime store
    try {
      syncQueueServices(getQueueStore());
    } catch {
      // Handled if in test or decoupled
    }

    return serviceResponse(
      {
        success: true,
        message: "Service created successfully.",
        service: created,
      },
      { status: 201 }
    );
  } catch (error) {
    return serviceFailure(error);
  }
}
