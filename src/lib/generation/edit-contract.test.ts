import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EDIT_SYSTEM } from './prompts';
import { StreamingFileParser } from './parser';

/**
 * The three halves of a chat edit that are written in different files and
 * never checked against each other: what the composer sends, what the editor
 * is told, and what the pipeline does with the answer.
 *
 * All three were out of step at once. The composer appended "Use this image:
 * <url>" lines that the editor's instructions never mentioned. The pipeline
 * saved whatever came back, including a response that had been cut off
 * mid-file. And the chat reported "Saved — 1 file changed" either way.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');
const pipelineSource = read('src/lib/generation/pipeline.ts');
/** Only the chat edit. The build pipeline above it creates versions too. */
const pipeline = pipelineSource.slice(pipelineSource.indexOf('export async function runChatEdit'));
const workspace = read('src/components/app/Workspace.tsx');
const chatRoute = read('src/app/api/projects/[id]/chat/route.ts');

describe('what the editor is told about pictures', () => {
  it('says a given address is already hosted and must be used as written', () => {
    expect(EDIT_SYSTEM).toMatch(/already hosted/i);
    expect(EDIT_SYSTEM).toMatch(/exactly as written/i);
  });

  it('says an empty frame is where a picture goes', () => {
    expect(EDIT_SYSTEM).toContain('media--empty');
  });

  /** The markup the kit itself emits, so a filled frame matches its neighbours. */
  it('gives the markup a picture goes in', () => {
    expect(EDIT_SYSTEM).toContain('<div class="media"><img src=');
    expect(EDIT_SYSTEM).toContain('loading="lazy"');
  });

  it('forbids inventing a path', () => {
    expect(EDIT_SYSTEM).toMatch(/never invent a path/i);
  });

  /**
   * The composer's wording and the editor's instructions have to describe the
   * same convention, or the lines it appends are noise to the model.
   */
  it('matches the line the composer actually appends', () => {
    expect(workspace).toContain('already hosted, link it as-is');
  });
});

describe('a response that was cut off', () => {
  /**
   * The parser closes an unterminated file as though it were finished, which
   * is right for a model that forgot the closing marker and catastrophic for
   * one that ran out of room: half an index.html, merged over the real page
   * and saved as a new version.
   */
  it('still parses as a file, which is why the reason has to be checked', () => {
    const parser = new StreamingFileParser();
    parser.push('<<<FILE:index.html>>>\n<!doctype html>\n<html><body><h1>Half a p');
    const files = parser.finish();
    expect(files).toHaveLength(1);
    expect(files[0].content).not.toContain('</html>');
  });

  it('is refused rather than saved', () => {
    expect(pipeline).toContain("finishReason === 'length'");
    // Before the version is written, not after.
    expect(pipeline.indexOf("finishReason === 'length'")).toBeLessThan(
      pipeline.indexOf('const version = await createVersion'),
    );
  });

  it('reads the reason off the stream', () => {
    expect(pipeline).toContain('choice?.finish_reason');
  });
});

describe('an edit that left pictures on the floor', () => {
  it('is asked a second time for exactly those', () => {
    expect(pipeline).toContain('placementInstruction(missing)');
  });

  it('saves the first pass even when the second one fails', () => {
    // The retry is inside its own try/catch: a failed second ask must not
    // throw away an edit that already worked.
    const retry = pipeline.slice(pipeline.indexOf('placementInstruction(missing)'));
    expect(retry.slice(0, 400)).toContain('catch');
  });

  it('is reported as unfinished rather than as a plain success', () => {
    expect(chatRoute).toContain('result.missingAssets.length === 0');
    expect(chatRoute).toMatch(/still not on the page/);
  });
});

describe('the composer', () => {
  it('empties the moment Send is pressed', () => {
    const send = workspace.slice(workspace.indexOf('async function sendMessage'));
    // From where the request is composed: the paths above this one — a queued
    // message, a connector intent — never reach the editor and clear their own
    // state already.
    const sending = send.slice(
      send.indexOf('const composed = withAttachments(trimmed)'),
      send.indexOf('await fetch'),
    );
    expect(sending).toContain("setInput('')");
    expect(sending, 'the chips are left in the composer while the edit runs').toContain(
      'setAttachments([])',
    );
  });

  /** A failed edit must not cost somebody seven uploads. */
  it('puts the files back if nothing was saved', () => {
    expect(workspace).toContain('setAttachments((current) => (current.length > 0 ? current : sent))');
  });
});
