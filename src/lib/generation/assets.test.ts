import { describe, expect, it } from 'vitest';
import { missingAssets, placementInstruction, requestedAssets } from './assets';
import type { SiteFile } from './types';

/**
 * Seven photographs were uploaded, the request carried all seven addresses,
 * the chat said "Saved — 1 file changed", and the site came back with the same
 * empty frames it had before. Nothing was wrong with the save; nothing had
 * ever checked that the pictures were used.
 *
 * Whether a picture landed is not a matter of taste — the address is either in
 * the markup or it is not — so it is checked.
 */

const UPLOAD = 'https://zikoflnsmnnrkgtcfxwc.supabase.co/storage/v1/object/public/assets/p1/1791533954312-ruchi6-.jpeg';
const UPLOAD_2 = 'https://zikoflnsmnnrkgtcfxwc.supabase.co/storage/v1/object/public/assets/p1/1791533952429-wa.jpeg';

const file = (content: string): SiteFile[] => [{ path: 'index.html', content }];

describe('the uploads a request asked for', () => {
  it('finds each one', () => {
    const request = `Add these photos\n\nUse this image (already hosted, link it as-is): ${UPLOAD}\nUse this image (already hosted, link it as-is): ${UPLOAD_2}`;
    expect(requestedAssets(request)).toEqual([UPLOAD, UPLOAD_2]);
  });

  it('counts a logo and a video the same way', () => {
    const request = `This is the business's logo — put it in the site header, linked as-is: ${UPLOAD}`;
    expect(requestedAssets(request)).toEqual([UPLOAD]);
  });

  it('names each address once however many times it is repeated', () => {
    expect(requestedAssets(`${UPLOAD} and again ${UPLOAD}`)).toEqual([UPLOAD]);
  });

  /**
   * "Match the look of this website" names somebody else's page. That address
   * is a reference, not a picture, and it is never supposed to appear in the
   * output — so counting it would report a failure on every single clone.
   */
  it('ignores a website given as a reference', () => {
    const request = `Match the look and layout of this website: https://www.agrumeafarm.it/`;
    expect(requestedAssets(request)).toEqual([]);
  });

  it('finds nothing in a request with no uploads', () => {
    expect(requestedAssets('make the hero darker')).toEqual([]);
  });

  /** Punctuation after an address is punctuation, not part of the address. */
  it('does not swallow the full stop at the end of a sentence', () => {
    expect(requestedAssets(`Use ${UPLOAD}.`)).toEqual([UPLOAD]);
  });
});

describe('which of them did not land', () => {
  const request = `Add these\n${UPLOAD}\n${UPLOAD_2}`;

  it('is nothing when both are in the markup', () => {
    expect(missingAssets(request, file(`<img src="${UPLOAD}"><img src="${UPLOAD_2}">`))).toEqual([]);
  });

  it('names the one that is not', () => {
    expect(missingAssets(request, file(`<img src="${UPLOAD}">`))).toEqual([UPLOAD_2]);
  });

  it('names both when the edit ignored the pictures entirely', () => {
    expect(missingAssets(request, file('<h1>Rani Sarees</h1>'))).toEqual([UPLOAD, UPLOAD_2]);
  });

  it('looks across every file, not just the page', () => {
    const files: SiteFile[] = [
      { path: 'index.html', content: `<img src="${UPLOAD}">` },
      { path: 'styles.css', content: `.hero { background-image: url("${UPLOAD_2}"); }` },
    ];
    expect(missingAssets(request, files)).toEqual([]);
  });

  it('has nothing to say about a request that asked for no pictures', () => {
    expect(missingAssets('make the hero darker', file('<h1>Hi</h1>'))).toEqual([]);
  });
});

describe('the second ask', () => {
  it('names every address that is still missing', () => {
    const instruction = placementInstruction([UPLOAD, UPLOAD_2]);
    expect(instruction).toContain(UPLOAD);
    expect(instruction).toContain(UPLOAD_2);
  });

  /** An empty frame is where a picture goes, and the model has to be told so. */
  it('says what an empty frame looks like and how to fill it', () => {
    const instruction = placementInstruction([UPLOAD]);
    expect(instruction).toContain('media--empty');
    expect(instruction).toContain('<div class="media"><img src=');
  });

  /**
   * A broad "try again" comes back having also rewritten the headings. This
   * one asks for the pictures and nothing else.
   */
  it('asks for nothing else to change', () => {
    expect(placementInstruction([UPLOAD])).toContain('change nothing else');
  });

  it('reads correctly for one picture and for several', () => {
    expect(placementInstruction([UPLOAD])).toContain('One picture was');
    expect(placementInstruction([UPLOAD, UPLOAD_2])).toContain('2 pictures were');
  });
});
