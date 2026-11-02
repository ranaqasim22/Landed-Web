import { createHash, randomBytes } from 'node:crypto';

export function generateToken() {
  return randomBytes(32).toString('base64url');
}

// These tokens are already long and random, so a fast hash is enough. Only hashes
// are stored, which keeps a leaked database from being usable as live sessions.
export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
