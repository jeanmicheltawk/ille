import { jsPDF } from 'jspdf';
import { Booking, ModelApplication, ServiceSubmission } from './models.types';

export interface SubmissionEntry {
  label: string;
  value: string;
}

export interface FormRecord {
  title: string;
  submittedAt?: string;
  id?: string | number;
  entries: SubmissionEntry[];
}

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'form';
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function csvBlob(rows: string[][]): Blob {
  const bom = '\uFEFF';
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  return new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
}

function singleFilename(record: FormRecord, ext: string): string {
  const date = record.submittedAt?.slice(0, 10) ?? today();
  return `form-${slugify(record.title)}-${record.id ?? 'new'}-${date}.${ext}`;
}

function bulkFilename(prefix: string, ext: string): string {
  return `${prefix}-${today()}.${ext}`;
}

function writeRecordToPdf(doc: jsPDF, record: FormRecord, startNewPage: boolean): number {
  const margin = 20;
  const width = 170;
  let y = margin;

  if (startNewPage) doc.addPage();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(record.title, margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100);
  if (record.submittedAt) {
    doc.text(`Submitted: ${record.submittedAt}`, margin, y);
    y += 12;
  }
  doc.setTextColor(0);

  for (const entry of record.entries) {
    if (y > 265) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(entry.label.toUpperCase(), margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const lines = doc.splitTextToSize(entry.value || '—', width);
    doc.text(lines, margin, y);
    y += lines.length * 6 + 10;
  }

  return y;
}

export function serviceSubmissionToRecord(
  sub: ServiceSubmission,
  entries: SubmissionEntry[],
): FormRecord {
  return {
    title: sub.serviceTitle,
    submittedAt: sub.createdAt,
    id: sub.id,
    entries,
  };
}

export function applicationToRecord(app: ModelApplication): FormRecord {
  const entries: SubmissionEntry[] = [
    { label: 'First Name', value: app.firstName },
    { label: 'Last Name', value: app.lastName },
    { label: 'Date of Birth', value: app.dateOfBirth },
    { label: 'Email', value: app.email },
    { label: 'Phone', value: app.phone },
    { label: 'Instagram', value: app.instagram },
    { label: 'Height', value: app.height ? String(app.height) : '' },
    { label: 'Full Shot', value: app.fullShotUrl ?? '' },
    { label: 'Half Shot', value: app.halfShotUrl ?? '' },
    { label: 'Close-up Shot', value: app.closeupShotUrl ?? '' },
    { label: 'Profile Shot', value: app.profileShotUrl ?? '' },
  ].filter((entry) => entry.value);
  return {
    title: `${app.firstName} ${app.lastName}`.trim() || 'Model Application',
    submittedAt: app.createdAt,
    id: app.id,
    entries,
  };
}

export function bookingToRecord(booking: Booking): FormRecord {
  const entries: SubmissionEntry[] = [
    { label: 'Client Name', value: booking.clientName },
    { label: 'Company', value: booking.company ?? '' },
    { label: 'Email', value: booking.email },
    { label: 'Phone', value: booking.phone },
    { label: 'Job Type', value: booking.jobType },
    { label: 'Dates', value: booking.dates },
    { label: 'Location', value: booking.location },
    { label: 'Budget', value: booking.budget ?? '' },
    { label: 'Model ID', value: booking.modelId ?? '' },
    { label: 'Message', value: booking.message },
  ].filter((entry) => entry.value);
  return {
    title: booking.clientName || 'Model Booking',
    submittedAt: booking.createdAt,
    id: booking.id,
    entries,
  };
}

export function downloadFormPdf(record: FormRecord): void {
  const doc = new jsPDF();
  writeRecordToPdf(doc, record, false);
  doc.save(singleFilename(record, 'pdf'));
}

export function downloadFormExcel(record: FormRecord): void {
  const rows: string[][] = [
    ['Form', record.title],
    ['Submitted', record.submittedAt ?? ''],
    [],
    ['Field', 'Value'],
    ...record.entries.map((entry) => [entry.label, entry.value]),
  ];
  triggerDownload(singleFilename(record, 'csv'), csvBlob(rows));
}

export function downloadAllFormsPdf(records: FormRecord[], filenamePrefix: string): void {
  if (!records.length) return;
  const doc = new jsPDF();
  records.forEach((record, index) => writeRecordToPdf(doc, record, index > 0));
  doc.save(bulkFilename(filenamePrefix, 'pdf'));
}

export function downloadAllFormsExcel(records: FormRecord[], filenamePrefix: string): void {
  if (!records.length) return;
  const labels = [...new Set(records.flatMap((record) => record.entries.map((entry) => entry.label)))];
  const headers = ['Form', 'Submitted', ...labels];
  const rows = records.map((record) => {
    const byLabel = Object.fromEntries(record.entries.map((entry) => [entry.label, entry.value]));
    return [record.title, record.submittedAt ?? '', ...labels.map((label) => byLabel[label] ?? '')];
  });
  triggerDownload(bulkFilename(filenamePrefix, 'csv'), csvBlob([headers, ...rows]));
}

/** @deprecated Use downloadFormPdf with serviceSubmissionToRecord */
export function downloadSubmissionPdf(sub: ServiceSubmission, entries: SubmissionEntry[]): void {
  downloadFormPdf(serviceSubmissionToRecord(sub, entries));
}

/** @deprecated Use downloadFormExcel with serviceSubmissionToRecord */
export function downloadSubmissionExcel(sub: ServiceSubmission, entries: SubmissionEntry[]): void {
  downloadFormExcel(serviceSubmissionToRecord(sub, entries));
}

export function downloadAllServiceSubmissionsPdf(
  submissions: ServiceSubmission[],
  getEntries: (sub: ServiceSubmission) => SubmissionEntry[],
): void {
  downloadAllFormsPdf(
    submissions.map((sub) => serviceSubmissionToRecord(sub, getEntries(sub))),
    'client-bookings-all',
  );
}

export function downloadAllServiceSubmissionsExcel(
  submissions: ServiceSubmission[],
  getEntries: (sub: ServiceSubmission) => SubmissionEntry[],
): void {
  downloadAllFormsExcel(
    submissions.map((sub) => serviceSubmissionToRecord(sub, getEntries(sub))),
    'client-bookings-all',
  );
}
