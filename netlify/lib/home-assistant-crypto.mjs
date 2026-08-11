import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey() {
  const encodedKey =
    process.env.HOME_ASSISTANT_TOKEN_ENCRYPTION_KEY;

  if (!encodedKey) {
    throw new Error(
      'HOME_ASSISTANT_TOKEN_ENCRYPTION_KEY ist nicht konfiguriert.',
    );
  }

  const key = Buffer.from(encodedKey, 'base64');

  if (key.length !== 32) {
    throw new Error(
      'HOME_ASSISTANT_TOKEN_ENCRYPTION_KEY muss ein 32-Byte-Base64-Schlüssel sein.',
    );
  }

  return key;
}

function getAdditionalData(homeAssistantUserId) {
  return Buffer.from(
    `homedesk:home-assistant:${homeAssistantUserId}`,
    'utf8',
  );
}

export function encryptHomeAssistantRefreshToken(
  refreshToken,
  homeAssistantUserId,
) {
  if (!refreshToken) {
    throw new Error(
      'Es wurde kein Home-Assistant-Refresh-Token übergeben.',
    );
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(
    ALGORITHM,
    key,
    iv,
  );

  cipher.setAAD(
    getAdditionalData(homeAssistantUserId),
  );

  const encrypted = Buffer.concat([
    cipher.update(refreshToken, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return {
    encrypted:
      encrypted.toString('base64'),

    iv:
      iv.toString('base64'),

    authTag:
      authTag.toString('base64'),
  };
}

export function decryptHomeAssistantRefreshToken(
  encrypted,
  iv,
  authTag,
  homeAssistantUserId,
) {
  const key = getEncryptionKey();

  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64'),
  );

  decipher.setAAD(
    getAdditionalData(homeAssistantUserId),
  );

  decipher.setAuthTag(
    Buffer.from(authTag, 'base64'),
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encrypted, 'base64'),
    ),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
