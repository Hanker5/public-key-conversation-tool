import { useState, useEffect } from 'react'
import MyKeys from './components/MyKeys'
import Friends from './components/Friends'
import EncryptMessage from './components/EncryptMessage'
import DecryptMessage from './components/DecryptMessage'
import { loadKeyPair } from './utils/storage'
import { loadFriends } from './utils/storage'

const TABS = [
  { id: 'keys', label: 'My Keys', icon: '🔑' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'encrypt', label: 'Encrypt', icon: '🔒' },
  { id: 'decrypt', label: 'Decrypt', icon: '🔓' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('keys')
  const [keyPair, setKeyPair] = useState(null)
  const [keyPairLoading, setKeyPairLoading] = useState(true)
  const [friends, setFriends] = useState([])

  useEffect(() => {
    loadKeyPair().then((kp) => {
      setKeyPair(kp)
      setKeyPairLoading(false)
    })
    setFriends(loadFriends())
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <span className="logo-icon">🔐</span>
            <div>
              <h1>CryptoChat</h1>
              <p className="tagline">Public-key encryption for fun messaging</p>
            </div>
          </div>
          <div className="header-status">
            <span className={`status-dot ${keyPair ? 'status-active' : 'status-inactive'}`} />
            <span className="text-sm text-muted">{keyPair ? 'Keys ready' : 'No keys'}</span>
          </div>
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.id === 'friends' && friends.length > 0 && (
              <span className="tab-badge">{friends.length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="app-main">
        {activeTab === 'keys' && (
          <MyKeys keyPair={keyPair} setKeyPair={setKeyPair} loading={keyPairLoading} />
        )}
        {activeTab === 'friends' && (
          <Friends friends={friends} setFriends={setFriends} />
        )}
        {activeTab === 'encrypt' && (
          <EncryptMessage friends={friends} keyPair={keyPair} />
        )}
        {activeTab === 'decrypt' && (
          <DecryptMessage keyPair={keyPair} />
        )}
      </main>

      <footer className="app-footer">
        <p className="text-muted text-sm">
          All encryption happens in your browser. Private keys never leave your device.
        </p>
      </footer>
    </div>
  )
}
