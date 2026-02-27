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
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
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
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  )
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    privateJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
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
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  )
}

// --- Hybrid encryption: ECDH key agreement + AES-GCM ---
// Produces a compact binary base64 string safe to paste anywhere.
// Format: [0x02 version][65B ephemeral P-256 pubkey][12B IV][ciphertext+tag]

export async function encryptMessage(plaintext, recipientPublicKey) {
  // 1. One-time ephemeral P-256 key pair
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  )

  // 2. Derive shared AES-256-GCM key (ephemeral private × recipient public)
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  // 3. Random 96-bit IV + encrypt message
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    new TextEncoder().encode(plaintext),
  )

  // 4. Export ephemeral public key as raw bytes (65 bytes uncompressed)
  const ephemeralPubRaw = await crypto.subtle.exportKey('raw', ephemeral.publicKey)

  // 5. Pack into binary: [0x02][ephemeral pubkey 65B][iv 12B][ciphertext]
  const blob = new Uint8Array(1 + 65 + 12 + ciphertext.byteLength)
  blob[0] = 0x02
  blob.set(new Uint8Array(ephemeralPubRaw), 1)
  blob.set(iv, 66)
  blob.set(new Uint8Array(ciphertext), 78)
  return bufferToBase64(blob.buffer)
}

// --- Hybrid decryption ---

export async function decryptMessage(encryptedData, privateKey) {
  let bytes
  try {
    bytes = new Uint8Array(base64ToBuffer(encryptedData))
  } catch {
    throw new Error('Invalid message format — make sure you pasted the full encrypted block.')
  }

  // Backwards compat: old v1 messages decode to JSON starting with '{'
  if (bytes[0] === 0x7b) {
    throw new Error('This message was encrypted with an older version of CryptoChat. Ask the sender to re-encrypt it.')
  }

  if (bytes[0] !== 0x02) {
    throw new Error(`Unknown message version: ${bytes[0]}`)
  }

  // Parse binary layout: [0x02][65B ephemeral pubkey][12B IV][ciphertext]
  const ephemeralPubRaw = bytes.slice(1, 66).buffer
  const iv = bytes.slice(66, 78)
  const ciphertext = bytes.slice(78).buffer

  // 1. Import ephemeral public key
  const ephemeralPub = await crypto.subtle.importKey(
    'raw',
    ephemeralPubRaw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )

  // 2. Derive the same shared AES key (own private × ephemeral public)
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPub },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )

  // 3. Decrypt the ciphertext
  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    ciphertext,
  )

  return new TextDecoder().decode(plainBuffer)
}
