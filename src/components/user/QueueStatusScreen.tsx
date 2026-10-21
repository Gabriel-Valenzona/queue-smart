"use client";

import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import Button from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import QueueSummary from "@/components/user/QueueSummary";
import { useUserDemo } from "@/components/user/UserDemoProvider";

export default function QueueStatusScreen() {
  const { state, advanceQueue, resetDemo } = useUserDemo();
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    await action();
    setBusy(false);
  }

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
            description="Simulate an administrator moving this queue along."
          />
          <CardBody className="space-y-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <strong>Serve next (as admin)</strong> serves whoever is at the front of your
              queue, the same as the admin dashboard&apos;s Serve next button. Your position and
              wait update from the queue API, and this page also refreshes every few seconds.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button disabled={!state.current || busy} onClick={() => run(advanceQueue)}>
                Serve next (as admin)
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => run(resetDemo)}>
                Reset demo
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Reset restores the example queues on the server, your history, and notifications.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
