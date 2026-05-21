export function parseApiError(data: unknown, fallback = "Request failed"): string {
  if (!data || typeof data !== "object") return fallback;
  const obj = data as Record<string, unknown>;

  if (typeof obj.error === "string") return obj.error;

  const detail = obj.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (typeof d === "object" && d && "msg" in d) {
          return String((d as { msg: string }).msg);
        }
        return String(d);
      })
      .join("; ");
  }

  return fallback;
}
