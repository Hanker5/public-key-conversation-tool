import { useState } from 'react'
import { importPublicKeyFromPem } from '../utils/crypto'
import { addFriend, deleteFriend, updateFriend } from '../utils/storage'

export default function Friends({ friends, setFriends, onFriendsChange }) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [publicKey, setPublicKey] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  async function validateAndSave() {
    setError('')
    if (!name.trim()) {
      setError('Please enter a name.')
      return
    }
    if (!publicKey.trim()) {
      setError('Please paste a public key.')
      return
    }
    setSaving(true)
    try {
      // Validate the PEM is actually a valid RSA public key
      await importPublicKeyFromPem(publicKey.trim())
    } catch {
      setError('Invalid public key. Make sure you paste a full PEM-formatted RSA public key.')
      setSaving(false)
      return
    }

    if (editingId) {
      updateFriend(editingId, { name: name.trim(), publicKey: publicKey.trim() })
      setFriends((prev) =>
        prev.map((f) =>
          f.id === editingId ? { ...f, name: name.trim(), publicKey: publicKey.trim() } : f,
        ),
      )
      setEditingId(null)
    } else {
      const friend = addFriend(name, publicKey)
      setFriends((prev) => [...prev, friend])
    }

    setName('')
    setPublicKey('')
    setShowAddForm(false)
    setSaving(false)
  }

  function startEdit(friend) {
    setEditingId(friend.id)
    setName(friend.name)
    setPublicKey(friend.publicKey)
    setError('')
    setShowAddForm(true)
    setConfirmDeleteId(null)
  }

  function cancelForm() {
    setShowAddForm(false)
    setEditingId(null)
    setName('')
    setPublicKey('')
    setError('')
  }

  function handleDelete(id) {
    deleteFriend(id)
    setFriends((prev) => prev.filter((f) => f.id !== id))
    setConfirmDeleteId(null)
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function keyFingerprint(pem) {
    // Show last 16 chars of the base64 payload as a short fingerprint
    const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')
    return b64.slice(-16)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Friends</h2>
        <p className="text-muted">
          Save your friends' public keys so you can encrypt messages for them.
        </p>
      </div>

      {/* Friend list */}
      {friends.length === 0 && !showAddForm && (
        <div className="card center-card">
          <div className="key-icon">👥</div>
          <h3>No Friends Yet</h3>
          <p className="text-muted">
            Add a friend by pasting their public key. Ask them to share it from the "My Keys" tab.
          </p>
        </div>
      )}

      {friends.length > 0 && !showAddForm && (
        <div className="friend-list">
          {friends.map((friend) => (
            <div key={friend.id} className="card friend-card">
              <div className="friend-header">
                <div className="friend-avatar">{friend.name.charAt(0).toUpperCase()}</div>
                <div className="friend-info">
                  <h4>{friend.name}</h4>
                  <span className="text-muted text-sm">
                    Added {formatDate(friend.addedAt)} · Key: …{keyFingerprint(friend.publicKey)}
                  </span>
                </div>
                <div className="friend-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => startEdit(friend)}>
                    Edit
                  </button>
                  {confirmDeleteId === friend.id ? (
                    <span className="confirm-inline">
                      <span className="text-danger text-sm">Delete?</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(friend.id)}
                      >
                        Yes
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmDeleteId(friend.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <details className="key-details">
                <summary className="text-muted text-sm">View public key</summary>
                <textarea className="key-textarea key-textarea-sm" readOnly value={friend.publicKey} rows={5} />
              </details>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {showAddForm ? (
        <div className="card">
          <h3>{editingId ? 'Edit Friend' : 'Add a Friend'}</h3>

          <div className="form-group">
            <label htmlFor="friend-name">Name</label>
            <input
              id="friend-name"
              type="text"
              className="input"
              placeholder="e.g. Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="friend-key">Their Public Key (PEM)</label>
            <textarea
              id="friend-key"
              className="key-textarea"
              placeholder={`-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----`}
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              rows={9}
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <div className="form-actions">
            <button className="btn btn-primary" onClick={validateAndSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Friend'}
            </button>
            <button className="btn btn-ghost" onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
          + Add Friend
        </button>
      )}
    </div>
  )
}
