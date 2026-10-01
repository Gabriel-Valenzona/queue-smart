"use client";

import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import QueueSummary from "@/components/user/QueueSummary";
import { useUserDemo } from "@/components/user/UserDemoProvider";
import { isActiveParticipation } from "@/lib/user-demo";

export default function QueueStatusScreen() {
  const { state, advanceQueue, resetDemo } = useUserDemo();
  const active = isActiveParticipation(state.current);

  return (
    <>
      <PageHeader
        title="Queue status"
        description="Follow your position, estimated wait, and participation status."
        breadcrumbs={[
          { label: "Dashboard", href: "/user" },
          { label: "Queue status" },
        ]}
      />
      <div className="space-y-6">
        <QueueSummary />
        <Card>
          <CardHeader
            title="Demo controls"
            description="Manually preview how queue updates appear in the frontend."
          />
          <CardBody className="space-y-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Advance the example from waiting to almost ready, then served.
              Position 1 means the next waiting user. These predefined positions
              and estimated waits are simulated examples, not guarantees.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!active}
                onClick={() => {
                  if (state.current)
                    advanceQueue(state.current.id, state.current.stage);
                }}
              >
                Advance demo queue
              </Button>
              <Button variant="outline" onClick={resetDemo}>
                Reset demo
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reset restores the original example queue, participation history,
              and notifications.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
