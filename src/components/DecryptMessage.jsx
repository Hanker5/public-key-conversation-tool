import { useState } from 'react'
import { decryptMessage } from '../utils/crypto'

export default function DecryptMessage({ keyPair }) {
  const [ciphertext, setCiphertext] = useState('')
  const [decrypted, setDecrypted] = useState('')
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleDecrypt() {
    setError('')
    setDecrypted('')

    if (!keyPair) {
      setError('You need a key pair to decrypt messages. Go to the "My Keys" tab first.')
      return
    }
    if (!ciphertext.trim()) {
      setError('Please paste an encrypted message.')
      return
    }

    setDecrypting(true)
    try {
      const result = await decryptMessage(ciphertext.trim(), keyPair.privateKey)
      setDecrypted(result)
    } catch (e) {
      if (e.name === 'OperationError') {
        setError(
          'Decryption failed. This message was not encrypted with your public key, or the ciphertext is corrupted.',
        )
      } else {
        setError(`Decryption failed: ${e.message}`)
      }
    } finally {
      setDecrypting(false)
    }
  }

  function handleClear() {
    setCiphertext('')
    setDecrypted('')
    setError('')
    setCopied(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(decrypted)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Decrypt a Message</h2>
        <p className="text-muted">
          Paste an encrypted message someone sent you. Your private key will be used to decrypt it
          — it never leaves your browser.
        </p>
      </div>

      {!keyPair && (
        <div className="warning-banner standalone-warning">
          You don't have a key pair yet. Go to <strong>My Keys</strong> to generate one first.
        </div>
      )}

      <div className="card">
        <div className="form-group">
          <label htmlFor="ciphertext">Encrypted Message</label>
          <textarea
            id="ciphertext"
            className="key-textarea"
            placeholder="Paste the encrypted message block here…"
            value={ciphertext}
            onChange={(e) => {
              setCiphertext(e.target.value)
              setDecrypted('')
              setError('')
            }}
            rows={7}
          />
        </div>

        {error && <div className="error-banner">{error}</div>}

        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleDecrypt}
            disabled={decrypting || !keyPair}
          >
            {decrypting ? 'Decrypting…' : 'Decrypt Message'}
          </button>
          {(ciphertext || decrypted) && (
            <button className="btn btn-ghost" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </div>

      {decrypted && (
        <div className="card result-card">
          <div className="result-header">
            <h4>Decrypted Message</h4>
            <span className="badge badge-green">Success</span>
          </div>
          <div className="decrypted-output">
            <p>{decrypted}</p>
          </div>
          <div className="key-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              {copied ? '✓ Copied!' : 'Copy Plaintext'}
            </button>
          </div>
        </div>
      )}

      <div className="card info-card">
        <h4>How does this work?</h4>
        <ol className="how-it-works">
          <li>Your friend encrypts a message using your <strong>public key</strong>.</li>
          <li>The app uses hybrid encryption: a random AES-256 key encrypts the message, then RSA-OAEP wraps that key.</li>
          <li>Only your <strong>private key</strong> can unwrap the AES key and read the message.</li>
          <li>Your private key <strong>never leaves your browser</strong> — all crypto happens locally.</li>
        </ol>
      </div>
    </div>
  )
}
