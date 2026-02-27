import { useState } from 'react'
import { generateKeyPair, exportPublicKeyAsPem, exportPrivateKeyAsPem } from '../utils/crypto'
import { saveKeyPair, deleteKeyPair } from '../utils/storage'

export default function MyKeys({ keyPair, setKeyPair, loading }) {
  const [generating, setGenerating] = useState(false)
  const [publicPem, setPublicPem] = useState('')
  const [privatePem, setPrivatePem] = useState('')
  const [showPrivate, setShowPrivate] = useState(false)
  const [copied, setCopied] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const kp = await generateKeyPair()
      await saveKeyPair(kp)
      setKeyPair(kp)
      const pub = await exportPublicKeyAsPem(kp.publicKey)
      setPublicPem(pub)
      setPrivatePem('')
      setShowPrivate(false)
      setConfirmDelete(false)
    } finally {
      setGenerating(false)
    }
  }

  async function handleShowPublic() {
    if (!keyPair) return
    const pem = await exportPublicKeyAsPem(keyPair.publicKey)
    setPublicPem(pem)
  }

  async function handleShowPrivate() {
    if (!keyPair) return
    const pem = await exportPrivateKeyAsPem(keyPair.privateKey)
    setPrivatePem(pem)
    setShowPrivate(true)
  }

  async function copyToClipboard(text, label) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  function handleDeleteConfirmed() {
    deleteKeyPair()
    setKeyPair(null)
    setPublicPem('')
    setPrivatePem('')
    setShowPrivate(false)
    setConfirmDelete(false)
  }

  if (loading) {
    return (
      <div className="card">
        <div className="loading-spinner" />
        <p className="text-muted">Loading keys…</p>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>My Key Pair</h2>
        <p className="text-muted">
          Your key pair is the foundation of encrypted messaging. Share your <strong>public key</strong> with
          friends so they can encrypt messages only you can read.
        </p>
      </div>

      {!keyPair ? (
        <div className="card center-card">
          <div className="key-icon">🔑</div>
          <h3>No Key Pair Found</h3>
          <p className="text-muted">Generate a 2048-bit RSA key pair to get started.</p>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Key Pair'}
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="card-header">
              <span className="badge badge-green">Active Key Pair</span>
              <span className="text-muted text-sm">RSA-2048 / SHA-256</span>
            </div>

            <div className="key-section">
              <div className="key-section-header">
                <h4>Public Key</h4>
                <span className="text-muted text-sm">Share this freely — anyone can encrypt messages for you</span>
              </div>

              {!publicPem ? (
                <button className="btn btn-secondary" onClick={handleShowPublic}>
                  Show Public Key
                </button>
              ) : (
                <div className="key-display-group">
                  <textarea
                    className="key-textarea"
                    readOnly
                    value={publicPem}
                    rows={9}
                  />
                  <div className="key-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => copyToClipboard(publicPem, 'public')}
                    >
                      {copied === 'public' ? '✓ Copied!' : 'Copy Public Key'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPublicPem('')}>
                      Hide
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="key-section">
              <div className="key-section-header">
                <h4>Private Key</h4>
                <span className="text-muted text-sm warning-text">
                  Never share this — keep it secret!
                </span>
              </div>

              {!showPrivate ? (
                <button className="btn btn-warning" onClick={handleShowPrivate}>
                  Show Private Key (Backup)
                </button>
              ) : (
                <div className="key-display-group">
                  <div className="warning-banner">
                    ⚠️ This is your private key. Anyone with this key can read your messages.
                    Only export it for secure backup.
                  </div>
                  <textarea
                    className="key-textarea key-textarea-danger"
                    readOnly
                    value={privatePem}
                    rows={9}
                  />
                  <div className="key-actions">
                    <button
                      className="btn btn-warning btn-sm"
                      onClick={() => copyToClipboard(privatePem, 'private')}
                    >
                      {copied === 'private' ? '✓ Copied!' : 'Copy Private Key'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setShowPrivate(false)
                        setPrivatePem('')
                      }}
                    >
                      Hide
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card danger-zone">
            <h4>Danger Zone</h4>
            <p className="text-muted text-sm">
              Generating a new key pair will replace your current keys. Anyone who has your old public
              key will no longer be able to send you encrypted messages.
            </p>
            <div className="danger-actions">
              {!confirmDelete ? (
                <>
                  <button className="btn btn-secondary" onClick={handleGenerate} disabled={generating}>
                    {generating ? 'Generating…' : 'Regenerate Key Pair'}
                  </button>
                  <button className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
                    Delete Keys
                  </button>
                </>
              ) : (
                <div className="confirm-delete">
                  <p className="text-danger">Are you sure? This cannot be undone.</p>
                  <button className="btn btn-danger" onClick={handleDeleteConfirmed}>
                    Yes, Delete My Keys
                  </button>
                  <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
