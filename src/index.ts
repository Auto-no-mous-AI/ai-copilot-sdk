export type CopilotMode = 'ask' | 'test' | 'agent';

export interface ThemeConfig {
  primary: string;
  icon: string;
  drawerWidth: number;
  placement: 'left' | 'right';
}

export interface EmbedConfig {
  appId: string;
  environment: 'dev' | 'staging' | 'prod';
  theme?: Partial<ThemeConfig>;
  apiBaseUrl?: string;
  endUserId?: string;
}

export interface InitCopilotOptions extends EmbedConfig {
  getToken?: () => Promise<string>;
  installToken?: string;
  apiKey?: string;
}

interface FeatureConfig {
  ask: boolean;
  test: boolean;
  agent: boolean;
}

interface RuntimeState {
  conversationId: string | null;
  mode: CopilotMode;
  open: boolean;
}

interface CitationPayload {
  id: number;
  source: string;
  score: number;
}

interface RemoteEmbedConfig {
  applicationId: string;
  theme?: Partial<ThemeConfig>;
  features?: Partial<FeatureConfig>;
}

const defaultTheme: ThemeConfig = {
  primary: '#1f2a7a',
  icon: 'spark',
  drawerWidth: 420,
  placement: 'right',
};

const defaultFeatures: FeatureConfig = {
  ask: true,
  test: false,
  agent: false,
};

export async function initCopilot(options: InitCopilotOptions) {
  const token = options.installToken ?? (options.getToken ? await options.getToken() : null);
  if (!token) {
    throw new Error('installToken or getToken is required to initialize the copilot widget.');
  }
  const apiBaseUrl = options.apiBaseUrl ?? 'http://localhost:3000/api';

  const remote = await fetchRemoteConfig({
    apiBaseUrl,
    appId: options.appId,
    environment: options.environment,
    token,
  });

  const theme = {
    ...defaultTheme,
    ...(remote?.theme ?? {}),
    ...(options.theme ?? {}),
  };

  const features = {
    ...defaultFeatures,
    ...(remote?.features ?? {}),
  };

  const runtime: RuntimeState = {
    conversationId: null,
    mode: 'ask',
    open: false,
  };

  const host = ensureHost();
  host.dataset['copilotAppId'] = options.appId;
  host.dataset['copilotEnv'] = options.environment;
  host.dataset['copilotToken'] = token;
  host.dataset['copilotFeatures'] = JSON.stringify(features);

  const ui = renderWidget(host, {
    theme,
    features,
    onModeChange: (mode) => {
      runtime.mode = mode;
    },
    onToggle: (open) => {
      runtime.open = open;
    },
    onSend: async (message, appendUser, appendAssistantDelta, markDone, markError) => {
      appendUser(message);

      const params = new URLSearchParams({
        applicationId: options.appId,
        message,
        model: 'gpt-4.1-mini',
        mode: runtime.mode,
        endUserId: options.endUserId ?? 'anonymous',
        installToken: token,
        environment: options.environment,
      });

      if (runtime.conversationId) {
        params.set('conversationId', runtime.conversationId);
      }

      if (options.apiKey) {
        params.set('apiKey', options.apiKey);
      }

      const source = new EventSource(`${apiBaseUrl}/chat/stream?${params.toString()}`);

      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as {
          type: 'delta' | 'done' | 'error';
          content?: string;
          conversationId?: string;
          message?: string;
          citations?: CitationPayload[];
        };

        if (payload.conversationId) {
          runtime.conversationId = payload.conversationId;
        }

        if (payload.type === 'delta' && payload.content) {
          appendAssistantDelta(payload.content);
          return;
        }

        if (payload.type === 'done') {
          markDone(payload.citations ?? []);
          source.close();
          return;
        }

        if (payload.type === 'error') {
          markError(payload.message ?? 'Streaming error');
          source.close();
        }
      };

      source.onerror = () => {
        markError('Unable to connect to streaming endpoint.');
        source.close();
      };
    },
  });

  return {
    appId: options.appId,
    environment: options.environment,
    token,
    theme,
    features,
    apiBaseUrl,
    close: () => ui.setOpen(false),
    open: () => ui.setOpen(true),
  };
}

export async function bootstrapFromScriptTag(script: HTMLScriptElement) {
  const appId = script.dataset['appId'];
  const environment = script.dataset['env'] as 'dev' | 'staging' | 'prod' | undefined;
  const installToken = script.dataset['installToken'] ?? script.dataset['token'];
  const apiBaseUrl = script.dataset['apiBaseUrl'];
  const endUserId = script.dataset['endUserId'];
  const apiKey = script.dataset['apiKey'];
  const theme = parseThemeConfig(script.dataset['theme']);

  if (!appId || !environment || !installToken) {
    throw new Error(
      'Loader script requires data-app-id, data-env and data-install-token (or data-token).',
    );
  }

  return initCopilot({
    appId,
    environment,
    installToken,
    apiBaseUrl,
    endUserId,
    apiKey,
    theme,
  });
}

