/**
 * Emit the upstream source registry as JSON for CI consumption.
 *
 * `.github/workflows/sync-upstream.yml` builds its job matrix from this,
 * so adding a module to `scripts/lib/upstream-sources.ts` is the only edit
 * needed to get a release watcher for it — there is no per-module job to
 * copy any more.
 *
 * Sources pinned by commit (`kind: 'vendored'`) have no upstream releases
 * to watch and are excluded.
 */

import { getEnabledSources } from './lib/upstream-sources.ts';

const sources = getEnabledSources()
  .filter((s) => s.kind !== 'vendored')
  .map((s) => ({ id: s.id, repo: s.repo, label: s.label, kind: s.kind }));

console.log(JSON.stringify(sources));
