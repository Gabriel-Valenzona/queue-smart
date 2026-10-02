"use client";

import Clock from "@/components/icons/Clock";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import QueueSummary from "@/components/user/QueueSummary";
import NotificationsSummary from "@/components/notifications/NotificationsSummary";
import { demoServices } from "@/data/user-demo";

export default function DashboardScreen() {
  const activeServices = demoServices.filter((service) => service.open);

  return (
    <>
      <PageHeader
        title="User dashboard"
        description="Follow your queue and find an available service."
      />
      <div className="space-y-6">
        <QueueSummary />
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              title="Active services"
              description="Explore open service queues. You can join one queue at a time."
            />
            {activeServices.length ? (
              <CardBody>
                <div className="grid gap-5 sm:grid-cols-2">
                  {activeServices.map((service) => (
                    <Card key={service.id} className="flex flex-col p-5">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge color="success" size="sm">
                          Open
                        </Badge>
                        <Badge color="light" size="sm">
                          {service.priority.charAt(0).toUpperCase() +
                            service.priority.slice(1)}{" "}
                          priority
                        </Badge>
                      </div>
                      <h3 className="text-base font-semibold">
                        {service.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {service.description}
                      </p>
                      <p className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="size-4 shrink-0" />
                        Expected duration: {service.duration} minutes
                      </p>
                      <p className="mt-2 text-sm">
                        Estimated wait: {service.snapshots[0].waitMinutes}{" "}
                        minutes
                      </p>
                      <p className="mb-5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Demo estimate; actual wait times may vary.
                      </p>
                      <ButtonLink
                        href={`/user/join-queue?service=${encodeURIComponent(service.id)}`}
                        variant="outline"
                        size="sm"
                        className="mt-auto"
                        aria-label={`View ${service.name} queue`}
                      >
                        View queue
                      </ButtonLink>
                    </Card>
                  ))}
                </div>
              </CardBody>
            ) : (
              <EmptyState
                title="No open services"
                description="There are no service queues available to join right now."
              />
            )}
          </Card>
          <NotificationsSummary
            href="/user/notifications"
            title="Notification summary"
            description="Recent demo queue updates and status changes."
          />
        </div>
      </div>
    </>
  );
}
