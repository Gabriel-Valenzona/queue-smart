"use client";

import Clock from "@/components/icons/Clock";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import Button, { ButtonLink } from "@/components/ui/Button";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useUserDemo } from "./UserDemoProvider";
import { useHistory } from "./useHistory";
import { formatDemoDate } from "@/lib/user-demo";

export default function HistoryScreen() {
  const { user } = useUserDemo();
  return <AccountHistory key={user.id} />;
}

function AccountHistory() {
  const {
    records: history,
    error,
    needsSignIn,
    retry,
    retrying,
  } = useHistory();

  return (
    <>
      <PageHeader
        title="History"
        description="Review past queue participation and outcomes."
      />
      <Card>
        <CardHeader
          title="Past queues"
          description="Completed visits, newest first. Dates are displayed in UTC."
        />
        {error && (
          <CardBody>
            <Alert
              variant="error"
              title="History unavailable"
              message={error}
            />
            <div className="mt-4">
              {needsSignIn ? (
                <ButtonLink href="/login">Sign in</ButtonLink>
              ) : (
                <Button variant="outline" onClick={retry} disabled={retrying}>
                  {retrying ? "Retrying…" : "Retry"}
                </Button>
              )}
            </div>
          </CardBody>
        )}
        {!history && !error ? (
          <CardBody>
            <p role="status">Loading history…</p>
          </CardBody>
        ) : null}
        {history && history.length > 0 ? (
          <Table>
            <caption className="sr-only">Participation history</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Date joined</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((record) => (
                <TableRow key={record.entryId}>
                  <TableCell className="whitespace-nowrap text-gray-500 dark:text-gray-400">
                    <time dateTime={record.joinedAt}>
                      {formatDemoDate(record.joinedAt)}
                    </time>
                  </TableCell>
                  <TableCell className="font-medium">
                    {record.serviceName}
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
        ) : history && !error ? (
          <EmptyState
            title="No past queues"
            description="Completed or canceled queue participation will appear here."
            icon={<Clock className="size-6" />}
            action={
              <ButtonLink href="/user/join-queue">Join a queue</ButtonLink>
            }
          />
        ) : null}
      </Card>
    </>
  );
}
