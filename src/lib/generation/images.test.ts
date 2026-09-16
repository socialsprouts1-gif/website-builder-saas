import { describe, expect, it } from 'vitest';
import { imageInstruction, unplacedImages } from './images';

const BUCKET = 'https://x.supabase.co/storage/v1/object/public/project-assets/p1';

describe('unplacedImages', () => {
  it('keeps the ones the site does not link to', () => {
    const made = [`${BUCKET}/generated-1-aaa.png`, `${BUCKET}/generated-2-bbb.png`];
    const site = [`<img src="${BUCKET}/generated-1-aaa.png" alt="Hero">`];
    expect(unplacedImages(made, site)).toEqual([`${BUCKET}/generated-2-bbb.png`]);
  });

  it('counts a picture as placed when only the host differs', () => {
    const made = [`${BUCKET}/generated-1-aaa.png`];
    const site = ['<img src="https://cdn.example.com/generated-1-aaa.png">'];
    expect(unplacedImages(made, site)).toEqual([]);
  });

  it('returns everything when the site has none of them', () => {
    const made = [`${BUCKET}/generated-1-aaa.png`, `${BUCKET}/generated-2-bbb.png`];
    expect(unplacedImages(made, ['<h1>Hello</h1>'])).toEqual(made);
  });

  it('has nothing to offer when nothing was made', () => {
    expect(unplacedImages([], ['<img src="anything.png">'])).toEqual([]);
  });
});

describe('imageInstruction', () => {
  it('says what each picture is for when it knows', () => {
    const text = imageInstruction([{ url: 'a.png', role: 'the hero image' }]);
    expect(text).toContain('- a.png — for the hero image');
  });

  /** Read back from storage there is no role, and a dangling em-dash read as a bug. */
  it('lists a picture plainly when it does not', () => {
    const text = imageInstruction([{ url: 'a.png' }]);
    expect(text).toContain('- a.png');
    expect(text).not.toContain('— for');
  });
});
