/**
 * Services API Handler
 * Area 3: Service - Stores services offered by the organization:
 * - Service ID
 * - Service name
 * - Description
 * - Expected duration
 * - Priority level
 */

import { NextResponse } from "next/server";
import { serviceRepository } from "@/server/db/repositories/service-repository";
import { getQueueStore, syncQueueServices } from "@/server/queue/store";
import type { PriorityLevel, Service } from "@/server/db/types";

interface ServiceApiResponse {
  success: boolean;
  message?: string;
  service?: Service;
  services?: Service[];
  errors?: Record<string, string>;
}

/**
 * GET /api/services
 * Returns all organization services stored in SQLite.
 */
export async function GET() {
  try {
    const services = serviceRepository.listAll();
    return NextResponse.json<ServiceApiResponse>(
      {
        success: true,
        services,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error retrieving services:", error);
    return NextResponse.json<ServiceApiResponse>(
      {
        success: false,
        message: "Failed to retrieve services.",
      },
      { status: 500 }
    );
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
      return NextResponse.json<ServiceApiResponse>(
        {
          success: false,
          message: "Malformed request payload. JSON is required.",
          errors: { _general: "Invalid JSON body." },
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json<ServiceApiResponse>(
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
    const rawId = payload.id || payload.serviceId;
    if (typeof rawId !== "string" || rawId.trim().length === 0) {
      errors.id = "Service ID is required.";
    } else if (!/^[a-zA-Z0-9-_]+$/.test(rawId.trim())) {
      errors.id = "Service ID must be alphanumeric and may contain hyphens or underscores.";
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
    if (rawDuration === undefined || rawDuration === null || isNaN(durationNum) || durationNum <= 0) {
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

    if (Object.keys(errors).length > 0) {
      return NextResponse.json<ServiceApiResponse>(
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
      return NextResponse.json<ServiceApiResponse>(
        {
          success: false,
          message: `Service with ID "${serviceId}" already exists.`,
          errors: { id: "A service with this ID already exists." },
        },
        { status: 409 }
      );
    }

    const open = payload.open !== undefined ? Boolean(payload.open) : true;

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

    return NextResponse.json<ServiceApiResponse>(
      {
        success: true,
        message: "Service created successfully.",
        service: created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json<ServiceApiResponse>(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error.",
      },
      { status: 500 }
    );
  }
}
