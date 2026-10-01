"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import type { DemoParticipation } from "@/types/user-demo";
import { useUserDemo } from "./UserDemoProvider";

export default function LeaveQueueDialog({
  participation,
  serviceName,
}: {
  participation: DemoParticipation;
  serviceName: string;
}) {
  const { leaveQueue } = useUserDemo();
  const [pending, setPending] = useState<DemoParticipation | null>(null);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPending(participation)}
      >
        Leave queue
      </Button>
      <Modal
        open={!!pending}
        onClose={() => setPending(null)}
        title="Leave this queue?"
      >
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          Leaving {serviceName} will cancel this example participation and add
          it to your demo history.
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setPending(null)}>
            Keep waiting
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (pending) leaveQueue(pending.id, pending.stage);
              setPending(null);
            }}
          >
            Confirm leave
          </Button>
        </div>
      </Modal>
    </>
  );
}
