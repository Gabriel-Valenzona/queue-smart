import { moduleHandler } from "@/server/modules/http";
import { validateId } from "@/server/queue/validation";
/**
 * Single Service API Handler
 * GET, PUT, PATCH, DELETE for a specific service in SQLite
 */

import { serviceResponse, serviceFailure } from "@/server/services/http";
import { serviceRepository } from "@/server/db/repositories/service-repository";
import { getQueueStore, syncQueueServices } from "@/server/queue/store";
import type { PriorityLevel } from "@/server/db/types";


type RouteContext = {
  params: Promise<{ serviceId: string }>;
};

/**
 * GET /api/services/[serviceId]
 */
export async function GET(
  request: Request,
  ctx: RouteContext
) {
  return moduleHandler(request, async () => {
    try {
      const { serviceId } = await ctx.params;
      validateId(serviceId, "serviceId");
      const service = serviceRepository.findById(serviceId);

      if (!service) {
        return serviceResponse(
          {
            success: false,
            message: `Service with ID "${serviceId}" was not found.`,
          },
          { status: 404 }
        );
      }

      return serviceResponse(
        {
          success: true,
          service,
        },
        { status: 200 }
      );
    } catch (error) {
      return serviceFailure(error);
    }
  }, false);
}

/**
 * PUT / PATCH /api/services/[serviceId]
 */
export async function PUT(
  request: Request,
  ctx: RouteContext
) {
  return moduleHandler(request, () => handleUpdate(request, ctx), true);
}

export async function PATCH(
  request: Request,
  ctx: RouteContext
) {
  return moduleHandler(request, () => handleUpdate(request, ctx), true);
}

async function handleUpdate(
  request: Request,
  ctx: RouteContext
) {
  try {
    const { serviceId } = await ctx.params;
    validateId(serviceId, "serviceId");
    const existing = serviceRepository.findById(serviceId);

    if (!existing) {
      return serviceResponse(
        {
          success: false,
          message: `Service with ID "${serviceId}" was not found.`,
        },
        { status: 404 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return serviceResponse(
        {
          success: false,
          message: "Malformed request payload. JSON is required.",
          errors: { _general: "Invalid JSON format." },
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

    let name: string | undefined;
    if (payload.name !== undefined || payload.serviceName !== undefined) {
      const rawName = payload.name !== undefined ? payload.name : payload.serviceName;
      if (typeof rawName !== "string" || rawName.trim().length === 0) {
        errors.name = "Service name cannot be empty.";
      } else if (rawName.trim().length > 100) {
        errors.name = "Service name cannot exceed 100 characters.";
      } else {
        name = rawName.trim();
      }
    }

    let description: string | undefined;
    if (payload.description !== undefined) {
      if (typeof payload.description !== "string" || payload.description.trim().length === 0) {
        errors.description = "Description cannot be empty.";
      } else if (payload.description.trim().length > 500) {
        errors.description = "Description cannot exceed 500 characters.";
      } else {
        description = payload.description.trim();
      }
    }

    let expectedDuration: number | undefined;
    const rawDuration =
      payload.expectedDuration !== undefined ? payload.expectedDuration : payload.duration;
    if (rawDuration !== undefined) {
      const durNum = Number(rawDuration);
      if (isNaN(durNum) || durNum <= 0 || !Number.isInteger(durNum)) {
        errors.expectedDuration = "Expected duration must be a positive whole number of minutes.";
      } else {
        expectedDuration = durNum;
      }
    }

    let priorityLevel: PriorityLevel | undefined;
    const rawPriority =
      payload.priorityLevel !== undefined ? payload.priorityLevel : payload.priority;
    if (rawPriority !== undefined) {
      const prioStr = typeof rawPriority === "string" ? rawPriority.trim().toLowerCase() : "";
      if (!["low", "medium", "high"].includes(prioStr)) {
        errors.priorityLevel = "Priority level must be 'low', 'medium', or 'high'.";
      } else {
        priorityLevel = prioStr as PriorityLevel;
      }
    }

    if (payload.open !== undefined && typeof payload.open !== "boolean")
      errors.open = "open must be a boolean.";
    const open = payload.open as boolean | undefined;

    if (Object.keys(errors).length > 0) {
      return serviceResponse(
        {
          success: false,
          message: "Validation failed.",
          errors,
        },
        { status: 400 }
      );
    }

    const updated = serviceRepository.update(serviceId, {
      name,
      description,
      expectedDuration,
      priorityLevel,
      open,
    });

    syncQueueServices(getQueueStore());

    return serviceResponse(
      {
        success: true,
        message: "Service updated successfully.",
        service: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    return serviceFailure(error);
  }
}

/**
 * DELETE /api/services/[serviceId]
 */
export async function DELETE(
  request: Request,
  ctx: RouteContext
) {
  return moduleHandler(request, async () => {
    try {
      const { serviceId } = await ctx.params;
      validateId(serviceId, "serviceId");
      const existing = serviceRepository.findById(serviceId);

      if (!existing) {
        return serviceResponse(
          {
            success: false,
            message: `Service with ID "${serviceId}" was not found.`,
          },
          { status: 404 }
        );
      }

      serviceRepository.delete(serviceId);

      syncQueueServices(getQueueStore());

      return serviceResponse(
        {
          success: true,
          message: `Service "${serviceId}" was deleted successfully.`,
        },
        { status: 200 }
      );
    } catch (error) {
      return serviceFailure(error);
    }
  }, true);
}
