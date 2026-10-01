import type { Priority, ServiceInput } from "@/types/admin";

export const NAME_MAX_LENGTH = 100;
export const PRIORITIES: Priority[] = ["low", "medium", "high"];

/** Raw form values; duration stays a string until it is validated. */
export interface ServiceFormValues {
  name: string;
  description: string;
  durationMinutes: string;
  priority: Priority;
}

export type ServiceFormErrors = Partial<Record<keyof ServiceFormValues, string>>;

export function validateServiceForm(values: ServiceFormValues): ServiceFormErrors {
  const errors: ServiceFormErrors = {};

  const name = values.name.trim();
  if (!name) errors.name = "Service name is required.";
  else if (name.length > NAME_MAX_LENGTH)
    errors.name = `Service name must be ${NAME_MAX_LENGTH} characters or fewer.`;

  if (!values.description.trim()) errors.description = "Description is required.";

  const duration = values.durationMinutes.trim();
  if (!duration) errors.durationMinutes = "Expected duration is required.";
  else if (!/^\d+$/.test(duration) || Number(duration) < 1)
    errors.durationMinutes = "Duration must be a whole number of minutes (1 or more).";

  if (!PRIORITIES.includes(values.priority)) errors.priority = "Choose a priority level.";

  return errors;
}

export function toServiceInput(values: ServiceFormValues): ServiceInput {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    durationMinutes: Number(values.durationMinutes.trim()),
    priority: values.priority,
  };
}
