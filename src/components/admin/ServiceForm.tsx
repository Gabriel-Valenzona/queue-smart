"use client";

import { useState } from "react";
import type { Service, ServiceInput } from "@/types/admin";
import {
  NAME_MAX_LENGTH,
  PRIORITIES,
  toServiceInput,
  validateServiceForm,
  type ServiceFormErrors,
  type ServiceFormValues,
} from "@/lib/validation";

interface ServiceFormProps {
  /** When provided, the form edits this service; otherwise it creates a new one. */
  service?: Service;
  onSubmit: (input: ServiceInput) => void;
  onCancel?: () => void;
}

function initialValues(service?: Service): ServiceFormValues {
  return {
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: service ? String(service.durationMinutes) : "",
    priority: service?.priority ?? "medium",
  };
}

const inputClass =
  "w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-900";

function fieldBorder(error?: string) {
  return error ? "border-red-500" : "border-zinc-300 dark:border-zinc-700";
}

export default function ServiceForm({ service, onSubmit, onCancel }: ServiceFormProps) {
  const [values, setValues] = useState<ServiceFormValues>(() => initialValues(service));
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const nameLength = values.name.trim().length;

  function update<K extends keyof ServiceFormValues>(key: K, value: ServiceFormValues[K]) {
    const next = { ...values, [key]: value };
    setValues(next);
    // Re-validate live once the user has tried to submit, so errors clear as they fix them.
    if (submitted) setErrors(validateServiceForm(next));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
    const nextErrors = validateServiceForm(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit(toServiceInput(values));
    if (!service) {
      setValues(initialValues());
      setSubmitted(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label htmlFor="service-name" className="mb-1 block text-sm font-medium">
          Service name <span className="text-red-600">*</span>
        </label>
        <input
          id="service-name"
          type="text"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          aria-invalid={!!errors.name}
          aria-describedby="service-name-hint"
          className={`${inputClass} ${fieldBorder(errors.name)}`}
        />
        <div id="service-name-hint" className="mt-1 flex justify-between gap-2 text-xs">
          <span className="text-red-600">{errors.name}</span>
          <span className={nameLength > NAME_MAX_LENGTH ? "text-red-600" : "text-zinc-500"}>
            {nameLength}/{NAME_MAX_LENGTH}
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="service-description" className="mb-1 block text-sm font-medium">
          Description <span className="text-red-600">*</span>
        </label>
        <textarea
          id="service-description"
          rows={3}
          value={values.description}
          onChange={(e) => update("description", e.target.value)}
          aria-invalid={!!errors.description}
          aria-describedby="service-description-error"
          className={`${inputClass} ${fieldBorder(errors.description)}`}
        />
        <p id="service-description-error" className="mt-1 text-xs text-red-600">
          {errors.description}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="service-duration" className="mb-1 block text-sm font-medium">
            Expected duration (minutes) <span className="text-red-600">*</span>
          </label>
          <input
            id="service-duration"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={values.durationMinutes}
            onChange={(e) => update("durationMinutes", e.target.value)}
            aria-invalid={!!errors.durationMinutes}
            aria-describedby="service-duration-error"
            className={`${inputClass} ${fieldBorder(errors.durationMinutes)}`}
          />
          <p id="service-duration-error" className="mt-1 text-xs text-red-600">
            {errors.durationMinutes}
          </p>
        </div>

        <div>
          <label htmlFor="service-priority" className="mb-1 block text-sm font-medium">
            Priority level
          </label>
          <select
            id="service-priority"
            value={values.priority}
            onChange={(e) => update("priority", e.target.value as ServiceFormValues["priority"])}
            aria-invalid={!!errors.priority}
            className={`${inputClass} ${fieldBorder(errors.priority)} capitalize`}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-red-600">{errors.priority}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {service ? "Save changes" : "Create service"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
