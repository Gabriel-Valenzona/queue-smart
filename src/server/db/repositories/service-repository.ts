/**
 * Service Repository
 * Area 3: Service - Stores services offered by the organization:
 * - Service ID
 * - Service name
 * - Description
 * - Expected duration
 * - Priority level
 */

import type { DatabaseSync } from "node:sqlite";
import { getDatabase } from "../connection";
import { SEED_SERVICES } from "../schema";
import type {
  CreateServiceInput,
  PriorityLevel,
  Service,
  UpdateServiceInput,
} from "../types";

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  expected_duration: number;
  priority_level: PriorityLevel;
  open: number;
  created_at: string;
  updated_at: string;
}

function rowToService(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    expectedDuration: row.expected_duration,
    priorityLevel: row.priority_level,
    open: Boolean(row.open),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Interoperability aliases
    duration: row.expected_duration,
    priority: row.priority_level,
  };
}

export class ServiceRepository {
  private db: DatabaseSync;

  constructor(db?: DatabaseSync) {
    this.db = db || getDatabase();
  }

  /**
   * Finds a service by its Service ID.
   */
  public findById(id: string): Service | null {
    const row = this.db
      .prepare(
        `SELECT id, name, description, expected_duration, priority_level, open, created_at, updated_at
         FROM services
         WHERE id = ?`
      )
      .get(id) as ServiceRow | undefined;

    return row ? rowToService(row) : null;
  }

  /**
   * Lists all services offered by the organization.
   */
  public listAll(): Service[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, description, expected_duration, priority_level, open, created_at, updated_at
         FROM services
         ORDER BY rowid ASC`
      )
      .all() as ServiceRow[];

    return rows.map(rowToService);
  }

  /**
   * Creates and stores a new service in SQLite.
   * Requires: Service ID, Service name, Description, Expected duration, Priority level.
   */
  public create(data: CreateServiceInput): Service {
    const id = data.id.trim();
    if (!id) {
      throw new Error("Service ID is required.");
    }

    const name = data.name.trim();
    if (!name) {
      throw new Error("Service name is required.");
    }

    const description = data.description.trim();

    const expectedDuration =
      data.expectedDuration !== undefined
        ? data.expectedDuration
        : data.duration !== undefined
        ? data.duration
        : 10;

    if (typeof expectedDuration !== "number" || expectedDuration <= 0) {
      throw new Error("Expected duration must be a positive number of minutes.");
    }

    const priorityLevel = (
      data.priorityLevel || data.priority || "medium"
    ).toLowerCase() as PriorityLevel;

    if (!["low", "medium", "high"].includes(priorityLevel)) {
      throw new Error("Priority level must be 'low', 'medium', or 'high'.");
    }

    const open = data.open !== undefined ? (data.open ? 1 : 0) : 1;
    const now = data.createdAt || new Date().toISOString();

    const existing = this.findById(id);
    if (existing) {
      throw new Error(`Service with ID "${id}" already exists.`);
    }

    this.db
      .prepare(
        `INSERT INTO services (id, name, description, expected_duration, priority_level, open, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        name,
        description,
        expectedDuration,
        priorityLevel,
        open,
        now,
        data.updatedAt || now
      );

    const created = this.findById(id);
    if (!created) {
      throw new Error(`Failed to retrieve newly created service with id: ${id}`);
    }
    return created;
  }

  /**
   * Updates an existing service in SQLite.
   */
  public update(id: string, data: UpdateServiceInput): Service {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Service not found for ID "${id}"`);
    }

    const now = data.updatedAt || new Date().toISOString();
    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const description =
      data.description !== undefined
        ? data.description.trim()
        : existing.description;

    let expectedDuration = existing.expectedDuration;
    if (data.expectedDuration !== undefined) {
      expectedDuration = data.expectedDuration;
    } else if (data.duration !== undefined) {
      expectedDuration = data.duration;
    }

    let priorityLevel = existing.priorityLevel;
    if (data.priorityLevel !== undefined) {
      priorityLevel = data.priorityLevel.toLowerCase() as PriorityLevel;
    } else if (data.priority !== undefined) {
      priorityLevel = data.priority.toLowerCase() as PriorityLevel;
    }

    const open =
      data.open !== undefined ? (data.open ? 1 : 0) : existing.open ? 1 : 0;

    this.db
      .prepare(
        `UPDATE services
         SET name = ?,
             description = ?,
             expected_duration = ?,
             priority_level = ?,
             open = ?,
             updated_at = ?
         WHERE id = ?`
      )
      .run(name, description, expectedDuration, priorityLevel, open, now, id);

    const updated = this.findById(id);
    if (!updated) {
      throw new Error(`Failed to retrieve updated service for id: ${id}`);
    }
    return updated;
  }

  /**
   * Toggles or sets open/closed status for a service.
   */
  public setOpen(id: string, open: boolean): Service {
    return this.update(id, { open });
  }

  /**
   * Deletes a service from SQLite.
   */
  public delete(id: string): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    const result = this.db
      .prepare(`DELETE FROM services WHERE id = ?`)
      .run(id);

    return result.changes > 0;
  }

  /**
   * Returns total count of services.
   */
  public count(): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM services`)
      .get() as { count: number };
    return result?.count || 0;
  }

  /**
   * Seeds default organization services if empty.
   */
  public seedDefaultServices(): void {
    const insertService = this.db.prepare(`
      INSERT OR IGNORE INTO services (id, name, description, expected_duration, priority_level, open, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const service of SEED_SERVICES) {
      insertService.run(
        service.id,
        service.name,
        service.description,
        service.expectedDuration,
        service.priorityLevel,
        service.open ? 1 : 0,
        service.createdAt,
        service.updatedAt
      );
    }
  }
}

export const serviceRepository = new ServiceRepository();
