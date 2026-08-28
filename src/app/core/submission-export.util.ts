import { jsPDF } from 'jspdf';
import { Booking, ModelApplication, ServiceFormField, ServiceSubmission } from './models.types';
import { displayTitleFromData, submissionEntriesFromData } from './form-field.util';

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

export function customFormSubmissionToRecord(
  sub: { formTitle: string; createdAt?: string; id?: string | number; data?: Record<string, string> },
  fields?: ServiceFormField[],
): FormRecord {
  return {
    title: sub.formTitle,
    submittedAt: sub.createdAt,
    id: sub.id,
    entries: submissionEntriesFromData(sub.data, fields || []),
  };
}

function applicationData(app: ModelApplication): Record<string, string> {
  const data: Record<string, string> = { ...(app.data || {}) };
  if (app.firstName) data.firstName = data.firstName || app.firstName;
  if (app.lastName) data.lastName = data.lastName || app.lastName;
  if (app.dateOfBirth) data.dateOfBirth = data.dateOfBirth || app.dateOfBirth;
  if (app.email) data.email = data.email || app.email;
  if (app.phone) data.phone = data.phone || app.phone;
  if (app.instagram) data.instagram = data.instagram || app.instagram;
  if (app.height) data.height = data.height || String(app.height);
  if (app.fullShotUrl) data.fullShot = data.fullShot || app.fullShotUrl;
  if (app.halfShotUrl) data.halfShot = data.halfShot || app.halfShotUrl;
  if (app.closeupShotUrl) data.closeupShot = data.closeupShot || app.closeupShotUrl;
  if (app.profileShotUrl) data.profileShot = data.profileShot || app.profileShotUrl;
  return data;
}

function bookingData(booking: Booking): Record<string, string> {
  const data: Record<string, string> = { ...(booking.data || {}) };
  if (booking.clientName) data.clientName = data.clientName || booking.clientName;
  if (booking.company) data.company = data.company || booking.company;
  if (booking.email) data.email = data.email || booking.email;
  if (booking.phone) data.phone = data.phone || booking.phone;
  if (booking.jobType) data.jobType = data.jobType || booking.jobType;
  if (booking.dates) data.dates = data.dates || booking.dates;
  if (booking.location) data.location = data.location || booking.location;
  if (booking.budget) data.budget = data.budget || booking.budget;
  if (booking.message) data.message = data.message || booking.message;
  if (booking.modelId) data.modelId = data.modelId || booking.modelId;
  return data;
}

export function applicationToRecord(app: ModelApplication, fields?: ServiceFormField[]): FormRecord {
  const data = applicationData(app);
  const entries = fields?.length
    ? submissionEntriesFromData(data, fields)
    : [
      { label: 'First Name', value: data.firstName ?? '' },
      { label: 'Last Name', value: data.lastName ?? '' },
      { label: 'Date of Birth', value: data.dateOfBirth ?? '' },
      { label: 'Email', value: data.email ?? '' },
      { label: 'Phone', value: data.phone ?? '' },
      { label: 'Instagram', value: data.instagram ?? '' },
      { label: 'Height', value: data.height ?? '' },
      { label: 'Full Shot', value: data.fullShot ?? '' },
      { label: 'Half Shot', value: data.halfShot ?? '' },
      { label: 'Close-up Shot', value: data.closeupShot ?? '' },
      { label: 'Profile Shot', value: data.profileShot ?? '' },
    ].filter((entry) => entry.value);
  return {
    title: displayTitleFromData(data, 'Model Application'),
    submittedAt: app.createdAt,
    id: app.id,
    entries,
  };
}

export function bookingToRecord(booking: Booking, fields?: ServiceFormField[]): FormRecord {
  const data = bookingData(booking);
  const entries = fields?.length
    ? submissionEntriesFromData(data, fields)
    : [
      { label: 'Client Name', value: data.clientName ?? '' },
      { label: 'Company', value: data.company ?? '' },
      { label: 'Email', value: data.email ?? '' },
      { label: 'Phone', value: data.phone ?? '' },
      { label: 'Job Type', value: data.jobType ?? '' },
      { label: 'Dates', value: data.dates ?? '' },
      { label: 'Location', value: data.location ?? '' },
      { label: 'Budget', value: data.budget ?? '' },
      { label: 'Model ID', value: data.modelId ?? '' },
      { label: 'Message', value: data.message ?? '' },
    ].filter((entry) => entry.value);
  return {
    title: displayTitleFromData(data, 'Model Booking'),
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
