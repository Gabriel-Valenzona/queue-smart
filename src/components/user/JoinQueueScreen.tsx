"use client";

import { useState, type FormEvent } from "react";
import { Select } from "@/components/forms/Fields";
import PageHeader from "@/components/layout/PageHeader";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import QueueSummary from "@/components/user/QueueSummary";
import { useUserDemo } from "@/components/user/UserDemoProvider";
import { demoServices } from "@/data/user-demo";
import { getJoinError, isActiveParticipation } from "@/lib/user-demo";

export default function JoinQueueScreen({
  initialServiceId = "",
  initialError,
}: {
  initialServiceId?: string;
  initialError?: string;
}) {
  const { state, joinQueue } = useUserDemo();
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [error, setError] = useState(initialError);
  const service = demoServices.find((item) => item.id === serviceId);
  const active = isActiveParticipation(state.current);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextError = getJoinError(state, serviceId);
    setError(nextError);
    if (nextError) {
      (
        event.currentTarget.elements.namedItem("service") as HTMLElement
      )?.focus();
      return;
    }
    joinQueue(serviceId);
  }

  return (
    <>
      <PageHeader
        title="Join queue"
        description="Choose an available service and preview its estimated wait."
        breadcrumbs={[
          { label: "Dashboard", href: "/user" },
          { label: "Join queue" },
        ]}
      />
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Select a service"
            description="Explore the example services before joining a queue."
          />
          <CardBody>
            <form noValidate onSubmit={submit} className="space-y-6">
              <Select
                id="user-service"
                name="service"
                label="Service"
                required
                value={serviceId}
                error={error}
                hint="You can participate in one queue at a time."
                onChange={(event) => {
                  setServiceId(event.target.value);
                  setError(undefined);
                }}
              >
                <option value="">Select a service</option>
                {demoServices.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.open ? "" : " — Closed"}
                  </option>
                ))}
              </Select>
              {service ? (
                <div className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">{service.name}</h3>
                    <Badge color={service.open ? "success" : "light"}>
                      {service.open ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {service.description}
                  </p>
                  <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        Expected duration
                      </dt>
                      <dd className="mt-1 font-medium">
                        {service.duration} minutes
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        Priority
                      </dt>
                      <dd className="mt-1">
                        <Badge
                          color={
                            service.priority === "high"
                              ? "warning"
                              : service.priority === "medium"
                                ? "info"
                                : "light"
                          }
                        >
                          {service.priority.charAt(0).toUpperCase() +
                            service.priority.slice(1)}
                        </Badge>
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-gray-500 dark:text-gray-400">
                        Estimated wait
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {service.open
                          ? `${service.snapshots[0].waitMinutes} minutes`
                          : "Unavailable"}
                      </dd>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Demo wait values are examples, not guarantees.
                      </p>
                    </div>
                  </dl>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a service to view its description, priority, and
                  estimated wait.
                </p>
              )}
              {service && !service.open ? (
                <Alert
                  variant="warning"
                  title="Queue closed"
                  message="This example service is currently closed. Choose an open service to join."
                />
              ) : active ? (
                <Alert
                  variant="info"
                  title="You are already in a queue"
                  message="Leave your current queue or finish the demo participation before joining another service."
                />
              ) : null}
              <Button type="submit" disabled={!!service && !service.open}>
                Join queue
              </Button>
            </form>
          </CardBody>
        </Card>
        <QueueSummary />
      </div>
    </>
  );
}
