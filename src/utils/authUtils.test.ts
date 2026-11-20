import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLoginInput,
  authenticateUser,
  maskEmail,
  getLoginAuditDetails,
  resetPasswordToDefault,
  DEFAULT_USER_PASSWORD,
} from './authUtils.ts';
import { INITIAL_USERS } from '../data/initialData.ts';

test('validateLoginInput rejects empty inputs', () => {
  const res1 = validateLoginInput('');
  assert.equal(res1.isValid, false);
  assert.ok(res1.error?.includes('masukkan alamat email'));

  const res2 = validateLoginInput('   ');
  assert.equal(res2.isValid, false);
});

test('validateLoginInput accepts valid email and employee number', () => {
  const resEmail = validateLoginInput('hendra.pratama@nexahr.co.id');
  assert.equal(resEmail.isValid, true);

  const resNip = validateLoginInput('NX-001');
  assert.equal(resNip.isValid, true);

  const resLowerNip = validateLoginInput('nx-002');
  assert.equal(resLowerNip.isValid, true);
});

test('authenticateUser finds user by email or NIP', () => {
  const byEmail = authenticateUser(INITIAL_USERS, 'hendra.pratama@nexahr.co.id', DEFAULT_USER_PASSWORD);
  assert.equal(byEmail.isValid, true);
  assert.equal(byEmail.matchedUser?.id, 'user_owner');

  const byNip = authenticateUser(INITIAL_USERS, 'NX-002', DEFAULT_USER_PASSWORD);
  assert.equal(byNip.isValid, true);
  assert.equal(byNip.matchedUser?.id, 'user_hrd');

  const notFound = authenticateUser(INITIAL_USERS, 'unknown@example.com', 'pass');
  assert.equal(notFound.isValid, false);
  assert.ok(notFound.error?.includes('tidak terdaftar'));
});

test('authenticateUser handles inactive accounts gracefully', () => {
  const mockUsers = [
    ...INITIAL_USERS,
    {
      ...INITIAL_USERS[0],
      id: 'inactive_user',
      email: 'inactive@nexahr.co.id',
      employeeNumber: 'NX-999',
      status: 'inactive' as const,
    },
  ];

  const result = authenticateUser(mockUsers, 'inactive@nexahr.co.id', 'pass');
  assert.equal(result.isValid, false);
  assert.ok(result.error?.includes('dinonaktifkan'));
});

test('maskEmail obfuscates email addresses properly', () => {
  const masked = maskEmail('hendra.pratama@nexahr.co.id');
  assert.ok(masked.startsWith('h'));
  assert.ok(masked.includes('***'));
  assert.ok(masked.endsWith('@nexahr.co.id'));

  const short = maskEmail('ab@test.com');
  assert.equal(short, 'ab***@test.com');
});

test('getLoginAuditDetails formats correct metadata', () => {
  const user = INITIAL_USERS[0];
  const audit = getLoginAuditDetails(user, 'credentials');
  assert.equal(audit.actorId, user.id);
  assert.equal(audit.actorName, user.name);
  assert.equal(audit.loginMethod, 'credentials');
  assert.ok(audit.timestamp);
});

test('resetPasswordToDefault sets password to 123456', () => {
  const resetRes = resetPasswordToDefault(INITIAL_USERS, 'hendra.pratama@nexahr.co.id');
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.defaultPassword, '123456');
  assert.equal(resetRes.user?.password, '123456');

  // Verify that the user can now authenticate with 123456
  const authRes = authenticateUser([resetRes.user!], 'hendra.pratama@nexahr.co.id', '123456');
  assert.equal(authRes.isValid, true);
  assert.equal(authRes.matchedUser?.id, 'user_owner');

  // Non-matching password fails
  const wrongRes = authenticateUser([resetRes.user!], 'hendra.pratama@nexahr.co.id', 'wrongPassword!');
  assert.equal(wrongRes.isValid, false);
  assert.ok(wrongRes.error?.includes('123456'));
});

test('resetPasswordToDefault handles non-existent user cleanly', () => {
  const resetRes = resetPasswordToDefault(INITIAL_USERS, 'notfound@example.com');
  assert.equal(resetRes.success, false);
  assert.ok(resetRes.error?.includes('tidak ditemukan'));
});
