import type { Metadata } from "next";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Set a new password · Vertex Point" };

export default function ResetPassword() {
  return (
    <section className="narrow" style={{ padding: "48px 24px 96px", maxWidth: 460 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Set a new password</h1>
      <ResetPasswordForm />
    </section>
  );
}
