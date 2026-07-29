import { ResetPasswordRequestForm } from "./reset-password-request-form";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  return (
    <ResetPasswordRequestForm
      initialError={error ?? null}
      initialSent={sent === "1"}
    />
  );
}
