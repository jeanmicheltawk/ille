import { ServiceFormField } from './models.types';

export function groupFormFields(fields: ServiceFormField[]): ServiceFormField[][] {
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const rows: ServiceFormField[][] = [];
  const used = new Set<string>();

  for (const field of sorted) {
    if (used.has(field.id)) continue;
    if (field.width === 'half' && field.rowGroup) {
      const partner = sorted.find(
        (f) => f.id !== field.id && f.rowGroup === field.rowGroup && f.width === 'half' && !used.has(f.id),
      );
      if (partner) {
        rows.push([field, partner].sort((a, b) => a.sortOrder - b.sortOrder));
        used.add(field.id);
        used.add(partner.id);
        continue;
      }
    }
    rows.push([field]);
    used.add(field.id);
  }
  return rows;
}

export function submissionEntriesFromData(
  data: Record<string, string> | undefined,
  fields: ServiceFormField[],
): { label: string; value: string }[] {
  const payload = data || {};
  const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
  const entries: { label: string; value: string }[] = [];
  const seen = new Set<string>();

  for (const field of sorted) {
    if (field.type === 'info' || seen.has(field.id)) continue;
    seen.add(field.id);
    const value = payload[field.id];
    if (value != null && String(value).trim()) {
      entries.push({ label: field.label || field.id, value: String(value) });
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (seen.has(key) || !String(value ?? '').trim()) continue;
    const label = key.replace(/([A-Z])/g, ' $1').replace(/[-_]/g, ' ').trim();
    entries.push({ label: label.charAt(0).toUpperCase() + label.slice(1), value: String(value) });
  }

  return entries;
}

export function displayTitleFromData(
  data: Record<string, string> | undefined,
  fallback: string,
): string {
  if (!data) return fallback;
  const name = [data.firstName, data.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  if (data.clientName?.trim()) return data.clientName.trim();
  if (data.email?.trim()) return data.email.trim();
  return fallback;
}
