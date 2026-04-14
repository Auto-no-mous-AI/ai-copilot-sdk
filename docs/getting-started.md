# Getting Started

## 1. Build the package

```bash
npm install
npm run build
```

## 2. Use the package in a host app

```ts
import { initCopilot } from '@auto-no-mous/copilot-web';

await initCopilot({
  appId: 'app_123',
  environment: 'prod',
  installToken: 'itkn_xxx',
  apiBaseUrl: 'http://127.0.0.1:3000/api',
});
```

## 3. Use the loader bundle

After build, the browser loader bundle is emitted under:

- `dist/browser/loader.global.js`

You can copy or publish that bundle to your CDN and use the script-tag installation path.

## Local platform pairing

This package is designed to work with the AI Copilot Platform endpoints:

- `GET /api/embed/config`
- `GET /api/chat/stream`

Use the local first environment from `ai-copilot-platform` if you want to test against a real backend.
