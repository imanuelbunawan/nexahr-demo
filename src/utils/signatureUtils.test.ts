import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateSignatureVerificationCode,
  formatSignatureTimestamp,
  isValidSignatureDataUrl,
  createCursiveSignatureSvg,
} from './signatureUtils.ts';

test('generateSignatureVerificationCode produces deterministic and formatted code', () => {
  const code1 = generateSignatureVerificationCode('DOC-001', 'Budi Santoso', 1700000000000);
  const code2 = generateSignatureVerificationCode('DOC-001', 'Budi Santoso', 1700000000000);
  assert.equal(code1, code2);
  assert.match(code1, /^NX-SIG-[0-9A-F]{4}-[0-9A-F]{4}$/);

  // Different signer produces different code
  const code3 = generateSignatureVerificationCode('DOC-001', 'Siti Rahmawati', 1700000000000);
  assert.notEqual(code1, code3);
});

test('formatSignatureTimestamp outputs localized Indonesian date with WIB', () => {
  const testDate = new Date('2026-10-20T14:30:00Z');
  const formatted = formatSignatureTimestamp(testDate);
  assert.match(formatted, /\d{1,2} Oktober 2026, \d{2}:\d{2} WIB/);
});

test('isValidSignatureDataUrl correctly checks PNG data URLs', () => {
  assert.equal(isValidSignatureDataUrl(''), false);
  assert.equal(isValidSignatureDataUrl(null), false);
  assert.equal(isValidSignatureDataUrl('http://example.com/sig.png'), false);
  assert.equal(isValidSignatureDataUrl('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWAQMAAABFq...'), true);
});

test('createCursiveSignatureSvg returns a valid SVG data url', () => {
  const svgDataUrl = createCursiveSignatureSvg('Ahmad Fauzi', 'script', '#1e3a8a');
  assert.equal(svgDataUrl.startsWith('data:image/svg+xml;charset=utf-8,'), true);
  assert.match(svgDataUrl, /Ahmad%20Fauzi/);
});
