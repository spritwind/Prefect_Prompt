export type PlaceholderType =
  | "text"
  | "multiline"
  | "number"
  | "select"
  | "boolean"
  | "multiselect"
  | "date"
  | "code"
  | "list"
  | "file-ref";

interface BaseSchema {
  label: string;
  hint?: string;
}

export type PlaceholderSchema =
  | (BaseSchema & { type: "text"; default?: string })
  | (BaseSchema & { type: "multiline"; default?: string })
  | (BaseSchema & { type: "number"; default?: number; suggestions?: number[] })
  | (BaseSchema & { type: "select"; options: (string | number)[]; default?: string | number })
  | (BaseSchema & { type: "boolean"; default?: boolean })
  | (BaseSchema & { type: "multiselect"; options: string[]; default?: string[] })
  | (BaseSchema & { type: "date"; default?: string })
  | (BaseSchema & { type: "code"; language?: string; default?: string })
  | (BaseSchema & { type: "list"; default?: string[] })
  | (BaseSchema & { type: "file-ref"; default?: string });

export type PlaceholderValue =
  | string
  | number
  | boolean
  | string[]
  | undefined;

export type PlaceholderValues = Record<string, PlaceholderValue>;
