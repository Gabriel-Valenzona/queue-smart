"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input, PasswordInput, Select } from "./Fields";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { setStoredUser } from "@/lib/auth/client-auth";
import type { AuthApiResponse, UserRole } from "@/types/auth";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const router = useRouter();

  // Form field states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("user");

  // Feedback states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverFeedback, setServerFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setServerFeedback(null);
    setLoading(true);

    const endpoint = register ? "/api/auth/register" : "/api/auth/login";
    const payload = register
      ? {
          name: name.trim() || undefined,
          email: email.trim(),
          password,
          confirmPassword,
          role,
        }
      : {
          email: email.trim(),
          password,
        };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: AuthApiResponse = await response.json();

      if (!response.ok || !data.success) {
        setServerFeedback({
          kind: "error",
          message: data.message || "Request failed. Please verify your entries.",
        });
        if (data.errors) {
          setErrors(data.errors);
        }
        setLoading(false);
        return;
      }

      // Successful registration or login
      if (data.user) {
        setStoredUser(data.user);
      }

      setServerFeedback({
        kind: "success",
        message: `${data.message} Redirecting to your workspace...`,
      });

      // Redirect based on role-directed URL returned from backend API
      const targetUrl = data.redirectUrl || (data.user?.role === "admin" ? "/admin" : "/user");
      setTimeout(() => {
        router.push(targetUrl);
      }, 700);
    } catch {
      setServerFeedback({
        kind: "error",
        message: "Network error. Unable to connect to QueueSmart authentication service.",
      });
      setLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-title-sm font-semibold sm:text-title-md">
          {register ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {register
            ? "Register a new QueueSmart user or administrator account."
            : "Enter your credentials to log in to QueueSmart."}
        </p>
      </div>

      {serverFeedback && (
        <div className="mb-5">
          <Alert
            variant={serverFeedback.kind}
            title={serverFeedback.kind === "success" ? "Success" : "Authentication Notice"}
            message={serverFeedback.message}
          />
        </div>
      )}

      <form noValidate onSubmit={submit} className="space-y-4">
        {register && (
          <Input
            label="Full name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="e.g. Jordan Lee"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
        )}

        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={254}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        {register && (
          <Select
            label="Account role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            hint="Administrators can manage services and queues; Users join lines."
            error={errors.role}
          >
            <option value="user">User (Queue Participant)</option>
            <option value="admin">Administrator (Service & Queue Manager)</option>
          </Select>
        )}

        <PasswordInput
          name="password"
          autoComplete={register ? "new-password" : "current-password"}
          placeholder="Enter your password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={register ? "At least 6 characters" : undefined}
        />

        {register && (
          <PasswordInput
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading
            ? register
              ? "Creating account..."
              : "Logging in..."
            : register
            ? "Register"
            : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
        {register ? "Already have an account?" : "Don’t have an account?"}{" "}
        <Link
          href={register ? "/login" : "/register"}
          className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
        >
          {register ? "Log in" : "Register"}
        </Link>
      </p>
    </>
  );
}
