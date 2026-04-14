# AI Copilot SDK

Standalone framework-agnostic JavaScript SDK and browser loader for the AI Copilot platform.

## Package

This repository publishes:

- `@auto-no-mous/copilot-web`

## What it includes

- runtime widget bootstrap with `initCopilot(...)`
- browser loader entrypoint for script-tag installation
- floating action button
- side drawer chat UI
- ASK / TEST / AGENT mode switching
- SSE streaming integration against `/api/chat/stream`
- install-token bootstrap against `/api/embed/config`

## Install

```bash
npm install @auto-no-mous/copilot-web
```

## Build

```bash
npm install
npm run build
```

## Basic usage

```ts
import { initCopilot } from '@auto-no-mous/copilot-web';

await initCopilot({
  appId: 'app_123',
  environment: 'prod',
  installToken: 'itkn_xxx',
  apiBaseUrl: 'https://api.example.com/api',
  theme: {
    primary: '#1338be',
    drawerWidth: 420,
    placement: 'right',
  },
});
```

## Script tag usage

```html
<script
  src="https://cdn.example.com/loader.global.js"
  data-app-id="app_123"
  data-env="prod"
  data-install-token="itkn_xxx"
  data-api-base-url="https://api.example.com/api">
</script>
```

## Example

See [examples/vanilla-host.html](examples/vanilla-host.html) for a standalone host page.

## Repository structure

- `src/index.ts`: main widget bootstrap and runtime UI
- `src/loader.ts`: script-loader entrypoint
- `examples/`: host integration examples
- `docs/`: package-specific usage docs
