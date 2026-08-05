/** Auth.js / NextAuth Google OAuth env (either naming convention). */
export function getGoogleClientId(): string | undefined {
  const value =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.AUTH_GOOGLE_ID?.trim();
  return value || undefined;
}

export function getGoogleClientSecret(): string | undefined {
  const value =
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.AUTH_GOOGLE_SECRET?.trim();
  return value || undefined;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(getGoogleClientId() && getGoogleClientSecret());
}
