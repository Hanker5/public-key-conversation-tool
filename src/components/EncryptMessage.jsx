import { useState } from 'react'
import { importPublicKeyFromPem, encryptMessage } from '../utils/crypto'

export default function EncryptMessage({ friends, keyPair }) {
  const [recipientId, setRecipientId] = useState('')
  const [message, setMessage] = useState('')
  const [encrypted, setEncrypted] = useState('')
  const [encrypting, setEncrypting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleEncrypt() {
    setError('')
    setEncrypted('')

    if (!recipientId) {
      setError('Please select a recipient.')
      return
    }
    if (!message.trim()) {
      setError('Please enter a message to encrypt.')
      return
    }

    const friend = friends.find((f) => f.id === recipientId)
    if (!friend) {
      setError('Selected friend not found.')
      return
    }

    setEncrypting(true)
    try {
      const recipientPublicKey = await importPublicKeyFromPem(friend.publicKey)
      const result = await encryptMessage(message.trim(), recipientPublicKey)
      setEncrypted(result)
    } catch (e) {
      setError(`Encryption failed: ${e.message}`)
    } finally {
      setEncrypting(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(encrypted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClear() {
    setMessage('')
    setEncrypted('')
    setError('')
    setCopied(false)
  }

  const selectedFriend = friends.find((f) => f.id === recipientId)

  return (
    <div className="page">
      <div className="page-header">
        <h2>Encrypt a Message</h2>
        <p className="text-muted">
          Compose a message, pick a recipient, and get an encrypted block you can paste anywhere —
          Discord, Telegram, a tweet — only your friend can read it.
        </p>
      </div>

      {friends.length === 0 && (
        <div className="info-banner">
          You need to add at least one friend before you can encrypt messages. Head to the{' '}
          <strong>Friends</strong> tab first.
        </div>
      )}

      <div className="card">
        <div className="form-group">
          <label htmlFor="recipient">Recipient</label>
          {friends.length > 0 ? (
            <select
              id="recipient"
              className="input"
              value={recipientId}
              onChange={(e) => {
                setRecipientId(e.target.value)
                setEncrypted('')
                setError('')
              }}
            >
              <option value="">— Select a friend —</option>
              {friends.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          ) : (
            <select className="input" disabled>
              <option>No friends added yet</option>
            </select>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="plaintext">Message</label>
          <textarea
            id="plaintext"
            className="input message-textarea"
            placeholder="Type your secret message here…"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value)
              setEncrypted('')
            }}
            rows={5}
          />
          <span className="text-muted text-sm char-count">{message.length} characters</span>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleEncrypt}
            disabled={encrypting || friends.length === 0}
          >
            {encrypting ? 'Encrypting…' : 'Encrypt Message'}
          </button>
          {(message || encrypted) && (
            <button className="btn btn-ghost" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      {encrypted && (
        <div className="card result-card">
          <div className="result-header">
            <h4>
              Encrypted Message
              {selectedFriend && (
                <span className="text-muted text-sm"> — for {selectedFriend.name}</span>
              )}
            </h4>
            <span className="badge badge-green">Ready to send</span>
          </div>
          <p className="text-muted text-sm">
            Copy the block below and paste it into any chat. Only {selectedFriend?.name ?? 'the recipient'} can decrypt it.
          </p>
          <div className="encrypted-output-wrapper">
            <textarea className="key-textarea encrypted-output" readOnly value={encrypted} rows={6} />
          </div>
          <div className="key-actions">
            <button className="btn btn-primary btn-sm" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy Encrypted Message'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
