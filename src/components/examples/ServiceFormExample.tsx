"use client";
import { useState, type FormEvent } from "react";
import { Input, Select, TextArea } from "@/components/forms/Fields";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const initial = { name: "", description: "", duration: "", priority: "medium" };
export default function ServiceFormExample() {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!values.name.trim()) next.name = "Enter a service name.";
    else if (values.name.trim().length > 100)
      next.name = "Use 100 characters or fewer.";
    if (!values.description.trim()) next.description = "Describe this service.";
    if (
      !values.duration ||
      !Number.isFinite(Number(values.duration)) ||
      Number(values.duration) <= 0
    )
      next.duration = "Enter a duration greater than zero.";
    if (!["low", "medium", "high"].includes(values.priority))
      next.priority = "Select low, medium, or high.";
    setErrors(next);
    setSaved(!Object.keys(next).length);
    if (Object.keys(next).length)
      (
        event.currentTarget.elements.namedItem(
          Object.keys(next)[0],
        ) as HTMLElement
      )?.focus();
  }
  return (
    <form
      noValidate
      onSubmit={submit}
      onReset={() => {
        setValues(initial);
        setErrors({});
        setSaved(false);
      }}
      className="space-y-5"
    >
      <Input
        label="Service name"
        name="name"
        placeholder="e.g. Student services"
        value={values.name}
        onChange={(e) => {
          setValues({ ...values, name: e.target.value });
          setSaved(false);
        }}
        maxLength={100}
        required
        error={errors.name}
        hint={`${values.name.length}/100 characters`}
      />
      <TextArea
        label="Description"
        name="description"
        placeholder="What can users expect from this service?"
        value={values.description}
        onChange={(e) => {
          setValues({ ...values, description: e.target.value });
          setSaved(false);
        }}
        required
        error={errors.description}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Expected duration (minutes)"
          name="duration"
          type="number"
          min="0.01"
          step="any"
          placeholder="10"
          required
          value={values.duration}
          onChange={(e) => {
            setValues({ ...values, duration: e.target.value });
            setSaved(false);
          }}
          error={errors.duration}
        />
        <Select
          label="Priority"
          name="priority"
          required
          value={values.priority}
          onChange={(e) => {
            setValues({ ...values, priority: e.target.value });
            setSaved(false);
          }}
          error={errors.priority}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </Select>
      </div>
      <div className="flex gap-3">
        <Button type="submit" size="sm">
          Validate example
        </Button>
        <Button type="reset" variant="outline" size="sm">
          Reset
        </Button>
      </div>
      {saved && (
        <Alert
          variant="success"
          title="Validation passed"
          message="These example fields are valid. No service was created."
        />
      )}
    </form>
  );
}
