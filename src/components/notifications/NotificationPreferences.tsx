"use client";
/**
 * Which in-app notifications an account receives. On a live feed these are the
 * settings the Notification API applies before it delivers anything; on an
 * example page the choices stay in React state.
 */
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Card, { CardBody, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { Input, Switch } from "@/components/forms/Fields";
import { ApiError } from "@/lib/api/queues";
import { notificationApi } from "@/lib/api/notifications";
import { usePolling } from "@/lib/usePolling";
import { useNotifications } from "./NotificationsProvider";

type Form = {
  queue: boolean;
  status: boolean;
  service: boolean;
  quiet: boolean;
  start: string;
  end: string;
};

const defaults: Form = {
  queue: true,
  status: true,
  service: true,
  quiet: false,
  start: "21:00",
  end: "07:00",
};

export default function NotificationPreferences() {
  const { live, notify } = useNotifications();
  const [form, setForm] = useState<Form>(defaults);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  // Saved settings are read once; a failed read is retried until it succeeds.
  const loaded = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!live || loaded.current) return;
    try {
      const preferences = await notificationApi.preferences();
      if (!mounted.current) return;
      loaded.current = true;
      setForm({
        queue: preferences.categories["queue-update"],
        status: preferences.categories["status-change"],
        service: preferences.categories.service,
        quiet: preferences.quietHours.enabled,
        start: preferences.quietHours.start,
        end: preferences.quietHours.end,
      });
      setLoadError(null);
    } catch {
      if (mounted.current)
        setLoadError("Your notification settings could not be loaded.");
    }
  }, [live]);

  usePolling(load, 5000);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (form.quiet) {
      if (!form.start) next.start = "Choose a start time.";
      if (!form.end) next.end = "Choose an end time.";
      // Quiet hours may run overnight, so only an empty range is rejected.
      if (form.start && form.end && form.start === form.end)
        next.end = "Quiet hours must end at a different time.";
    }
    return next;
  }

  /** Field errors the API reported, keyed the way its validation names them. */
  function applyApiErrors(error: ApiError) {
    const fields = error.fields ?? {};
    const next: Record<string, string> = {};
    if (fields["quietHours.start"]) next.start = fields["quietHours.start"];
    if (fields["quietHours.end"]) next.end = fields["quietHours.end"];
    const other = Object.entries(fields).find(([key]) =>
      key.startsWith("categories."),
    );
    if (other) next.form = other[1];
    setErrors(next);
    if (!Object.keys(next).length) setLoadError(error.message);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setSaved(false);
    if (Object.keys(nextErrors).length) return;

    const detail = form.quiet
      ? `Quiet hours run from ${form.start} to ${form.end}.`
      : "You’ll keep seeing the categories you selected.";

    if (!live) {
      setSaved(true);
      notify({
        category: "system",
        tone: "success",
        title: "Notification preferences saved",
        detail,
      });
      return;
    }

    setBusy(true);
    try {
      await notificationApi.savePreferences({
        categories: {
          "queue-update": form.queue,
          "status-change": form.status,
          service: form.service,
        },
        quietHours: { enabled: form.quiet, start: form.start, end: form.end },
      });
      if (!mounted.current) return;
      setSaved(true);
      setLoadError(null);
      notify({
        category: "system",
        tone: "success",
        title: "Notification preferences saved",
        detail,
      });
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError) applyApiErrors(error);
      else setLoadError("Your settings could not be saved. Please retry.");
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Notification settings"
        description={
          live
            ? "Choose what the service sends to your in-app notifications."
            : "Choose what appears in your in-app notifications."
        }
      />
      <CardBody>
        <form
          noValidate
          onSubmit={save}
          onReset={() => {
            setErrors({});
            setSaved(false);
            if (live) {
              loaded.current = false;
              void load();
            } else setForm(defaults);
          }}
          className="space-y-5"
        >
          {loadError && (
            <Alert variant="error" title="Settings unavailable" message={loadError} />
          )}
          <fieldset className="space-y-4" disabled={busy}>
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
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Account and system messages are always delivered.
            </p>
          </fieldset>
          <fieldset
            className="space-y-4 border-t border-gray-100 pt-5 dark:border-gray-800"
            disabled={busy}
          >
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
                  hint="A range may run overnight, such as 21:00 to 07:00."
                />
              </div>
            )}
          </fieldset>
          {errors.form && (
            <p role="alert" className="text-xs text-error-600 dark:text-error-400">
              {errors.form}
            </p>
          )}
          {saved && (
            <Alert
              variant="success"
              title="Preferences saved"
              message={
                live
                  ? "New notifications follow these settings. Quiet hours keep them in the feed without a pop-up."
                  : "This preview keeps your choices on screen only; nothing is stored."
              }
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="reset" variant="outline" size="sm" disabled={busy}>
              Reset
            </Button>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Save preferences"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
