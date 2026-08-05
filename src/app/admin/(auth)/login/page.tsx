import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { isGoogleAuthConfigured } from "@/lib/google-auth";
import { routing } from "@/i18n/routing";
import { isAdminRole } from "@/lib/roles";

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

function loginErrorMessage(error?: string) {
  if (error === "CredentialsSignin" || error) {
    return "Sign in failed. Check credentials or admin role.";
  }
  return null;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/admin";
  const hasGoogle = isGoogleAuthConfigured();
  const session = await auth();
  const errorMessage = loginErrorMessage(params.error);
  const homePath = `/${routing.defaultLocale}`;

  if (session?.user) {
    if (isAdminRole(session.user.role)) {
      redirect(callbackUrl.startsWith("/") ? callbackUrl : "/admin");
    }
    redirect(homePath);
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--admin-bg)] px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Admin sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the seeded admin account
          {hasGoogle ? " or Google" : ""} (admin role required for access).
        </p>

        {errorMessage ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <form
          className="mt-6 space-y-4"
          action={async (formData) => {
            "use server";
            try {
              await signIn("credentials", {
                email: String(formData.get("email") || ""),
                password: String(formData.get("password") || ""),
                redirectTo: callbackUrl,
              });
            } catch (error) {
              if (error instanceof AuthError) {
                redirect(
                  `/admin/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`,
                );
              }
              throw error;
            }
          }}
        >
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Email</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
              autoComplete="username"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-gray-700">Password</span>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
              autoComplete="current-password"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-black"
          >
            Sign in
          </button>
        </form>

        {hasGoogle ? (
          <form
            className="mt-4"
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: callbackUrl });
            }}
          >
            <button
              type="submit"
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
