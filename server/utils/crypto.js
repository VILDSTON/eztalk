import crypto from 'crypto';

// Get or derive a 32-byte encryption key from environment or fallback
function getEncryptionKey() {
  const secret = process.env.ENCRYPTION_SECRET || 'eztalk-secure-aes256-encryption-key-2026-fallback';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes recommended for GCM

/**
 * Encrypts plaintext message using AES-256-GCM.
 * Output format: `${ivHex}:${authTagHex}:${encryptedHex}`
 */
export function encryptMessage(plainText) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    return plainText;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('Error encrypting message:', err);
    return plainText;
  }
}

/**
 * Decrypts AES-256-GCM ciphertext.
 * Backward compatible: returns original text if legacy plaintext or decryption fails.
 */
export function decryptMessage(cipherText) {
  if (typeof cipherText !== 'string' || cipherText.length === 0) {
    return cipherText;
  }

  // Check if string matches ${ivHex}:${authTagHex}:${encryptedHex} format
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    return cipherText; // Legacy plaintext message
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  if (!ivHex || !authTagHex || !encryptedHex) {
    return cipherText;
  }

  // Ensure parts are valid hex
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(ivHex) || !hexRegex.test(authTagHex) || !hexRegex.test(encryptedHex)) {
    return cipherText;
  }

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // Decryption failed (e.g. key changed or corrupted legacy format) -> safely return original text
    return cipherText;
  }
}
