"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useUserDemo } from "./UserDemoProvider";

export default function LeaveQueueDialog({ serviceName }: { serviceName: string }) {
  const { leaveQueue } = useUserDemo();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Leave queue
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Leave this queue?">
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          Leaving {serviceName} will give up your place in line and add this visit to your
          history as canceled.
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Keep waiting
          </Button>
          <Button
            variant="danger"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              await leaveQueue();
              setLeaving(false);
              setOpen(false);
            }}
          >
            Confirm leave
          </Button>
        </div>
      </Modal>
    </>
  );
}
