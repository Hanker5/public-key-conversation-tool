# CryptoChat

A browser-based tool for generating encrypted messages you can paste into public chats. Built with React and the browser-native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — no server, no accounts, no tracking.

## What it does

| Tab | Description |
|-----|-------------|
| **My Keys** | Generate a 2048-bit RSA key pair stored in `localStorage`. Display and copy your public key to share with friends. Optionally export your private key for backup. |
| **Friends** | Save friends' public keys by name. The key is validated on save so you'll know immediately if something was pasted incorrectly. |
| **Encrypt** | Pick a friend from your list, type a message, and get back an encrypted blob you can paste anywhere — Discord, Telegram, a tweet, a forum post. Only the intended recipient can read it. |
| **Decrypt** | Paste an encrypted blob someone sent you. Your private key decrypts it locally and the plaintext is shown. |

## How the crypto works

CryptoChat uses **hybrid encryption**, the same pattern used by TLS and PGP:

1. A fresh random **AES-256-GCM** key is generated for every message.
2. The message is encrypted with that AES key.
3. The AES key is wrapped with the recipient's **RSA-OAEP (2048-bit / SHA-256)** public key.
4. Both pieces — the wrapped key and the ciphertext — are bundled into a compact base64 payload.

This means messages can be any length (RSA alone is limited to ~214 bytes), and each message uses a unique symmetric key so there is no key reuse.

**Your private key never leaves your browser.** All operations run in the Web Crypto API sandbox.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

### Typical workflow

1. Open the app and go to **My Keys** → click **Generate Key Pair**.
2. Click **Show Public Key** and copy it.
3. Send your public key to a friend (paste it in a DM, a Gist, wherever).
4. Your friend does the same and sends you their public key.
5. Go to **Friends** → **Add Friend**, enter their name and paste their public key.
6. Go to **Encrypt**, select your friend, type a message, hit **Encrypt Message**.
7. Copy the encrypted blob and paste it anywhere — only your friend can read it.
8. When you receive an encrypted message, paste it in **Decrypt** to read it.

## Building for production

```bash
npm run build
```

Output goes to `dist/`. Serve it from any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.).

## Security notes

- **Key storage**: Your key pair is stored in `localStorage` as a JWK. This means it persists across browser sessions but is tied to the origin. Don't use a shared or public computer.
- **No server**: There is no backend. Nothing is transmitted anywhere by the app itself.
- **Backup your keys**: If you clear your browser data you'll lose your private key and will be unable to decrypt old messages. Use **Show Private Key (Backup)** on the My Keys tab to save a copy somewhere safe.
- **This is for fun**: CryptoChat is a learning/fun tool, not a production-grade secure messenger. For serious confidential communication use Signal or similar.

## Tech stack

- [React 18](https://react.dev/) + [Vite 5](https://vitejs.dev/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) — built into every modern browser, zero crypto dependencies
- Plain CSS (no framework)
- `localStorage` for persistence
