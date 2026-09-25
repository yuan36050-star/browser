import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from '@modelcontextprotocol/sdk/shared/auth.js';
import { getState, patchConnector } from '../store';
import type { OAuthState } from '../types';

const PENDING_KEY = 'cove.oauth.pending';

export function redirectUrl(): string {
  return `${location.origin}${location.pathname}`;
}

function pending(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}');
  } catch {
    return {};
  }
}

export function pendingConnectorForState(state: string): string | undefined {
  return pending()[state];
}

export function clearPending(state: string) {
  const p = pending();
  delete p[state];
  localStorage.setItem(PENDING_KEY, JSON.stringify(p));
}

/** OAuth client for MCP connectors, persisted on the connector record. */
export class BrowserOAuthProvider implements OAuthClientProvider {
  constructor(private connectorId: string) {}

  private get data(): OAuthState {
    return getState().connectors.find((c) => c.id === this.connectorId)?.oauth ?? {};
  }

  private save(patch: Partial<OAuthState>) {
    patchConnector(this.connectorId, { oauth: { ...this.data, ...patch } });
  }

  get redirectUrl(): string {
    return redirectUrl();
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: 'Cove',
      redirect_uris: [redirectUrl()],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    };
  }

  state(): string {
    const s = crypto.randomUUID();
    const p = pending();
    p[s] = this.connectorId;
    localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    this.save({ state: s });
    return s;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this.data.clientInformation as OAuthClientInformationMixed | undefined;
  }

  saveClientInformation(info: OAuthClientInformationMixed): void {
    this.save({ clientInformation: info as unknown as Record<string, unknown> });
  }

  tokens(): OAuthTokens | undefined {
    return this.data.tokens as OAuthTokens | undefined;
  }

  saveTokens(tokens: OAuthTokens): void {
    this.save({ tokens: tokens as unknown as Record<string, unknown> });
  }

  redirectToAuthorization(url: URL): void {
    const w = window.open(url.toString(), 'cove-oauth', 'width=520,height=720');
    if (!w) location.assign(url.toString());
  }

  saveCodeVerifier(v: string): void {
    this.save({ codeVerifier: v });
  }

  codeVerifier(): string {
    const v = this.data.codeVerifier;
    if (!v) throw new Error('No PKCE code verifier saved');
    return v;
  }

  invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): void {
    const d = { ...this.data };
    if (scope === 'all' || scope === 'client') delete d.clientInformation;
    if (scope === 'all' || scope === 'tokens') delete d.tokens;
    if (scope === 'all' || scope === 'verifier') delete d.codeVerifier;
    patchConnector(this.connectorId, { oauth: d });
  }
}

/**
 * Runs on page load. If this page is the OAuth redirect target, hand the code
 * to the opener (popup flow) or stash it for the app to finish (redirect flow).
 * Returns true when the page is a popup that should not render the app.
 */
export function captureOAuthRedirect(): boolean {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state || !pendingConnectorForState(state)) return false;
  const payload = { type: 'cove-oauth', code, state };
  history.replaceState(null, '', location.pathname + location.hash);
  try {
    new BroadcastChannel('cove-oauth').postMessage(payload);
  } catch {
    /* unsupported */
  }
  if (window.opener && window.opener !== window) {
    try {
      window.opener.postMessage(payload, location.origin);
      document.body.innerHTML =
        '<p style="font:16px system-ui;padding:32px;text-align:center">Signed in. You can close this window.</p>';
      setTimeout(() => window.close(), 400);
      return true;
    } catch {
      /* fall through to in-page handling */
    }
  }
  sessionStorage.setItem('cove.oauth.result', JSON.stringify(payload));
  return false;
}
