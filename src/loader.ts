import { bootstrapFromScriptTag } from './index';

declare global {
  interface Window {
    AutoNoMousCopilot?: {
      boot: typeof bootstrapFromScriptTag;
    };
  }
}

async function bootCurrentScript() {
  if (typeof document === 'undefined') {
    return;
  }

  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) {
    return;
  }

  await bootstrapFromScriptTag(script);
}

window.AutoNoMousCopilot = {
  boot: bootstrapFromScriptTag,
};

void bootCurrentScript();
