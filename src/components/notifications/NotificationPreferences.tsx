"use client";
// Which in-app notifications a page would show. Choices stay in React state.
import { useState, type FormEvent } from "react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Input, Switch } from "@/components/forms/Fields";
import { useNotifications } from "./NotificationsProvider";

const defaults = {
  queue: true,
  status: true,
  service: false,
  quiet: false,
  start: "21:00",
  end: "23:30",
};

export default function NotificationPreferences() {
  const { notify } = useNotifications();
  const [form, setForm] = useState(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof defaults>(
    key: K,
    value: (typeof defaults)[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (form.quiet) {
      if (!form.start) nextErrors.start = "Choose a start time.";
      if (!form.end) nextErrors.end = "Choose an end time.";
      if (form.start && form.end && form.end <= form.start)
        nextErrors.end = "Quiet hours must end after they start.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setSaved(false);
      return;
    }
    setSaved(true);
    notify({
      category: "system",
      tone: "success",
      title: "Notification preferences saved",
      detail: form.quiet
        ? `Quiet hours run from ${form.start} to ${form.end}.`
        : "You’ll keep seeing the categories you selected.",
    });
  }

  return (
    <Card>
      <CardHeader
        title="Notification settings"
        description="Choose what appears in your in-app notifications."
      />
      <CardBody>
        <form
          noValidate
          onSubmit={save}
          onReset={() => {
            setForm(defaults);
            setErrors({});
            setSaved(false);
          }}
          className="space-y-5"
        >
          <fieldset className="space-y-4">
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Categories
            </legend>
            <Switch
              label="Queue updates"
              checked={form.queue}
              onChange={(event) => update("queue", event.target.checked)}
            />
            <Switch
              label="Status changes"
              checked={form.status}
              onChange={(event) => update("status", event.target.checked)}
            />
            <Switch
              label="Service announcements"
              checked={form.service}
              onChange={(event) => update("service", event.target.checked)}
            />
          </fieldset>
          <fieldset className="space-y-4 border-t border-gray-100 pt-5 dark:border-gray-800">
            <legend className="sr-only">Quiet hours</legend>
            <Switch
              label="Pause notifications during quiet hours"
              checked={form.quiet}
              onChange={(event) => update("quiet", event.target.checked)}
            />
            {form.quiet && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Quiet hours start"
                  name="quiet-start"
                  type="time"
                  required
                  value={form.start}
                  onChange={(event) => update("start", event.target.value)}
                  error={errors.start}
                />
                <Input
                  label="Quiet hours end"
                  name="quiet-end"
                  type="time"
                  required
                  value={form.end}
                  onChange={(event) => update("end", event.target.value)}
                  error={errors.end}
                />
              </div>
            )}
          </fieldset>
          {saved && (
            <Alert
              variant="success"
              title="Preferences saved"
              message="This preview keeps your choices on screen only; nothing is stored."
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="reset" variant="outline" size="sm">
              Reset
            </Button>
            <Button type="submit" size="sm">
              Save preferences
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
