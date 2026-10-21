"use client";

import Card, { CardHeader, CardBody, StatCard } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Alert from "@/components/ui/Alert";
import List from "@/components/icons/List";
import Clock from "@/components/icons/Clock";
import { useUserDemo } from "./UserDemoProvider";
import LeaveQueueDialog from "./LeaveQueueDialog";

export default function QueueSummary() {
  const { state } = useUserDemo();
  const { current, justServed } = state;

  if (!state.services && !state.loadError)
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading your queue…</p>
        </CardBody>
      </Card>
    );

  if (!current)
    return (
      <section aria-label="Current queue" className="space-y-5">
        {state.loadError && (
          <Alert variant="error" title="Queue unavailable" message={state.loadError} />
        )}
        {justServed ? (
          <Alert
            variant="success"
            title="You’ve been served"
            message={`${justServed.serviceName} completed your visit. It is now in History, and you can join another queue.`}
          />
        ) : null}
        <Card>
          <EmptyState
            title="You’re not in a queue"
            description="Choose an open service to join its queue."
            icon={<List />}
            action={
              <ButtonLink href="/user/join-queue" size="sm">
                Join a queue
              </ButtonLink>
            }
          />
        </Card>
      </section>
    );

  const almostReady = current.status === "almost-ready";
  return (
    <section aria-label="Current queue" className="space-y-5">
      <Card>
        <CardHeader
          title="Current queue"
          description={`Live position for ${current.userName}`}
          action={
            <Badge color={almostReady ? "info" : "warning"}>
              {almostReady ? "Almost ready" : "Waiting"}
            </Badge>
          }
        />
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{current.service.name}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {current.service.description}
              </p>
            </div>
            <LeaveQueueDialog serviceName={current.service.name} />
          </div>
        </CardBody>
      </Card>
      <div className="grid gap-5 sm:grid-cols-2">
        <StatCard
          label="Queue position"
          value={current.position}
          icon={<List />}
          description="Position 1 is the next user to be served."
        />
        <StatCard
          label="Estimated wait"
          value={`${current.estimatedWaitMinutes} min`}
          icon={<Clock />}
          description={`Position × ${current.service.duration}-minute service time; not a guarantee.`}
        />
      </div>
      {almostReady && (
        <Alert
          variant="info"
          title="You’re almost ready"
          message="You are next in line. Please stay nearby."
        />
      )}
    </section>
  );
}
