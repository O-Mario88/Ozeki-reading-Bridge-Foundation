import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class RouteError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = "RouteError";
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

function toSerializableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

function inferRouteError(error: unknown) {
  if (error instanceof RouteError) {
    return error;
  }
  if (error instanceof ZodError) {
    return new RouteError(400, error.issues[0]?.message ?? "Invalid request.", {
      code: "VALIDATION_ERROR",
      details: error.issues,
    });
  }
  if (error instanceof Error) {
    const message = error.message || "Unexpected error";
    if (/unauthorized/i.test(message)) {
      return new RouteError(401, message, { code: "UNAUTHORIZED" });
    }
    if (/forbidden|permission/i.test(message)) {
      return new RouteError(403, message, { code: "FORBIDDEN" });
    }
    if (/not found/i.test(message)) {
      return new RouteError(404, message, { code: "NOT_FOUND" });
    }
    if (
      /required|invalid|duplicate|matched multiple|does not belong|outside your|revalidate|fix import errors|already provided|ambiguous|must be/i.test(
        message,
      )
    ) {
      return new RouteError(400, message, { code: "BAD_REQUEST" });
    }
  }
  return new RouteError(500, "Something went wrong. Please try again.", {
    code: "INTERNAL_ERROR",
  });
}

export function logRouteEvent(level: "info" | "error", payload: Record<string, unknown>) {
  const event = {
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  };
  const serialized = JSON.stringify(event);
  if (level === "error") {
    console.error(serialized);
  } else {
    console.log(serialized);
  }
}

export function jsonSuccess(data: Record<string, unknown>, requestId: string, status = 200) {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status,
      headers: {
        "x-request-id": requestId,
      },
    },
  );
}

export function jsonError(error: unknown, requestId: string) {
  const normalized = inferRouteError(error);
  const body: Record<string, unknown> = {
    success: false,
    error: {
      message: normalized.message,
      code: normalized.code,
    },
  };
  if (normalized.details !== undefined) {
    (body.error as Record<string, unknown>).details = normalized.details;
  }
  return NextResponse.json(body, {
    status: normalized.status,
    headers: {
      "x-request-id": requestId,
    },
  });
}

export function fileResponse(args: {
  body: Buffer | string;
  contentType: string;
  fileName: string;
  requestId: string;
  status?: number;
}) {
  const responseBody =
    typeof args.body === "string" ? args.body : new Uint8Array(args.body);
  return new NextResponse(responseBody, {
    status: args.status ?? 200,
    headers: {
      "content-type": args.contentType,
      "content-disposition": `attachment; filename="${args.fileName}"`,
      "x-request-id": args.requestId,
    },
  });
}

export async function withRouteHandler(args: {
  route: string;
  method: string;
  userId?: number | null;
  handler: (context: { requestId: string }) => Promise<Response>;
}) {
  const requestId = randomUUID();
  logRouteEvent("info", {
    event: "request_start",
    request_id: requestId,
    route: args.route,
    method: args.method,
    user_id: args.userId ?? null,
  });

  try {
    const response = await args.handler({ requestId });
    logRouteEvent("info", {
      event: "request_success",
      request_id: requestId,
      route: args.route,
      method: args.method,
      user_id: args.userId ?? null,
      status: response.status,
    });
    return response;
  } catch (error) {
    logRouteEvent("error", {
      event: "request_error",
      request_id: requestId,
      route: args.route,
      method: args.method,
      user_id: args.userId ?? null,
      error: toSerializableError(error),
    });
    return jsonError(error, requestId);
  }
}
