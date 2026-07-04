/**
 * Simple auth helpers without external dependencies
 * Fase 4: Custom authentication implementation
 */

/**
 * Hash password - simple implementation
 * In production, consider bcrypt or argon2
 */
export function hashPassword(password: string, salt?: string): string {
  const actualSalt = salt || Math.random().toString(36).substring(2, 15);
  // Simple hash for MVP: base64(password + salt)
  const combined = password + actualSalt + "presensi-siswa-salt";
  const hash = btoa(combined); // base64 encode
  return `${actualSalt}:${hash}`;
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const [salt, hash] = hashedPassword.split(':');
    const testHash = hashPassword(password, salt);
    return testHash === hashedPassword;
  } catch {
    return false;
  }
}

/**
 * Generate session token
 */
export function generateToken(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const data = `${userId}:${timestamp}:${random}`;
  return btoa(data); // base64 encode
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): { userId: string; timestamp: number } | null {
  try {
    const decoded = atob(token); // base64 decode
    const [userId, timestamp] = decoded.split(':');
    
    // Check if token is expired (7 days)
    const now = Date.now();
    const tokenAge = now - parseInt(timestamp);
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    if (tokenAge > maxAge) {
      return null;
    }
    
    return { userId, timestamp: parseInt(timestamp) };
  } catch {
    return null;
  }
}
