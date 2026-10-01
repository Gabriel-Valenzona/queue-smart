"use client";

import Card, { CardHeader, CardBody, StatCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import List from "@/components/icons/List";
import Clock from "@/components/icons/Clock";
import { demoServices } from "@/data/user-demo";
import { getQueueSnapshot, isActiveParticipation } from "@/lib/user-demo";
import { useUserDemo } from "./UserDemoProvider";
import LeaveQueueDialog from "./LeaveQueueDialog";

export default function QueueSummary() {
  const { state } = useUserDemo();
  const current = state.current;
  const snapshot = getQueueSnapshot(current);
  const service = demoServices.find((item) => item.id === current?.serviceId);
  return (
    <section aria-label="Current queue">
      {!current || !snapshot || !service ? (
        <Card>
          <EmptyState
            title="You’re not in a queue"
            description="Choose an open service to start an example participation."
            icon={<List />}
            action={
              <ButtonLink href="/user/join-queue" size="sm">
                Join a queue
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Current queue"
              description="Example participation for the demo account"
              action={
                <Badge
                  color={
                    snapshot.status === "served"
                      ? "success"
                      : snapshot.status === "almost-ready"
                        ? "info"
                        : "warning"
                  }
                >
                  {snapshot.status === "served"
                    ? "Served"
                    : snapshot.status === "almost-ready"
                      ? "Almost ready"
                      : "Waiting"}
                </Badge>
              }
            />
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{service.name}</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {service.description}
                  </p>
                </div>
                {isActiveParticipation(current) ? (
                  <LeaveQueueDialog
                    participation={current}
                    serviceName={service.name}
                  />
                ) : (
                  <ButtonLink
                    href="/user/join-queue"
                    variant="outline"
                    size="sm"
                  >
                    Join another queue
                  </ButtonLink>
                )}
              </div>
            </CardBody>
          </Card>
          <div className="grid gap-5 sm:grid-cols-2">
            <StatCard
              label="Queue position"
              value={snapshot.position ?? "—"}
              icon={<List />}
              description={
                snapshot.status === "served"
                  ? "This participation is complete."
                  : "Position 1 is the next waiting user."
              }
            />
            <StatCard
              label="Estimated wait"
              value={`${snapshot.waitMinutes} min`}
              icon={<Clock />}
              description="Demo estimate only; not a guaranteed wait."
            />
          </div>
          {snapshot.status === "almost-ready" && (
            <Alert
              variant="info"
              title="You’re almost ready"
              message="You are next among the waiting users in this example queue."
            />
          )}
          {snapshot.status === "served" && (
            <Alert
              variant="success"
              title="Example participation complete"
              message="Your served outcome is now in History. You can join another example queue."
            />
          )}
        </div>
      )}
    </section>
  );
}
