"use client";
// Example-only triggers so the notification UI can be demonstrated and tested.
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Plus from "@/components/icons/Plus";
import { useNotifications } from "@/components/notifications/NotificationsProvider";
import { simulatedEvents } from "@/data/notifications";

export default function NotificationSimulator() {
  const { notify } = useNotifications();
  return (
    <Card>
      <CardHeader
        title="Simulate queue activity"
        description="Example buttons that add a notification and show a toast."
      />
      <CardBody className="space-y-3">
        {simulatedEvents.map((event) => (
          <Button
            key={event.title + event.detail}
            variant="outline"
            size="sm"
            startIcon={<Plus />}
            className="w-full justify-start"
            onClick={() => notify(event)}
          >
            {event.title}
          </Button>
        ))}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Nothing here changes a queue; A2 notifications are in-app examples.
        </p>
      </CardBody>
    </Card>
  );
}
