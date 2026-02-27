import { exportKeyPairAsJwk, importKeyPairFromJwk } from './crypto'

const KEYPAIR_KEY = 'cryptochat_keypair'
const FRIENDS_KEY = 'cryptochat_friends'

// --- Own key pair ---

export async function saveKeyPair(keyPair) {
  const jwk = await exportKeyPairAsJwk(keyPair)
  localStorage.setItem(KEYPAIR_KEY, JSON.stringify(jwk))
}

export async function loadKeyPair() {
  const raw = localStorage.getItem(KEYPAIR_KEY)
  if (!raw) return null
  try {
    const jwk = JSON.parse(raw)
    return await importKeyPairFromJwk(jwk)
  } catch {
    return null
  }
}

export function deleteKeyPair() {
  localStorage.removeItem(KEYPAIR_KEY)
}

export function hasStoredKeyPair() {
  return !!localStorage.getItem(KEYPAIR_KEY)
}

// --- Friends ---
// Each friend: { id: string, name: string, publicKey: string (PEM) }

export function loadFriends() {
  try {
    return JSON.parse(localStorage.getItem(FRIENDS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveFriends(friends) {
  localStorage.setItem(FRIENDS_KEY, JSON.stringify(friends))
}

export function addFriend(name, publicKeyPem) {
  const friends = loadFriends()
  const friend = {
    id: crypto.randomUUID(),
    name: name.trim(),
    publicKey: publicKeyPem.trim(),
    addedAt: new Date().toISOString(),
  }
  friends.push(friend)
  saveFriends(friends)
  return friend
}

export function updateFriend(id, updates) {
  const friends = loadFriends()
  const idx = friends.findIndex((f) => f.id === id)
  if (idx === -1) return
  friends[idx] = { ...friends[idx], ...updates }
  saveFriends(friends)
}

export function deleteFriend(id) {
  const friends = loadFriends().filter((f) => f.id !== id)
  saveFriends(friends)
}
