// Certification request statuses (match CertificationRequest::TRANSITIONS on the API).
// Every status shows as icon + words, never colour alone.
export const REQUEST_STATUS = {
  submitted: { label: 'Waiting for an officer', chip: 'mc-chip-gold', icon: 'clock' },
  assigned: { label: 'Officer assigned', chip: 'mc-chip-gold', icon: 'user' },
  in_review: { label: 'Under review', chip: 'mc-chip-gold', icon: 'review' },
  needs_info: { label: 'More info needed', chip: 'mc-chip-ochre', icon: 'alert' },
  approved: { label: 'Certified', chip: 'mc-chip-green', icon: 'award' },
  rejected: { label: 'Not certified', chip: 'mc-chip-ochre', icon: 'x' },
  cancelled: { label: 'Cancelled', chip: 'mc-chip-ink', icon: 'x' },
};

export const OPEN_STATUSES = ['submitted', 'assigned', 'in_review', 'needs_info'];

export const INSPECTION = { photo: 'Photo review', visit: 'Farm visit' };

export const CADRES = {
  vet: 'Veterinary surgeon',
  para_vet: 'Veterinary para-professional',
  extension: 'Livestock extension officer',
};

export function statusOf(request) {
  return REQUEST_STATUS[request?.status] || null;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}
