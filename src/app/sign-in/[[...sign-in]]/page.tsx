import { SignInForm } from "@/components/auth-forms";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      {reset ? (
        <p className="max-w-sm rounded-md bg-green-50 px-3 py-2 text-center text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          Tu contraseña fue restablecida. Iniciá sesión con la nueva contraseña.
        </p>
      ) : null}
      <SignInForm />
    </div>
  );
}
