"use client";
// Form composition adapted from TailAdmin SignInForm/SignUpForm (MIT).
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input, PasswordInput } from "./Fields";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const register = mode === "register";
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    const nextErrors: Record<string, string> = {};
    if (!email) nextErrors.email = "Enter your email address.";
    else if (emailInput.validity.typeMismatch || email.length > 254)
      nextErrors.email = "Enter a valid email address (up to 254 characters).";
    if (!password) nextErrors.password = "Enter your password.";
    if (
      register &&
      (!data.get("confirmPassword") || data.get("confirmPassword") !== password)
    )
      nextErrors.confirmPassword = "Your passwords must match.";
    setErrors(nextErrors);
    setSubmitted(false);
    if (Object.keys(nextErrors).length) {
      (
        form.elements.namedItem(Object.keys(nextErrors)[0]) as HTMLElement
      )?.focus();
      return;
    }
    form.reset();
    if (!register) {
      router.push("/user");
      return;
    }
    setSubmitted(true);
  }
  return (
    <>
      <div className="mb-8">
        <h1 className="text-title-sm font-semibold sm:text-title-md">
          {register ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {register
            ? "Start your QueueSmart journey with your email and password."
            : "Enter your email and password to log in to QueueSmart."}
        </p>
      </div>
      <div className="mb-6 rounded-lg bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {register
          ? "Frontend preview. This form checks your entries only; no account is created."
          : "Frontend demo. Valid entries open Alex Morgan’s example profile. Your credentials are not saved, and no real sign-in occurs."}
      </div>
      <form noValidate onSubmit={submit} className="space-y-5">
        <Input
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={254}
          required
          error={errors.email}
        />
        <PasswordInput
          name="password"
          autoComplete={register ? "new-password" : "current-password"}
          placeholder="Enter your password"
          required
          error={errors.password}
        />
        {register && (
          <PasswordInput
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            required
            error={errors.confirmPassword}
          />
        )}
        <Button type="submit" className="w-full">
          {register ? "Register" : "Log in"}
        </Button>
        {submitted && (
          <Alert
            variant="success"
            title="Preview complete"
            message={
              register
                ? "Your entries passed validation. No account was created, and your password was not saved."
                : "Your entries passed validation. This preview does not sign you in or save your password."
            }
          />
        )}
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
