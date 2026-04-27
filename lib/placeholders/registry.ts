import type { PlaceholderType } from "./types";

export interface TypeDescriptor {
  /** Human-readable name shown in UI */
  label: string;
  /** Whether this type is implemented in the MVP UI */
  mvp: boolean;
}

export const PLACEHOLDER_TYPES: Record<PlaceholderType, TypeDescriptor> = {
  text: { label: "Text", mvp: true },
  multiline: { label: "Multiline", mvp: true },
  number: { label: "Number", mvp: true },
  select: { label: "Select", mvp: true },
  boolean: { label: "Boolean", mvp: true },
  multiselect: { label: "Multiselect", mvp: false },
  date: { label: "Date", mvp: false },
  code: { label: "Code", mvp: false },
  list: { label: "List", mvp: false },
  "file-ref": { label: "File Reference", mvp: false },
};

export function isMvpType(type: PlaceholderType): boolean {
  return PLACEHOLDER_TYPES[type].mvp;
}
