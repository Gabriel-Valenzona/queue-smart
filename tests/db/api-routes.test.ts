import { beforeEach, describe, it } from "vitest";
import assert from "node:assert/strict";
import { GET as getProfileHandler, PUT as putProfileHandler } from "../../src/app/api/user/profile/route";
import { GET as getServicesHandler, POST as postServicesHandler } from "../../src/app/api/services/route";
import {
  GET as getSingleServiceHandler,
  PUT as putSingleServiceHandler,
  DELETE as deleteSingleServiceHandler,
} from "../../src/app/api/services/[serviceId]/route";
import { authService } from "../../src/lib/auth/auth-service";

import { getDatabase, seedDatabase } from "../../src/server/db";
import { resetQueueStore } from "../../src/server/queue/store";

beforeEach(() => {
  const db = getDatabase();
  db.exec(`DELETE FROM queue_entries; DELETE FROM queues;
    DELETE FROM notifications; DELETE FROM user_profiles;
    DELETE FROM user_credentials; DELETE FROM services;`);
  seedDatabase(db);
  resetQueueStore();
});

describe("Database Backend API Routes - UserProfile & Service", () => {
  describe("UserProfile API: /api/user/profile", () => {
    it("should return 401 when no session or query param is provided", async () => {
      const request = new Request("http://localhost:3000/api/user/profile", {
        method: "GET",
      });

      const response = await getProfileHandler(request);
      assert.equal(response.status, 401);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.message?.includes("Authentication required"));
    });

    it("should retrieve profile via email query parameter", async () => {
      const request = new Request(
        "http://localhost:3000/api/user/profile?email=alex@example.com",
        { method: "GET" }
      );

      const response = await getProfileHandler(request);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.profile.email, "alex@example.com");
      assert.equal(json.profile.fullName, "Alex Morgan");
    });

    it("should retrieve profile via Bearer session token", async () => {
      const user = await authService.getUserById("usr_admin_001");
      assert.ok(user);
      const token = authService.createSessionToken(user);

      const request = new Request("http://localhost:3000/api/user/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const response = await getProfileHandler(request);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.profile.email, "admin@queuesmart.com");
      assert.equal(json.profile.fullName, "QueueSmart Administrator");
    });

    it("should update profile full name, contact info, and preferences via PUT", async () => {
      const request = new Request(
        "http://localhost:3000/api/user/profile?email=alex@example.com",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "Alexandria M.",
            contactInfo: "+1 832-555-4321",
            preferences: {
              emailNotifications: true,
              smsNotifications: false,
              theme: "light",
            },
          }),
        }
      );

      const response = await putProfileHandler(request);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.profile.fullName, "Alexandria M.");
      assert.equal(json.profile.contactInfo, "+1 832-555-4321");
      assert.equal(json.profile.preferences.smsNotifications, false);
      assert.equal(json.profile.preferences.theme, "light");
    });

    it("should reject invalid profile updates with 400 Bad Request", async () => {
      const request = new Request(
        "http://localhost:3000/api/user/profile?email=alex@example.com",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: "", // invalid empty string
            preferences: "not-an-object", // invalid type
          }),
        }
      );

      const response = await putProfileHandler(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.errors?.fullName);
      assert.ok(json.errors?.preferences);
    });
  });

  describe("Service API: /api/services", () => {
    it("GET /api/services should list all services from SQLite", async () => {
      const response = await getServicesHandler();
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.services));
      assert.ok(json.services.length >= 2);

      const names = json.services.map((s: { name: string }) => s.name);
      assert.ok(names.includes("Student services"));
    });

    it("POST /api/services should create a new service in SQLite", async () => {
      const testServiceId = `test-service-${Date.now()}`;
      const request = new Request("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: testServiceId,
          name: "Campus Health & Wellness",
          description: "General clinic and mental health services.",
          expectedDuration: 25,
          priorityLevel: "high",
          open: true,
        }),
      });

      const response = await postServicesHandler(request);
      assert.equal(response.status, 201);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.service.id, testServiceId);
      assert.equal(json.service.name, "Campus Health & Wellness");
      assert.equal(json.service.expectedDuration, 25);
      assert.equal(json.service.priorityLevel, "high");
    });

    it("POST /api/services should reject missing required fields with 400", async () => {
      const request = new Request("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Incomplete Service",
          // missing id, description, expectedDuration, priorityLevel
        }),
      });

      const response = await postServicesHandler(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.errors?.id);
      assert.ok(json.errors?.description);
      assert.ok(json.errors?.expectedDuration);
      assert.ok(json.errors?.priorityLevel);
    });

    it("POST /api/services should return 409 Conflict for duplicate Service ID", async () => {
      const request = new Request("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "student-services",
          name: "Duplicate Student Services",
          description: "Test description",
          expectedDuration: 10,
          priorityLevel: "medium",
        }),
      });

      const response = await postServicesHandler(request);
      assert.equal(response.status, 409);

      const json = await response.json();
      assert.equal(json.success, false);
      assert.ok(json.errors?.id);
    });
  });

  describe("Single Service API: /api/services/[serviceId]", () => {
    it("GET /api/services/[serviceId] should retrieve single service", async () => {
      const request = new Request("http://localhost:3000/api/services/student-services");
      const ctx = { params: Promise.resolve({ serviceId: "student-services" }) };

      const response = await getSingleServiceHandler(request, ctx);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.service.id, "student-services");
      assert.equal(json.service.name, "Student services");
    });

    it("GET /api/services/[serviceId] should return 404 for unknown service", async () => {
      const request = new Request("http://localhost:3000/api/services/unknown-xyz");
      const ctx = { params: Promise.resolve({ serviceId: "unknown-xyz" }) };

      const response = await getSingleServiceHandler(request, ctx);
      assert.equal(response.status, 404);
    });

    it("PUT /api/services/[serviceId] should update service attributes", async () => {
      const updateTestId = `service-for-update-${Date.now()}`;
      // Create dedicated service to update
      const createReq = new Request("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: updateTestId,
          name: "Original Service Name",
          description: "Original description",
          expectedDuration: 10,
          priorityLevel: "low",
        }),
      });
      await postServicesHandler(createReq);

      const request = new Request(`http://localhost:3000/api/services/${updateTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Service Name",
          expectedDuration: 20,
          priorityLevel: "high",
        }),
      });
      const ctx = { params: Promise.resolve({ serviceId: updateTestId }) };

      const response = await putSingleServiceHandler(request, ctx);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.service.name, "Updated Service Name");
      assert.equal(json.service.expectedDuration, 20);
      assert.equal(json.service.priorityLevel, "high");
    });

    it("DELETE /api/services/[serviceId] should delete service", async () => {
      // First create one to delete
      const delId = `temp-delete-${Date.now()}`;
      const createReq = new Request("http://localhost:3000/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: delId,
          name: "Temporary Service",
          description: "To be deleted",
          expectedDuration: 5,
          priorityLevel: "low",
        }),
      });
      await postServicesHandler(createReq);

      // Now delete it
      const delReq = new Request(`http://localhost:3000/api/services/${delId}`, {
        method: "DELETE",
      });
      const ctx = { params: Promise.resolve({ serviceId: delId }) };

      const response = await deleteSingleServiceHandler(delReq, ctx);
      assert.equal(response.status, 200);

      const json = await response.json();
      assert.equal(json.success, true);
    });
  });
});
