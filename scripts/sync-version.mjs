import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const {version}=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
writeFileSync(new URL('VERSION.txt',root),version+'\n');
writeFileSync(new URL('js/ms-version.js',root),`/* Gerado por scripts/sync-version.mjs; fonte: package.json. */\nwindow.MS_VERSION = ${JSON.stringify(version)};\n`);
const html=new URL('index.html',root);
writeFileSync(html,readFileSync(html,'utf8').replace(/<title>Mundos Sombrios[^<]*<\/title>/,`<title>Mundos Sombrios — Portal Oficial V${version}</title>`));
console.log(`Versão sincronizada: ${version}`);