function ensureHost(): HTMLElement {
  let host = document.getElementById('copilot-widget-host');
  if (host) return host;

  host = document.createElement('div');
  host.id = 'copilot-widget-host';
  document.body.appendChild(host);
  return host;
}

function renderWidget(
  host: HTMLElement,
  options: {
    theme: ThemeConfig;
    features: FeatureConfig;
    onModeChange: (mode: CopilotMode) => void;
    onToggle: (open: boolean) => void;
    onSend: (
      message: string,
      appendUser: (msg: string) => void,
      appendAssistantDelta: (delta: string) => void,
      markDone: (citations: CitationPayload[]) => void,
      markError: (error: string) => void,
    ) => Promise<void>;
  },
) {
  host.innerHTML = '';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'AI';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = options.theme.placement === 'right' ? '20px' : '';
  button.style.left = options.theme.placement === 'left' ? '20px' : '';
  button.style.width = '52px';
  button.style.height = '52px';
  button.style.borderRadius = '50%';
  button.style.border = '0';
  button.style.cursor = 'pointer';
  button.style.background = options.theme.primary;
  button.style.color = '#fff';
  button.style.zIndex = '2147483000';

  const drawer = document.createElement('aside');
  drawer.style.position = 'fixed';
  drawer.style.top = '0';
  drawer.style.bottom = '0';
  drawer.style.width = `${options.theme.drawerWidth}px`;
  drawer.style.minWidth = '360px';
  drawer.style.maxWidth = '720px';
  drawer.style.maxHeight = '100vh';
  drawer.style.background = '#ffffff';
  drawer.style.boxShadow = '0 0 24px rgba(0,0,0,0.2)';
  drawer.style.transition = 'transform 0.2s ease';
  drawer.style.transform =
    options.theme.placement === 'right' ? 'translateX(100%)' : 'translateX(-100%)';
  drawer.style.right = options.theme.placement === 'right' ? '0' : '';
  drawer.style.left = options.theme.placement === 'left' ? '0' : '';
  drawer.style.display = 'grid';
  drawer.style.gridTemplateRows = 'auto auto 1fr auto';
  drawer.style.zIndex = '2147483001';

  const resizeHandle = document.createElement('div');
  resizeHandle.style.position = 'absolute';
  resizeHandle.style.top = '0';
  resizeHandle.style.bottom = '0';
  resizeHandle.style.width = '8px';
  resizeHandle.style.cursor = 'ew-resize';
  resizeHandle.style.background = 'transparent';
  resizeHandle.style.left = options.theme.placement === 'right' ? '-4px' : '';
  resizeHandle.style.right = options.theme.placement === 'left' ? '-4px' : '';

  const header = document.createElement('div');
  header.style.padding = '12px 14px';
  header.style.background = options.theme.primary;
  header.style.color = '#fff';
  header.style.fontWeight = '700';
  header.textContent = 'AI Copilot';

  const modeBar = document.createElement('div');
  modeBar.style.display = 'flex';
  modeBar.style.gap = '8px';
  modeBar.style.padding = '10px 12px';
  modeBar.style.borderBottom = '1px solid #d7deec';

  const messages = document.createElement('div');
  messages.style.padding = '12px';
  messages.style.overflow = 'auto';
  messages.style.background = '#f7f9ff';
  messages.style.display = 'flex';
  messages.style.flexDirection = 'column';
  messages.style.gap = '8px';

  const composer = document.createElement('form');
  composer.style.display = 'flex';
  composer.style.gap = '8px';
  composer.style.padding = '10px';
  composer.style.borderTop = '1px solid #d7deec';

  const input = document.createElement('textarea');
  input.rows = 2;
  input.placeholder = 'Ask anything about this app...';
  input.style.flex = '1';
  input.style.resize = 'none';
  input.style.border = '1px solid #bcc8de';
  input.style.borderRadius = '8px';
  input.style.padding = '8px';

  const sendButton = document.createElement('button');
  sendButton.type = 'submit';
  sendButton.textContent = 'Send';
  sendButton.style.border = '0';
  sendButton.style.borderRadius = '8px';
  sendButton.style.padding = '8px 12px';
  sendButton.style.background = options.theme.primary;
  sendButton.style.color = '#fff';

  const modes = getEnabledModes(options.features);
  let activeMode: CopilotMode = modes[0];
  options.onModeChange(activeMode);
  let currentAssistantNode: HTMLElement | null = null;

  for (const mode of modes) {
    const modeButton = document.createElement('button');
    modeButton.type = 'button';
    modeButton.textContent = mode.toUpperCase();
    modeButton.style.border = '1px solid #bcc8de';
    modeButton.style.borderRadius = '999px';
    modeButton.style.padding = '6px 10px';
    modeButton.style.background = mode === activeMode ? '#dce8ff' : '#ffffff';
    modeButton.style.cursor = 'pointer';

    modeButton.addEventListener('click', () => {
      activeMode = mode;
      options.onModeChange(mode);
      Array.from(modeBar.querySelectorAll('button')).forEach((btn) => {
        (btn as HTMLButtonElement).style.background = '#ffffff';
      });
      modeButton.style.background = '#dce8ff';
    });

    modeBar.appendChild(modeButton);
  }

  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    sendButton.disabled = true;

    void options
      .onSend(
        message,
        (userText) => {
          const node = document.createElement('div');
          node.style.alignSelf = 'flex-end';
          node.style.background = '#dce8ff';
          node.style.borderRadius = '10px';
          node.style.padding = '8px 10px';
          node.textContent = userText;
          messages.appendChild(node);
          messages.scrollTop = messages.scrollHeight;
        },
        (delta) => {
          if (!currentAssistantNode) {
            currentAssistantNode = document.createElement('div');
            currentAssistantNode.style.alignSelf = 'flex-start';
            currentAssistantNode.style.background = '#ffffff';
            currentAssistantNode.style.border = '1px solid #dae2f0';
            currentAssistantNode.style.borderRadius = '10px';
            currentAssistantNode.style.padding = '8px 10px';
            currentAssistantNode.textContent = '';
            messages.appendChild(currentAssistantNode);
          }

          currentAssistantNode.textContent += delta;
          messages.scrollTop = messages.scrollHeight;
        },
        (citations) => {
          if (currentAssistantNode && citations.length) {
            const references = document.createElement('div');
            references.style.marginTop = '8px';
            references.style.paddingTop = '6px';
            references.style.borderTop = '1px dashed #d6deec';
            references.style.fontSize = '12px';
            references.style.color = '#435470';
            references.textContent = `Sources: ${citations
              .map((citation) => `[${citation.id}] ${shortSource(citation.source)}`)
              .join(' | ')}`;
            currentAssistantNode.appendChild(references);
          }

          currentAssistantNode = null;
          sendButton.disabled = false;
        },
        (error) => {
          const node = document.createElement('div');
          node.style.alignSelf = 'flex-start';
          node.style.color = '#a00000';
          node.textContent = error;
          messages.appendChild(node);
          currentAssistantNode = null;
          sendButton.disabled = false;
          messages.scrollTop = messages.scrollHeight;
        },
      )
      .catch((error) => {
        const node = document.createElement('div');
        node.style.alignSelf = 'flex-start';
        node.style.color = '#a00000';
        node.textContent = error instanceof Error ? error.message : 'Request failed';
        messages.appendChild(node);
        currentAssistantNode = null;
        sendButton.disabled = false;
      });
  });

  composer.appendChild(input);
  composer.appendChild(sendButton);

  drawer.appendChild(resizeHandle);
  drawer.appendChild(header);
  drawer.appendChild(modeBar);
  drawer.appendChild(messages);
  drawer.appendChild(composer);

  let open = false;
  const applyOpen = () => {
    drawer.style.transform =
      options.theme.placement === 'right'
        ? open
          ? 'translateX(0)'
          : 'translateX(100%)'
        : open
          ? 'translateX(0)'
          : 'translateX(-100%)';
    options.onToggle(open);
  };

  button.addEventListener('click', () => {
    open = !open;
    applyOpen();
  });

  let resizing = false;
  resizeHandle.addEventListener('mousedown', (event) => {
    event.preventDefault();
    resizing = true;
  });

  window.addEventListener('mousemove', (event) => {
    if (!resizing) return;

    const width =
      options.theme.placement === 'right'
        ? window.innerWidth - event.clientX
        : event.clientX;

    const clamped = Math.min(720, Math.max(360, width));
    drawer.style.width = `${clamped}px`;
  });

  window.addEventListener('mouseup', () => {
    resizing = false;
  });

  host.appendChild(button);
  host.appendChild(drawer);

  return {
    setOpen(nextOpen: boolean) {
      open = nextOpen;
      applyOpen();
    },
  };
}

