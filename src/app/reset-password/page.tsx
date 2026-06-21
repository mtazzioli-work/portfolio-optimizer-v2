import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth-forms";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Enlace inválido</h1>
          <p className="text-sm text-zinc-500">
            El enlace para restablecer la contraseña no es válido o ya expiró.
          </p>
          <Link href="/forgot-password" className="text-sm underline">
            Solicitar un enlace nuevo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <ResetPasswordForm token={token} />
    </div>
  );
}
