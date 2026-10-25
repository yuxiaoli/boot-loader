import { destinations } from './destinations';
import type { ScreenRequest } from './commands';

export function screenPolicy(request: ScreenRequest, parentUrl: string, isolated: boolean): { reason?: string; sandbox: string } {
  const url = new URL(request.url);
  const trusted = request.kind === 'registry' && destinations.some((os) => os.live === url.href);
  const sandbox = trusted ? 'allow-scripts allow-same-origin allow-forms' : 'allow-scripts allow-forms';
  if (new URL(parentUrl).protocol === 'https:' && url.protocol === 'http:') return { sandbox, reason: 'An HTTPS page cannot safely embed HTTP content. Open it in this tab instead.' };
  if (request.directOnly || (url.hostname === 'webvm.io' && !isolated)) return { sandbox, reason: request.directOnly ?? 'WebVM needs cross-origin isolation, which this host does not provide. Open WebVM in this tab.' };
  return { sandbox };
}
