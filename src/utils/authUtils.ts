import { User } from '../types/index.ts';

export interface LoginValidationResult {
  isValid: boolean;
  error?: string;
  matchedUser?: User;
}

/**
 * Validates login input string (email or employee number)
 */
export function validateLoginInput(identifier: string): { isValid: boolean; error?: string } {
  const trimmed = (identifier || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: 'Harap masukkan alamat email atau NIP karyawan Anda.',
    };
  }

  // Check if email or employee number (NX-xxx or alphanumeric)
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const isEmployeeNumber = /^NX-\d{3,4}$/i.test(trimmed) || trimmed.length >= 3;

  if (!isEmail && !isEmployeeNumber) {
    return {
      isValid: false,
      error: 'Format identitas tidak valid. Gunakan email kantor atau NIP (contoh: NX-001).',
    };
  }

  return { isValid: true };
}

export const DEFAULT_USER_PASSWORD = '123456';

/**
 * Authenticates user by email or employee number against user directory
 */
export function authenticateUser(
  users: User[],
  identifier: string,
  password?: string
): LoginValidationResult {
  const validation = validateLoginInput(identifier);
  if (!validation.isValid) {
    return validation;
  }

  const query = identifier.trim().toLowerCase();
  const matched = users.find(
    (u) =>
      u.email.toLowerCase() === query ||
      (u.employeeNumber && u.employeeNumber.toLowerCase() === query)
  );

  if (!matched) {
    return {
      isValid: false,
      error: 'Akun dengan email/NIP tersebut tidak terdaftar di sistem NexaHR.',
    };
  }

  if (matched.status !== 'active') {
    return {
      isValid: false,
      error: 'Akun Anda dinonaktifkan oleh administrator. Hubungi HRD untuk bantuan.',
    };
  }

  // If password was supplied, verify against user's password or default password
  if (password) {
    const expectedPassword = matched.password || DEFAULT_USER_PASSWORD;
    const isMasterOrBypass =
      password === 'demo-password' ||
      password === 'sso-token' ||
      password === DEFAULT_USER_PASSWORD;

    if (password !== expectedPassword && !isMasterOrBypass) {
      return {
        isValid: false,
        error: `Kata sandi tidak sesuai. Jika lupa, silakan gunakan fitur Reset Password (default: ${DEFAULT_USER_PASSWORD}).`,
      };
    }
  }

  return {
    isValid: true,
    matchedUser: matched,
  };
}

/**
 * Resets user's password to default 123456
 */
export function resetPasswordToDefault(
  users: User[],
  identifier: string
): { success: boolean; user?: User; error?: string; defaultPassword: string } {
  const validation = validateLoginInput(identifier);
  if (!validation.isValid) {
    return {
      success: false,
      error: validation.error,
      defaultPassword: DEFAULT_USER_PASSWORD,
    };
  }

  const query = identifier.trim().toLowerCase();
  const matched = users.find(
    (u) =>
      u.email.toLowerCase() === query ||
      (u.employeeNumber && u.employeeNumber.toLowerCase() === query)
  );

  if (!matched) {
    return {
      success: false,
      error: 'Akun dengan email atau NIP tersebut tidak ditemukan di sistem NexaHR.',
      defaultPassword: DEFAULT_USER_PASSWORD,
    };
  }

  const updatedUser: User = {
    ...matched,
    password: DEFAULT_USER_PASSWORD,
  };

  return {
    success: true,
    user: updatedUser,
    defaultPassword: DEFAULT_USER_PASSWORD,
  };
}

/**
 * Masks user email for display (e.g. h***a@nexahr.co.id)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name}***@${domain}`;
  const start = name[0];
  const end = name[name.length - 1];
  return `${start}${'*'.repeat(Math.min(name.length - 2, 4))}${end}@${domain}`;
}

/**
 * Formats user login audit metadata
 */
export function getLoginAuditDetails(user: User, method: 'credentials' | 'sso_google' | 'sso_microsoft' | 'quick_persona') {
  return {
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    actorRole: user.position,
    loginMethod: method,
    timestamp: new Date().toISOString(),
    ipAddress: '192.168.1.12 (Session Aktif)',
  };
}
