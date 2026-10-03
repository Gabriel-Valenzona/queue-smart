import type { Metadata } from "next";
import AuthLayout from "@/components/layout/AuthLayout";
import AuthForm from "@/components/forms/AuthForm";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <AuthLayout>
      <AuthForm mode="register" />
    </AuthLayout>
  );
}
