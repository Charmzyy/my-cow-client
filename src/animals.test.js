import { describe, expect, it } from 'vitest';
import { anglesFor, displayName, readiness } from './animals';

describe('displayName', () => {
  it('uses the name, else the tag', () => {
    expect(displayName({ name: 'Wambui', tag_number: 'KE-1' })).toBe('Wambui');
    expect(displayName({ name: null, tag_number: 'KE-1' })).toBe('Tag KE-1');
  });
});

describe('anglesFor', () => {
  it('only asks for an udder photo on females', () => {
    expect(anglesFor('female').map((a) => a.key)).toContain('udder');
    expect(anglesFor('male').map((a) => a.key)).not.toContain('udder');
  });
});

// Must match Animal::certificationProblems() on the API
describe('readiness', () => {
  it('is all done for a complete record', () => {
    const animal = {
      photos: [{ angle: 'left' }, { angle: 'right' }, { angle: 'ear_tag' }],
      date_of_birth: '2021-03-01',
      county_id: 22,
    };
    expect(readiness(animal).every((step) => step.done)).toBe(true);
  });

  it('accepts an age estimate of 0 months instead of a birth date', () => {
    const steps = readiness({ photos: [], age_estimate_months: 0, county_id: 22 });
    expect(steps.find((s) => s.label.startsWith('Date of birth')).done).toBe(true);
  });

  it('flags missing photos', () => {
    const steps = readiness({ photos: [{ angle: 'left' }], date_of_birth: '2021-03-01', county_id: 22 });
    expect(steps.filter((s) => !s.done).map((s) => s.label)).toEqual(['Left and right side photos', 'Ear tag photo']);
  });
});
