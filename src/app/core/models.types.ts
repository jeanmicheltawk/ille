// Domain types shared across the app.

/** URL slug for a sub-category tab, e.g. "new-faces". Empty = main roster. */
export type Category = string;

export type ModelsBranch = 'men' | 'women';

export interface ModelCategory {
  id: string;
  name: string;
  sortOrder: number;
  published: boolean;
}

export interface Model {
  id: string;
  name: string;
  branch: ModelsBranch;
  category: Category;
  // Agency measurements (cm). All optional so a profile can grow over time.
  height?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  shoeSize?: number;
  hair?: string;
  eyes?: string;
  // The town/city the model is based in. When this is not the agency's
  // home city, the model is treated as "out of town".
  city?: string;
  outOfTown: boolean;
  instagram?: string;
  coverImage: string;      // main portrait on profile page
  gallery: string[];       // extra profile photos (shown below hero, not digitals)
  digitals?: string[];     // digitals gallery page
  pdfUrl?: string;         // downloadable composite PDF
  introVideoUrl?: string;  // introduction video
  catwalkVideoUrl?: string; // catwalk video
  published: boolean;      // client can hide a model without deleting
}

export interface ModelApplication {
  id?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  instagram: string;
  height: number;
  // On submit these become uploaded-file URLs returned by the backend.
  fullShotUrl?: string;
  halfShotUrl?: string;
  closeupShotUrl?: string;
  profileShotUrl?: string;
  createdAt?: string;
}

export interface Booking {
  id?: string;
  modelId?: string;       // optional: a specific model, or general enquiry
  clientName: string;
  company?: string;
  email: string;
  phone: string;
  jobType: string;        // editorial, campaign, runway, e-commerce...
  dates: string;
  location: string;
  budget?: string;
  message: string;
  createdAt?: string;
}

export type ServiceItemType =
  | 'events_heading'
  | 'services_heading'
  | 'event'
  | 'program'
  | 'offering'
  | 'promo';

export type ServiceFieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'textarea'
  | 'dropdown'
  | 'radio'
  | 'date'
  | 'time'
  | 'datetime'
  | 'info';

export interface ServiceFormField {
  id: string;
  type: ServiceFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  width: 'full' | 'half';
  rowGroup?: string;
  sortOrder: number;
  required: boolean;
}

export interface ServiceItem {
  id: string;
  type: ServiceItemType;
  title: string;
  subtitle?: string;
  badge?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  sortOrder: number;
  published: boolean;
  formEnabled?: boolean;
  formTitle?: string;
  backgroundImage?: string;
  formFields?: ServiceFormField[];
}

export interface ServiceSubmission {
  id?: number;
  serviceId: string;
  serviceTitle: string;
  data: Record<string, string>;
  createdAt?: string;
}

export interface EmailSubscriber {
  id?: number;
  email: string;
  topic?: 'models' | 'community';
  active?: boolean;
  source?: string;
  subscribedAt?: string;
}
