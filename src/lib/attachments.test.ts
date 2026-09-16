import { describe, expect, it } from 'vitest';
import {
  acceptFor,
  kindForType,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  normaliseReference,
  referenceLabel,
  rejectReason,
} from './attachments';

describe('normaliseReference', () => {
  it('accepts a site someone would actually name', () => {
    expect(normaliseReference('example.com')).toBe('https://example.com/');
    expect(normaliseReference('https://apple.com/watch')).toBe('https://apple.com/watch');
    expect(normaliseReference('   example.com  ')).toBe('https://example.com/');
  });

  // This string is handed to the model and may be fetched server-side, so it
  // must never become a way to point Lumen at something on the inside.
  it.each([
    'http://localhost:3000',
    'http://127.0.0.1/admin',
    'http://10.0.0.5',
    'http://192.168.1.1',
    'http://172.16.4.4',
    'http://169.254.169.254/latest/meta-data',
    'http://0.0.0.0',
    'http://printer.local',
    'http://intranet',
    'file:///etc/passwd',
    'javascript:alert(1)',
    '   ',
  ])('refuses %s', (input) => {
    expect(normaliseReference(input)).toBeNull();
  });

  it('does not over-reach: 172.32 is a public address', () => {
    expect(normaliseReference('http://172.32.0.1')).toBe('http://172.32.0.1/');
  });

  it('labels a reference by its host', () => {
    expect(referenceLabel('https://www.apple.com/watch')).toBe('apple.com');
  });
});

describe('rejectReason', () => {
  it('lets through what a site can use', () => {
    expect(rejectReason({ name: 'a.png', type: 'image/png', size: 1000 })).toBeNull();
    expect(rejectReason({ name: 'a.mp4', type: 'video/mp4', size: 10e6 })).toBeNull();
    expect(rejectReason({ name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES })).toBeNull();
  });

  it.each([
    ['a document', { name: 'a.pdf', type: 'application/pdf', size: 10 }],
    ['an empty file', { name: 'a.png', type: 'image/png', size: 0 }],
    ['an oversized image', { name: 'a.png', type: 'image/png', size: MAX_IMAGE_BYTES + 1 }],
    ['an oversized video', { name: 'a.mp4', type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 }],
  ])('explains why it cannot take %s', (_label, file) => {
    expect(typeof rejectReason(file)).toBe('string');
  });

  // Supabase refuses anything larger by default, and the refusal arrives after
  // the whole upload rather than before it.
  it('stays inside the storage ceiling', () => {
    expect(MAX_VIDEO_BYTES).toBeLessThanOrEqual(52_428_800);
  });
});

describe('acceptFor', () => {
  it('offers the picker exactly what the server takes', () => {
    expect(acceptFor('image')).toContain('image/png');
    expect(acceptFor('image')).not.toContain('video/');
    expect(acceptFor('video')).toContain('video/mp4');
  });

  it('knows an iPhone video when it sees one', () => {
    expect(kindForType('video/quicktime')).toBe('video');
  });
});
