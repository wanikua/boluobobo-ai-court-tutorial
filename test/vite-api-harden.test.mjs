import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

function safeResolve(root, ...segments) {
  for (const seg of segments) {
    if (seg === '.' || seg === '..') {
      return { ok: false, error: `invalid segment "${seg}"` };
    }
    if (seg.includes('/') || seg.includes('\\')) {
      return { ok: false, error: `invalid segment "${seg}"` };
    }
    if (!SAFE_ID.test(seg)) {
      return { ok: false, error: `invalid segment "${seg}"` };
    }
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(path.join(root, ...segments));
  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    return { ok: false, error: 'path traversal' };
  }
  return { ok: true, resolved };
}

function decodePathSegments(pathname) {
  return pathname.split('/').filter(Boolean).map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });
}

test('SAFE_ID rejects "." and ".."', () => {
  assert.equal(SAFE_ID.test('.'), false);
  assert.equal(SAFE_ID.test('..'), false);
});

test('SAFE_ID rejects strings starting with dot', () => {
  assert.equal(SAFE_ID.test('.hidden'), false);
  assert.equal(SAFE_ID.test('..hidden'), false);
  assert.equal(SAFE_ID.test('..config'), false);
});

test('SAFE_ID accepts normal IDs', () => {
  assert.equal(SAFE_ID.test('abc123'), true);
  assert.equal(SAFE_ID.test('my-id'), true);
  assert.equal(SAFE_ID.test('tournament_01'), true);
  assert.equal(SAFE_ID.test('a'), true);
});

test('SAFE_ID rejects IDs with dots embedded', () => {
  assert.equal(SAFE_ID.test('file.jsonl'), false);
  assert.equal(SAFE_ID.test('a.b'), false);
  assert.equal(SAFE_ID.test('v1.2.3'), false);
});

test('SAFE_ID rejects IDs starting with underscore or dash', () => {
  assert.equal(SAFE_ID.test('_hidden'), false);
  assert.equal(SAFE_ID.test('-foo'), false);
});

test('SAFE_ID rejects empty string', () => {
  assert.equal(SAFE_ID.test(''), false);
});

test('safeResolve accepts valid segments', () => {
  const r = safeResolve('/base', 'dir', 'sub');
  assert.equal(r.ok, true);
  assert.ok(r.resolved.endsWith(path.join('dir', 'sub')));
});

test('safeResolve rejects "." as a segment', () => {
  const r = safeResolve('/base', '.');
  assert.equal(r.ok, false);
  assert.match(r.error, /\./);
});

test('safeResolve rejects ".." as a segment', () => {
  const r = safeResolve('/base', '..');
  assert.equal(r.ok, false);
  assert.match(r.error, /\.\./);
});

test('safeResolve rejects path with embedded slash', () => {
  const r = safeResolve('/base', 'a/b');
  assert.equal(r.ok, false);
});

test('safeResolve rejects path with backslash', () => {
  const r = safeResolve('/base', 'a\\b');
  assert.equal(r.ok, false);
});

test('safeResolve rejects segments with dots', () => {
  const r = safeResolve('/base', 'file.jsonl');
  assert.equal(r.ok, false);
});

test('safeResolve rejects empty segment', () => {
  const r = safeResolve('/base', '');
  assert.equal(r.ok, false);
});

test('decodePathSegments keeps encoded slashes in one segment (caught by safeResolve)', () => {
  const segs = decodePathSegments('/tournaments/id%2F..%2Fetc');
  const joined = segs.join('/');
  // %2F decodes to '/' inside the segment, not as a path separator
  assert.match(joined, /\/\.\.\//);
});

test('decodePathSegments decodes %2e to "."', () => {
  const segs = decodePathSegments('/matches/%2e');
  assert.equal(segs[0], 'matches');
  assert.equal(segs[1], '.');
});

test('decodePathSegments decodes %2e%2e to ".."', () => {
  const segs = decodePathSegments('/match/%2e%2e');
  assert.equal(segs[0], 'match');
  assert.equal(segs[1], '..');
});

test('decodePathSegments handles malformed percent sequences', () => {
  const segs = decodePathSegments('/x/%ZZ');
  assert.equal(segs[1], '%ZZ');
});
