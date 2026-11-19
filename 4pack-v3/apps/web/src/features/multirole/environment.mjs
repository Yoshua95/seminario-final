// Explicit opt-in. Never available in production or a hosted Preview.
export function isMultiroleDemo(environment = process.env) {
  return (
    environment.NODE_ENV === "development" &&
    environment.VERCEL !== "1" &&
    !environment.VERCEL_ENV &&
    environment.FOURPACK_MULTIROLE_DEMO === "1" &&
    Boolean(environment.FOURPACK_DEMO_DIRECTORY)
  );
}
