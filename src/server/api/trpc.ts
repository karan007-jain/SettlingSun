import { initTRPC, TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import superjson from "superjson";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserFriendlyErrorMessage } from "@/lib/api-error";

interface CreateContextOptions {
  session: Session | null;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    prisma,
    session: null as Session | null,
    ...opts,
  };
};

function formatZodFieldMessage(zodError: ZodError): string {
  const flattened = zodError.flatten();
  const fieldEntries = Object.entries(flattened.fieldErrors).filter(
    ([, msgs]) => Array.isArray(msgs) && msgs.length > 0
  );

  if (fieldEntries.length === 0 && flattened.formErrors.length > 0) {
    return flattened.formErrors.join(", ");
  }

  if (fieldEntries.length === 0) {
    return "Validation failed. Please check form fields.";
  }

  return fieldEntries
    .map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`)
    .join(" | ");
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const sourceZodError =
      error.cause instanceof ZodError
        ? error.cause
        : error instanceof ZodError
        ? error
        : null;

    const friendlyMessage = sourceZodError
      ? formatZodFieldMessage(sourceZodError)
      : getUserFriendlyErrorMessage(error.cause ?? error);

    return {
      ...shape,
      message: friendlyMessage,
      data: {
        ...shape.data,
        zodError: sourceZodError ? sourceZodError.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

const withExceptionHandling = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: getUserFriendlyErrorMessage(error),
      cause: error,
    });
  }
});

export const publicProcedure = t.procedure.use(withExceptionHandling);

export const protectedProcedure = t.procedure.use(withExceptionHandling).use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const adminProcedure = t.procedure.use(withExceptionHandling).use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (ctx.session.user.role !== "ADMIN") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

// Sync API procedure - for CLI tool authentication via API key
export const syncProcedure = t.procedure.use(withExceptionHandling).use(({ ctx, next }) => {
  const syncApiKey = process.env.SYNC_API_KEY;
  
  // If no API key is configured, fall back to admin authentication
  if (!syncApiKey) {
    if (!ctx.session?.user || ctx.session.user.role !== "ADMIN") {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "SYNC_API_KEY not configured. Admin access required." });
    }
    return next({ ctx });
  }
  
  // Check for API key in headers
  const headers = ctx.headers as Headers;
  const apiKeyHeader = headers.get('x-sync-api-key');
  const authHeader = headers.get('authorization');
  
  const providedKey = apiKeyHeader || (authHeader?.replace('Bearer ', ''));
  
  if (providedKey !== syncApiKey) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or missing API key" });
  }
  
  return next({ ctx });
});
