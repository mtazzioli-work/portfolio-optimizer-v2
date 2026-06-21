import { ChangePasswordForm } from "@/components/change-password-form";
import Link from "next/link";

export default function PasswordSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Contraseña</h1>
        <p className="text-sm text-zinc-500">
          Cambiá tu contraseña. Esto cerrará otras sesiones activas.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          ¿No recordás tu contraseña actual?{" "}
          <Link href="/forgot-password" className="underline">
            Solicitá un enlace de restablecimiento
          </Link>
          .
        </p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
