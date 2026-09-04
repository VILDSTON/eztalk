import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 байт — строгий стандарт для AES-GCM
const HEX_REGEX = /^[0-9a-fA-F]+$/;

// Кэшируем ключ один раз в памяти процесса, чтобы не тратить CPU на SHA256 при каждом сообщении
const ENCRYPTION_KEY = (() => {
  const secret = process.env.ENCRYPTION_SECRET || 'eztalk-secure-aes256-encryption-key-2026-fallback';
  return crypto.createHash('sha256').update(String(secret)).digest();
})();

/**
 * Шифрует текст сообщения с использованием AES-256-GCM.
 * Формат: `${ivHex}:${authTagHex}:${encryptedHex}`
 */
export function encryptMessage(plainText) {
  if (typeof plainText !== 'string' || plainText.length === 0) {
    return plainText;
  }

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (err) {
    console.error('[Crypto] Encryption error:', err);
    return plainText;
  }
}

/**
 * Расшифровывает шифротекст AES-256-GCM.
 * Если сообщение старого формата (не зашифровано), возвращает его как есть.
 */
export function decryptMessage(cipherText) {
  if (typeof cipherText !== 'string' || cipherText.length === 0) {
    return cipherText;
  }

  // Быстрая проверка структуры: ровно две двоеточия
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    return cipherText; // Обычный текст без шифрования
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  // Проверка валидности длины компонентов (IV 12 байт = 24 hex, Tag 16 байт = 32 hex)
  if (ivHex.length !== 24 || authTagHex.length !== 32 || !encryptedHex) {
    return cipherText;
  }

  if (!HEX_REGEX.test(ivHex) || !HEX_REGEX.test(authTagHex) || !HEX_REGEX.test(encryptedHex)) {
    return cipherText;
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch {
    // Ошибка авторизационного тега (данные повреждены или подделаны)
    return '[Encrypted message corrupted or key mismatched]';
  }
}
