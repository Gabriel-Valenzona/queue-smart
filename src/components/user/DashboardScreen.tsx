"use client";

import Bell from "@/components/icons/Bell";
import Clock from "@/components/icons/Clock";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import QueueSummary from "@/components/user/QueueSummary";
import { useUserDemo } from "@/components/user/UserDemoProvider";
import { demoServices } from "@/data/user-demo";

export default function DashboardScreen() {
  const { state } = useUserDemo();
  const activeServices = demoServices.filter((service) => service.open);
  const recentNotifications = state.notifications.slice(0, 3);

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
          <Card>
            <CardHeader
              title="Notification summary"
              description="Recent demo queue updates and status changes."
            />
            {recentNotifications.length ? (
              <CardBody>
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {recentNotifications.map((notification) => (
                    <li
                      key={notification.id}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                          <Bell className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {notification.title}
                            {notification.unread ? (
                              <span className="sr-only"> — Unread</span>
                            ) : null}
                          </p>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {notification.detail}
                          </p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardBody>
            ) : (
              <EmptyState
                title="No demo updates yet"
                description="Queue updates will appear here when you join, advance, or leave a queue."
                icon={<Bell className="size-6" />}
              />
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
