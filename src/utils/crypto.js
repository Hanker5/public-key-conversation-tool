// --- Buffer helpers ---

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// --- Key generation ---

export async function generateKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt'],
  )
}

// --- Export as PEM (for sharing / display) ---

export async function exportPublicKeyAsPem(publicKey) {
  const spki = await crypto.subtle.exportKey('spki', publicKey)
  const b64 = bufferToBase64(spki)
  const lines = b64.match(/.{1,64}/g).join('\n')
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`
}

export async function exportPrivateKeyAsPem(privateKey) {
  const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
  const b64 = bufferToBase64(pkcs8)
  const lines = b64.match(/.{1,64}/g).join('\n')
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----`
}

// --- Export as JWK (for localStorage persistence) ---

export async function exportKeyPairAsJwk(keyPair) {
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  return { publicJwk, privateJwk }
}

export async function importKeyPairFromJwk({ publicJwk, privateJwk }) {
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  )
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt'],
  )
  return { publicKey, privateKey }
}

// --- Import a PEM public key (from a friend) ---

export async function importPublicKeyFromPem(pem) {
  const b64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '')
  const buffer = base64ToBuffer(b64)
  return crypto.subtle.importKey(
    'spki',
    buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt'],
  )
}

// --- Hybrid encryption: RSA-OAEP wraps an AES-GCM key ---
// Produces a single base64 string safe to paste anywhere.

export async function encryptMessage(plaintext, recipientPublicKey) {
  // 1. One-time AES-256-GCM key
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )

  // 2. Random 96-bit IV
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // 3. Encrypt message with AES-GCM
  const encoder = new TextEncoder()
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(plaintext),
  )

  // 4. Wrap the AES key with recipient's RSA public key
  const rawAesKey = await crypto.subtle.exportKey('raw', aesKey)
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    rawAesKey,
  )

  // 5. Bundle everything into a compact base64 payload
  const payload = {
    v: 1,
    k: bufferToBase64(encryptedKey),
    i: bufferToBase64(iv),
    c: bufferToBase64(ciphertext),
  }

  return btoa(JSON.stringify(payload))
}

// --- Hybrid decryption ---

export async function decryptMessage(encryptedData, privateKey) {
  let payload
  try {
    payload = JSON.parse(atob(encryptedData))
  } catch {
    throw new Error('Invalid message format — make sure you pasted the full encrypted block.')
  }

  if (payload.v !== 1) {
    throw new Error(`Unknown message version: ${payload.v}`)
  }

  // 1. Unwrap the AES key using our RSA private key
  const rawAesKey = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    privateKey,
    base64ToBuffer(payload.k),
  )

  // 2. Re-import the AES key
  const aesKey = await crypto.subtle.importKey(
    'raw',
    rawAesKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )

  // 3. Decrypt the ciphertext
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBuffer(payload.i) },
    aesKey,
    base64ToBuffer(payload.c),
  )

  return new TextDecoder().decode(plainBuffer)
}
