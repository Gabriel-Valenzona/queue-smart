import type { Metadata } from "next";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthForm from "@/components/forms/AuthForm";
export const metadata: Metadata = { title: "Log in" };
export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthForm mode="login" />
    </AuthLayout>
  );
}
