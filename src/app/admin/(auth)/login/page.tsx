import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";

type Props = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/admin";
  const hasGoogle =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--admin-bg)] px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Admin sign in</h1>
        <p className="mt-2 text-sm text-gray-600">
          Use the seeded admin account or Google (role required for access).
        </p>

        {params.error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign in failed. Check credentials or admin role.
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
                redirect(`/admin/login?error=CredentialsSignin&callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
              className="w-full rounded border border-gray-300 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Continue with Google
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
