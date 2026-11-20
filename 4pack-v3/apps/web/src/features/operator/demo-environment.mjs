// Server-owned environment values only. A cookie or query string cannot enable this mode.
export function isVercelPreview(environment = process.env) {
  return environment.VERCEL === "1" && environment.VERCEL_ENV === "preview" && environment.FOURPACK_REAL_CANDIDATE !== "1";
}
export function isDemoEnabled(environment = process.env) {
  if (environment.VERCEL_ENV === "production") return false;
  if (environment.VERCEL === "1") return isVercelPreview(environment);
  return (
    environment.NODE_ENV !== "production" &&
    (!environment.VERCEL_ENV || environment.VERCEL_ENV === "development")
  );
}
