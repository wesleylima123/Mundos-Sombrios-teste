import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'sandbox-offline');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

// Sandbox integral: os mesmos bytes de runtime do site principal.
for (const entry of ['index.html', '.nojekyll', 'VERSION.txt', 'assets', 'css', 'js', 'codex-files']) {
  const src = join(root, entry);
  if (existsSync(src)) cpSync(src, join(out, entry), { recursive: true });
}

// Única diferença funcional: configuração de backend local/isolado.
writeFileSync(join(out, 'js', 'ms-runtime-config.js'), `/* Mundos Sombrios — Runtime SANDBOX INTEGRAL v2.10.1 */\n(function(){\n  'use strict';\n  window.MS_RUNTIME_CONFIG = {\n    environment: 'sandbox-integral-offline',\n    offlineMode: true,\n    sandboxMode: true,\n    storageNamespace: 'ms-sandbox-v2101',\n    supabase: { url:'', publishableKey:'', environment:'unlinked' }\n  };\n})();\n`);

writeFileSync(join(out, 'README-SANDBOX.txt'), `MUNDOS SOMBRIOS V2.10.1 — SANDBOX INTEGRAL\n\nEsta pasta é gerada automaticamente a partir do MESMO runtime do site principal.\nA única substituição é js/ms-runtime-config.js, que ativa o banco local isolado.\nNão edite esta pasta manualmente: execute npm run sandbox para reconstruí-la.\n\nContas QA:\nJogador: jogador / jogador123\nMestre: mestre / mestre1234\nADM: admin / admin12345\n`);
console.log('Sandbox integral V2.10.1 reconstruído a partir da árvore canônica.');
