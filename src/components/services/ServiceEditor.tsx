"use client";

import { useRef, useState, type FormEvent, type RefObject } from "react";
import { Input, Select, TextArea } from "@/components/forms/Fields";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import Modal from "@/components/ui/Modal";
import { useNotifications } from "@/components/notifications/NotificationsProvider";
import { ApiError } from "@/lib/api/queues";
import { servicesApi } from "@/lib/api/services";
import { QueueError } from "@/server/queue/errors";
import type { QueueService } from "@/server/queue/types";
import { validateServiceInput } from "@/server/services/validation";

export type ServiceEditorProps = {
  open: boolean;
  service: QueueService | null;
  onClose: () => void;
  onSaved: (service: QueueService, operation: "create" | "update") => void;
};

/** API-backed editor used by the administrator workspace. */
export default function ServiceEditor(props: ServiceEditorProps) {
  const pendingRef = useRef(false);
  const close = () => {
    if (!pendingRef.current) props.onClose();
  };
  return (
    <Modal
      open={props.open}
      onClose={close}
      title={props.service ? "Edit service" : "Create service"}
    >
      {props.open && (
        <ServiceForm
          key={props.service?.id ?? "create"}
          {...props}
          pendingRef={pendingRef}
        />
      )}
    </Modal>
  );
}

function ServiceForm({
  service,
  onClose,
  onSaved,
  pendingRef,
}: ServiceEditorProps & { pendingRef: RefObject<boolean> }) {
  const [draft, setDraft] = useState(() => ({
    name: service?.name ?? "",
    description: service?.description ?? "",
    duration: service ? String(service.duration) : "",
    priority: service?.priority ?? "medium",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { notify } = useNotifications();

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    setFailure(null);
    let input;
    try {
      input = validateServiceInput({
        ...draft,
        duration: Number(draft.duration),
      });
    } catch (error) {
      const fields = error instanceof QueueError ? (error.fields ?? {}) : {};
      setErrors(fields);
      (
        event.currentTarget.elements.namedItem(
          Object.keys(fields)[0],
        ) as HTMLElement | null
      )?.focus();
      return;
    }
    setErrors({});
    pendingRef.current = true;
    setSaving(true);
    let saved: QueueService;
    try {
      saved = service
        ? await servicesApi.update(service.id, input)
        : await servicesApi.create(input);
    } catch (error) {
      setErrors(error instanceof ApiError ? (error.fields ?? {}) : {});
      const message =
        error instanceof ApiError
          ? error.message
          : "The service could not be saved. Please try again.";
      setFailure(message);
      return;
    } finally {
      pendingRef.current = false;
      setSaving(false);
    }
    // Host refresh failures must not be reported as a failed save.
    onSaved(saved, service ? "update" : "create");
    onClose();
    notify({
      category: "service",
      tone: "success",
      title: service ? "Service updated" : "Service created",
      detail: `${saved.name} was ${service ? "updated" : "created"}.`,
      service: saved.name,
    });
  }

  return (
    <form noValidate onSubmit={save} className="space-y-5">
      {failure && (
        <Alert
          variant="error"
          title="Service could not be saved"
          message={failure}
        />
      )}
      <fieldset disabled={saving} className="space-y-5">
        <Input
          label="Service name"
          name="name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          maxLength={100}
          required
          error={errors.name}
          hint={`${draft.name.length}/100 characters`}
        />
        <TextArea
          label="Description"
          name="description"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          required
          error={errors.description}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input
            label="Expected duration (minutes)"
            name="duration"
            type="number"
            min="1"
            step="1"
            value={draft.duration}
            onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            required
            error={errors.duration}
          />
          <Select
            label="Priority level"
            name="priority"
            value={draft.priority}
            onChange={(e) =>
              setDraft({
                ...draft,
                priority: e.target.value as QueueService["priority"],
              })
            }
            required
            error={errors.priority}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {saving ? "Saving…" : service ? "Save changes" : "Create service"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