async function fetchRemoteConfig(payload: {
  apiBaseUrl: string;
  appId: string;
  environment: 'dev' | 'staging' | 'prod';
  token: string;
}): Promise<RemoteEmbedConfig | null> {
  const params = new URLSearchParams({
    appId: payload.appId,
    environment: payload.environment,
    token: payload.token,
  });

  try {
    const response = await fetch(`${payload.apiBaseUrl}/embed/config?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as RemoteEmbedConfig;
  } catch {
    return null;
  }
}

function getEnabledModes(features: FeatureConfig): CopilotMode[] {
  const modes: CopilotMode[] = [];
  if (features.ask) modes.push('ask');
  if (features.test) modes.push('test');
  if (features.agent) modes.push('agent');
  return modes.length ? modes : ['ask'];
}

function shortSource(source: string): string {
  try {
    const url = new URL(source);
    const path = url.pathname.length > 42 ? `...${url.pathname.slice(-42)}` : url.pathname;
    return `${url.hostname}${path}`;
  } catch {
    return source.length > 54 ? `...${source.slice(-54)}` : source;
  }
}

function parseThemeConfig(raw: string | undefined): Partial<ThemeConfig> | undefined {
  if (!raw?.trim()) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ThemeConfig>;
    return parsed;
  } catch {
    return undefined;
  }
}
