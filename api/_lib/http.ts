import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError, type ZodSchema } from "zod";

// Consistent JSON envelope matching shared/types.ts ApiResult<T>.
export function sendOk<T>(res: VercelResponse, data: T, status = 200): void {
  res.status(status).json({ ok: true, data });
}

export function sendErr(res: VercelResponse, status: number, error: string, code?: string): void {
  res.status(status).json({ ok: false, error, code });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** Guard allowed HTTP methods. Returns false and responds 405 when disallowed. */
export function allowMethods(req: VercelRequest, res: VercelResponse, methods: string[]): boolean {
  if (!methods.includes(req.method ?? "")) {
    res.setHeader("Allow", methods.join(", "));
    sendErr(res, 405, `Method ${req.method} not allowed`, "method_not_allowed");
    return false;
  }
  return true;
}

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  try {
    return schema.parse(body ?? {});
  } catch (e) {
    if (e instanceof ZodError) {
      throw new HttpError(400, e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), "validation");
    }
    throw e;
  }
}

export function parseQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  return parseBody(schema, query);
}

// Very small fixed-window in-memory rate limiter. Note: serverless instances are
// ephemeral, so this throttles within a warm instance only — documented as a
// best-effort guard, not a global quota. A durable limiter would use Supabase/Redis.
const buckets = new Map<string, { count: number; reset: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    throw new HttpError(429, "Too many requests, please slow down", "rate_limited");
  }
}

const MAX_BODY_BYTES = 100 * 1024; // 100 KB request-size limit
export function enforceBodySize(req: VercelRequest): void {
  const len = Number(req.headers["content-length"] ?? 0);
  if (len > MAX_BODY_BYTES) {
    throw new HttpError(413, "Request body too large", "payload_too_large");
  }
}

/** Wrap a handler so thrown HttpError/Error map to clean JSON without leaking internals. */
export function withErrors(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>,
): (req: VercelRequest, res: VercelResponse) => Promise<void> {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (e) {
      if (e instanceof HttpError) {
        sendErr(res, e.status, e.message, e.code);
        return;
      }
      // Log full detail server-side; return a generic message to the client.
      console.error("[api] unhandled error:", e);
      sendErr(res, 500, "Internal server error", "internal");
    }
  };
}
