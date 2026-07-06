import { Routes } from '@angular/router';
import { adminGuard } from './core/auth.service';
import { digitalsRouteMatcher } from './core/model.util';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent),
    title: 'ille — Model Management',
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.component').then((m) => m.AboutComponent),
    title: 'About — ille',
  },
  {
    path: 'models',
    loadComponent: () =>
      import('./pages/models/models-picker.component').then((m) => m.ModelsPickerComponent),
    title: 'Models — ille',
  },
  {
    path: 'models/:branch/:category',
    loadComponent: () => import('./pages/models/models.component').then((m) => m.ModelsComponent),
  },
  {
    path: 'models/:branch',
    loadComponent: () => import('./pages/models/models.component').then((m) => m.ModelsComponent),
  },
  {
    path: 'model/:id',
    loadComponent: () =>
      import('./pages/model-detail/model-detail.component').then((m) => m.ModelDetailComponent),
  },
  {
    path: 'model/:id/intro-video',
    loadComponent: () =>
      import('./pages/model-detail/model-video.component').then((m) => m.ModelVideoComponent),
    data: { videoKind: 'intro' },
  },
  {
    path: 'model/:id/catwalk-video',
    loadComponent: () =>
      import('./pages/model-detail/model-video.component').then((m) => m.ModelVideoComponent),
    data: { videoKind: 'catwalk' },
  },
  {
    path: 'become-a-model',
    loadComponent: () =>
      import('./pages/become-a-model/become-a-model.component').then((m) => m.BecomeAModelComponent),
    title: 'Become a Model — ille',
  },
  {
    path: 'book',
    loadComponent: () =>
      import('./pages/book-a-model/book-a-model.component').then((m) => m.BookAModelComponent),
    title: 'Book a Model — ille',
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./pages/services/services.component').then((m) => m.ServicesComponent),
    title: 'Services — ille',
  },
  {
    path: 'services/:id/book',
    loadComponent: () =>
      import('./pages/services/service-book.component').then((m) => m.ServiceBookComponent),
  },
  {
    path: 'newsletter/unsubscribe',
    loadComponent: () =>
      import('./pages/newsletter-unsubscribe/newsletter-unsubscribe.component').then(
        (m) => m.NewsletterUnsubscribeComponent,
      ),
    title: 'Unsubscribe — ille',
  },
  {
    path: 'admin/login',
    loadComponent: () =>
      import('./pages/admin/admin-login.component').then((m) => m.AdminLoginComponent),
    title: 'Admin — ille',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-dashboard.component').then((m) => m.AdminDashboardComponent),
    title: 'Dashboard — ille',
  },
  {
    matcher: digitalsRouteMatcher,
    loadComponent: () =>
      import('./pages/model-detail/model-digitals.component').then((m) => m.ModelDigitalsComponent),
  },
  { path: '**', redirectTo: '' },
];
