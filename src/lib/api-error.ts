import { Prisma } from "@prisma/client";

function isPrismaValidationError(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name?: string }).name === "PrismaClientValidationError"
  );
}

function formatUniqueTarget(target: unknown): string {
  if (Array.isArray(target)) {
    const fields = target.filter((f): f is string => typeof f === "string");
    return fields.join(", ");
  }

  if (typeof target === "string") {
    return target;
  }

  return "";
}

function extractFieldNamesFromMessage(message: string): string[] {
  const names = new Set<string>();

  // Matches: Argument `fieldName`, Field `fieldName`, Unknown argument `fieldName`
  const backtickMatches = message.matchAll(/`([A-Za-z0-9_.]+)`/g);
  for (const match of backtickMatches) {
    const candidate = match[1];
    if (candidate && !candidate.includes(".")) {
      names.add(candidate);
    }
  }

  // Matches: for field: fieldName
  const fieldLabelMatches = message.matchAll(/field\s*:?\s*([A-Za-z0-9_]+)/gi);
  for (const match of fieldLabelMatches) {
    if (match[1]) {
      names.add(match[1]);
    }
  }

  return Array.from(names);
}

function toFieldMessage(message: string, fields: string[] = []): string {
  const uniqueFields = Array.from(new Set(fields.filter(Boolean)));
  const prefix = uniqueFields.length > 0 ? uniqueFields.join(", ") : "general";
  return `${prefix}: ${message}`;
}

function prismaMetaFields(meta: unknown): string[] {
  if (!meta || typeof meta !== "object") return [];
  const obj = meta as Record<string, unknown>;

  const fields: string[] = [];

  const target = obj.target;
  if (Array.isArray(target)) {
    for (const t of target) {
      if (typeof t === "string") fields.push(t);
    }
  } else if (typeof target === "string") {
    fields.push(...target.split(",").map((v) => v.trim()).filter(Boolean));
  }

  const fieldName = obj.field_name;
  if (typeof fieldName === "string") {
    fields.push(fieldName);
  }

  const columnName = obj.column_name;
  if (typeof columnName === "string") {
    fields.push(columnName);
  }

  return Array.from(new Set(fields));
}

export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const metaFields = prismaMetaFields(error.meta);

    switch (error.code) {
      case "P2002": {
        const target = formatUniqueTarget((error.meta as { target?: unknown } | undefined)?.target);
        if (target) {
          return toFieldMessage("value already exists.", target.split(",").map((v) => v.trim()));
        }
        return toFieldMessage("value already exists.", metaFields);
      }
      case "P2003":
        return toFieldMessage("related data is missing or invalid.", metaFields);
      case "P2025":
        return toFieldMessage("record was not found.", metaFields);
      case "P2000":
        return toFieldMessage("value is too long.", metaFields);
      case "P2011":
        return toFieldMessage("required field is missing.", metaFields);
      default:
        return toFieldMessage("database request failed. Please verify your input.", metaFields);
    }
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    const fields = extractFieldNamesFromMessage(error.message || "");
    return toFieldMessage("unknown database error occurred. Please try again.", fields);
  }

  if (error instanceof Prisma.PrismaClientRustPanicError) {
    const fields = extractFieldNamesFromMessage(error.message || "");
    return toFieldMessage("database engine error occurred. Please contact support.", fields);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    const fields = extractFieldNamesFromMessage(error.message || "");
    return toFieldMessage("database connection could not be established.", fields);
  }

  if (isPrismaValidationError(error)) {
    const message =
      error instanceof Error
        ? error.message
        : "Invalid data submitted. Please check required fields and value types.";
    const fields = extractFieldNamesFromMessage(message);
    return toFieldMessage("invalid data submitted. Please check required fields and value types.", fields);
  }

  if (error instanceof Error) {
    const fields = extractFieldNamesFromMessage(error.message || "");
    const finalMessage = error.message || "An unexpected error occurred.";
    return toFieldMessage(finalMessage, fields);
  }

  return toFieldMessage("An unexpected error occurred.", ["general"]);
}
