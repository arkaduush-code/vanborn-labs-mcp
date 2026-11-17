import { z, type ZodTypeAny } from "zod";

type JsonSchema = Record<string, unknown>;

const APIFY_ONLY = new Set([
  "editor",
  "prefill",
  "schemaVersion",
  "sectionCaption",
  "sectionDescription",
  "enumTitles",
  "nullable",
  "resourceType",
  "unit",
  "groupCaption",
  "groupDescription",
  "example",
  "prefillValue",
]);

/**
 * Strip Apify-specific fields and return a plain JSON Schema object
 * suitable for documentation or further conversion.
 */
export function toJsonSchema(schema: JsonSchema): JsonSchema {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return schema;
  const out: JsonSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (APIFY_ONLY.has(key) || key === "schemaVersion") continue;
    if (key === "properties" && value && typeof value === "object") {
      const props: Record<string, JsonSchema> = {};
      for (const [name, prop] of Object.entries(value as Record<string, JsonSchema>)) {
        props[name] = toJsonSchema(prop);
      }
      out.properties = props;
      continue;
    }
    if (key === "items" && value && typeof value === "object") {
      out.items = toJsonSchema(value as JsonSchema);
      continue;
    }
    if ((key === "anyOf" || key === "oneOf" || key === "allOf") && Array.isArray(value)) {
      out[key] = value.map((item) =>
        item && typeof item === "object" ? toJsonSchema(item as JsonSchema) : item,
      );
      continue;
    }
    out[key] = value;
  }
  if (schema.nullable === true) {
    const t = out.type;
    if (typeof t === "string") out.type = [t, "null"];
    else if (Array.isArray(t) && !t.includes("null")) out.type = [...t, "null"];
  }
  if (Array.isArray(schema.enumTitles) && Array.isArray(schema.enum) && !out.description) {
    // keep existing description if present; enum titles are already in the original description often
  }
  if (Array.isArray(schema.enumTitles) && Array.isArray(schema.enum) && typeof out.description === "string") {
    const pairs = (schema.enum as unknown[])
      .map((value, i) => {
        const title = (schema.enumTitles as unknown[])[i];
        return title ? `${String(value) || "(empty)"} = ${String(title)}` : null;
      })
      .filter(Boolean);
    if (pairs.length) out.description = `${out.description} Options: ${pairs.join("; ")}.`;
  }
  return out;
}

/** Override the JSON Schema / Zod default for the actor's limit field. */
export function withLimitDefault(schema: JsonSchema, limitField: string | undefined, defaultMaxItems: number): JsonSchema {
  if (!limitField) return schema;
  const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
  if (!props[limitField] || typeof props[limitField] !== "object") return schema;
  return {
    ...schema,
    properties: {
      ...props,
      [limitField]: {
        ...props[limitField],
        default: defaultMaxItems,
        description: `${String(props[limitField].description ?? "Maximum items to return.")} Defaults to ${defaultMaxItems} in this MCP server to keep runs cheap.`,
      },
    },
  };
}

export function jsonSchemaToZod(schema: JsonSchema): ZodTypeAny {
  if (!schema || typeof schema !== "object") return z.unknown();

  if (Array.isArray(schema.anyOf) && schema.anyOf.length) {
    const variants = (schema.anyOf as JsonSchema[]).map((item) => jsonSchemaToZod(item));
    return variants.length === 1 ? variants[0] : z.union(variants as [ZodTypeAny, ZodTypeAny, ...ZodTypeAny[]]);
  }

  const types = Array.isArray(schema.type) ? (schema.type as string[]) : schema.type ? [schema.type as string] : [];
  const nullable = types.includes("null") || schema.nullable === true;
  const primary = types.find((t) => t !== "null") ?? (schema.enum ? "string" : schema.properties ? "object" : undefined);

  let zodType = buildPrimary(primary, schema);
  if (typeof schema.description === "string" && schema.description) {
    zodType = zodType.describe(schema.description);
  }
  if (schema.default !== undefined) {
    zodType = zodType.default(schema.default);
  } else if (nullable) {
    zodType = zodType.nullable().optional();
  }
  return zodType;
}

function buildPrimary(primary: string | undefined, schema: JsonSchema): ZodTypeAny {
  if (Array.isArray(schema.enum) && schema.enum.length > 0 && (primary === "string" || primary === undefined)) {
    const values = schema.enum.map((v) => String(v));
    if (values.every((v) => typeof v === "string")) {
      return z.enum(values as [string, ...string[]]);
    }
  }

  switch (primary) {
    case "string": {
      let t = z.string();
      if (typeof schema.minLength === "number") t = t.min(schema.minLength);
      if (typeof schema.maxLength === "number") t = t.max(schema.maxLength);
      if (typeof schema.pattern === "string") {
        try {
          t = t.regex(new RegExp(schema.pattern));
        } catch {
          // invalid pattern — skip
        }
      }
      return t;
    }
    case "integer": {
      let t = z.number().int();
      if (typeof schema.minimum === "number") t = t.min(schema.minimum);
      if (typeof schema.maximum === "number") t = t.max(schema.maximum);
      return t;
    }
    case "number": {
      let t = z.number();
      if (typeof schema.minimum === "number") t = t.min(schema.minimum);
      if (typeof schema.maximum === "number") t = t.max(schema.maximum);
      return t;
    }
    case "boolean":
      return z.boolean();
    case "array": {
      const items = schema.items && typeof schema.items === "object" ? jsonSchemaToZod(schema.items as JsonSchema) : z.unknown();
      let t = z.array(items);
      if (typeof schema.minItems === "number") t = t.min(schema.minItems);
      if (typeof schema.maxItems === "number") t = t.max(schema.maxItems);
      return t;
    }
    case "object":
    default: {
      const props = (schema.properties ?? {}) as Record<string, JsonSchema>;
      const required = new Set(Array.isArray(schema.required) ? (schema.required as string[]) : []);
      const shape: Record<string, ZodTypeAny> = {};
      for (const [name, prop] of Object.entries(props)) {
        let field = jsonSchemaToZod(prop);
        if (typeof prop.description === "string" && !("description" in (field._def ?? {}))) {
          // description already applied inside jsonSchemaToZod
        }
        const hasDefault = prop.default !== undefined || (field as { _def?: { defaultValue?: unknown } })._def?.defaultValue !== undefined;
        // jsonSchemaToZod already added .default() when present, which makes the key optional in z.object
        if (!required.has(name) && prop.default === undefined) {
          field = field.optional();
        }
        void hasDefault;
        shape[name] = field;
      }
      // Unknown keys (future actor fields) should still pass through to Apify.
      return z.object(shape).passthrough();
    }
  }
}

export function actorInputZod(schema: JsonSchema, limitField: string | undefined, defaultMaxItems: number): ZodTypeAny {
  const cleaned = withLimitDefault(toJsonSchema(schema), limitField, defaultMaxItems);
  return jsonSchemaToZod(cleaned);
}
