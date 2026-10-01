"use client";

import Clock from "@/components/icons/Clock";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import Card, { CardHeader } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useUserDemo } from "@/components/user/UserDemoProvider";
import { demoServices } from "@/data/user-demo";
import { formatDemoDate } from "@/lib/user-demo";

export default function HistoryScreen() {
  const { state } = useUserDemo();
  const history = [...state.history].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  );

  return (
    <>
      <PageHeader
        title="History"
        description="Review past queue participation and outcomes."
      />
      <Card>
        <CardHeader
          title="Past queues"
          description="Example records and completed demo interactions, newest first. Dates are displayed in UTC."
        />
        {history.length ? (
          <Table>
            <caption className="sr-only">Example participation history</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Date joined</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    <time dateTime={record.joinedAt}>
                      {formatDemoDate(record.joinedAt)}
                    </time>
                  </TableCell>
                  <TableCell className="font-medium">
                    {demoServices.find(
                      (service) => service.id === record.serviceId,
                    )?.name ?? "Unavailable service"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      color={record.outcome === "served" ? "success" : "light"}
                    >
                      {record.outcome === "served" ? "Served" : "Canceled"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No past queues"
            description="Completed or canceled demo queue participation will appear here."
            icon={<Clock className="size-6" />}
            action={
              <ButtonLink href="/user/join-queue">Join a queue</ButtonLink>
            }
          />
        )}
      </Card>
    </>
  );
}
