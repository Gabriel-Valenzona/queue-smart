import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createTestDatabase, ServiceRepository } from "../../src/server/db";

describe("Area 3: Service Repository", () => {
  let db: DatabaseSync;
  let serviceRepo: ServiceRepository;

  beforeEach(() => {
    db = createTestDatabase(true);
    serviceRepo = new ServiceRepository(db);
  });

  afterEach(() => db.close());

  it("should retrieve seeded services by Service ID", () => {
    const service = serviceRepo.findById("student-services");
    assert.ok(service);
    assert.equal(service.id, "student-services");
    assert.equal(service.name, "Student services");
    assert.equal(service.description, "General student questions and support.");
    assert.equal(service.expectedDuration, 5);
    assert.equal(service.priorityLevel, "medium");
    assert.equal(service.open, true);

    // Verify alias getters for queue compatibility
    assert.equal(service.duration, 5);
    assert.equal(service.priority, "medium");
  });

  it("should create a new service with all required fields", () => {
    const created = serviceRepo.create({
      id: "financial-aid",
      name: "Financial Aid Counseling",
      description: "Assistance with scholarships, FAFSA, and tuition payments.",
      expectedDuration: 20,
      priorityLevel: "high",
      open: true,
    });

    assert.equal(created.id, "financial-aid");
    assert.equal(created.name, "Financial Aid Counseling");
    assert.equal(created.description, "Assistance with scholarships, FAFSA, and tuition payments.");
    assert.equal(created.expectedDuration, 20);
    assert.equal(created.priorityLevel, "high");
    assert.equal(created.open, true);

    const retrieved = serviceRepo.findById("financial-aid");
    assert.ok(retrieved);
    assert.equal(retrieved.name, "Financial Aid Counseling");
  });

  it("should accept alias properties 'duration' and 'priority' during creation", () => {
    const created = serviceRepo.create({
      id: "career-center",
      name: "Career Center",
      description: "Resume review and job search coaching.",
      duration: 30,
      priority: "low",
    });

    assert.equal(created.expectedDuration, 30);
    assert.equal(created.priorityLevel, "low");
  });

  it("should reject creation of service with duplicate ID", () => {
    assert.throws(
      () => {
        serviceRepo.create({
          id: "student-services",
          name: "Duplicate Service",
          description: "Duplicate description",
          expectedDuration: 10,
          priorityLevel: "low",
        });
      },
      /already exists/,
      "Expected error when inserting duplicate service ID"
    );
  });

  it("should update service fields in SQLite", () => {
    const updated = serviceRepo.update("academic-advising", {
      name: "Academic Advising & Graduation Check",
      expectedDuration: 25,
      priorityLevel: "medium",
      open: true,
    });

    assert.equal(updated.name, "Academic Advising & Graduation Check");
    assert.equal(updated.expectedDuration, 25);
    assert.equal(updated.priorityLevel, "medium");
    assert.equal(updated.open, true);

    const fromDb = serviceRepo.findById("academic-advising");
    assert.ok(fromDb);
    assert.equal(fromDb.name, "Academic Advising & Graduation Check");
    assert.equal(fromDb.open, true);
  });

  it("should toggle open/closed status via setOpen()", () => {
    const closed = serviceRepo.setOpen("technology-support", false);
    assert.equal(closed.open, false);

    const opened = serviceRepo.setOpen("technology-support", true);
    assert.equal(opened.open, true);
  });

  it("should delete service by Service ID", () => {
    const beforeCount = serviceRepo.count();
    const deleted = serviceRepo.delete("academic-advising");
    assert.equal(deleted, true);

    const afterCount = serviceRepo.count();
    assert.equal(afterCount, beforeCount - 1);

    const after = serviceRepo.findById("academic-advising");
    assert.equal(after, null);
  });

  it("should list all services", () => {
    const all = serviceRepo.listAll();
    assert.ok(all.length >= 3);
    const ids = all.map((s) => s.id);
    assert.ok(ids.includes("student-services"));
    assert.ok(ids.includes("technology-support"));
  });
});

