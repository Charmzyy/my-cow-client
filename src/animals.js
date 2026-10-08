// Display helpers for animal records (matches AnimalController / AnimalPhoto on the API).
import { breedLabel } from './breeds';

export const PHOTO_ANGLES = [
  { key: 'left', label: 'Left side', hint: 'Whole animal, head to tail, standing side-on', ai: true, recommended: true },
  { key: 'right', label: 'Right side', hint: 'Whole animal from the other side', ai: true, recommended: true },
  { key: 'front', label: 'Front', hint: 'Facing you, head and chest in frame', ai: true },
  { key: 'rear', label: 'Rear', hint: 'From behind, hips and legs visible', ai: true },
  { key: 'face', label: 'Head', hint: 'Close-up of the head and horns', ai: true },
  { key: 'ear_tag', label: 'Ear tag', hint: 'Close-up where the tag number is readable' },
  { key: 'udder', label: 'Udder', hint: 'Udder and teats from the side', femaleOnly: true },
];

export function anglesFor(sex) {
  return PHOTO_ANGLES.filter((a) => !a.femaleOnly || sex === 'female');
}

export const PURPOSES = { dairy: 'Dairy', beef: 'Beef', dual: 'Dual-purpose' };
export const SEXES = { female: 'Female', male: 'Male' };

export function displayName(animal) {
  return animal?.name ? `${animal.name}` : `Tag ${animal?.tag_number ?? ''}`;
}

// "3 yrs 2 mo" from a date of birth, or "~18 mo (est.)" from an estimate
export function ageText(animal) {
  let months = null;
  let estimated = false;
  if (animal?.date_of_birth) {
    const dob = new Date(animal.date_of_birth);
    const now = new Date();
    months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (now.getDate() < dob.getDate()) months -= 1;
  } else if (animal?.age_estimate_months != null) {
    months = animal.age_estimate_months;
    estimated = true;
  }
  if (months == null || months < 0) return 'Age unknown';
  const y = Math.floor(months / 12);
  const m = months % 12;
  const text = y ? `${y} yr${y > 1 ? 's' : ''}${m ? ` ${m} mo` : ''}` : `${m} mo`;
  return estimated ? `~${text} (est.)` : text;
}

export function coverPhoto(animal) {
  const photos = animal?.photos || [];
  return photos.find((p) => p.angle === 'left') || photos.find((p) => p.angle === 'right') || photos[0] || null;
}

function val(v, suffix = '') {
  return v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`;
}

// The full record as titled [label, value] groups, shared by the farmer's profile and the officer's review
export function recordSections(a) {
  if (!a) return [];
  return [
    {
      title: 'Identity',
      rows: [
        ['Ear tag', a.tag_number], ['National ID', val(a.national_id)], ['Sex', SEXES[a.sex]],
        ['Age', ageText(a)], ['Date of birth', val(a.date_of_birth)], ['Colour & markings', val(a.colour)],
        ['Purpose', val(PURPOSES[a.purpose])], ['Breed (owner)', a.breed_claimed ? breedLabel(a.breed_claimed) : '—'],
      ],
    },
    {
      title: 'Breeding & production',
      rows: [
        ['Sire', [a.sire_name, a.sire_tag].filter(Boolean).join(' · ') || '—'],
        ['Dam', [a.dam_name, a.dam_tag].filter(Boolean).join(' · ') || '—'],
        ['AI straw code', val(a.ai_straw_code)], ['Weight', val(a.weight_kg, ' kg')],
        ['Body condition', val(a.body_condition_score, ' / 5')],
        ...(a.sex === 'female' ? [['Lactation no.', val(a.lactation_number)], ['Milk per day', val(a.milk_litres_per_day, ' L')]] : []),
      ],
    },
    {
      title: 'Location',
      rows: [
        ['County', a.county?.name || '—'], ['Sub-county', val(a.sub_county)], ['Ward', val(a.ward)],
        ['Village / farm', val(a.village)], ['GPS', a.latitude ? `${a.latitude}, ${a.longitude}` : '—'],
      ],
    },
  ];
}

// What an officer will need before this animal can be certified (enforced server-side in Phase 1B)
export function readiness(animal) {
  const angles = new Set((animal?.photos || []).map((p) => p.angle));
  return [
    { label: 'Left and right side photos', done: angles.has('left') && angles.has('right') },
    { label: 'Ear tag photo', done: angles.has('ear_tag') },
    { label: 'Date of birth or age estimate', done: !!animal?.date_of_birth || animal?.age_estimate_months != null },
    { label: 'County and location', done: !!animal?.county_id },
  ];
}
