import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import vm from 'node:vm';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>readFileSync(join(root,f),'utf8');
function atlasData(){
  const context={window:{}};
  vm.runInNewContext(read('js/master-atlas-data.js'),context,{filename:'master-atlas-data.js'});
  return context.window.MS_ATLAS_DATA;
}

test('V2.6 preserva os 66 registros e as seis categorias do Atlas fornecido',()=>{
  const data=atlasData();
  assert.equal(data.version,'2.6.0');
  assert.equal(data.points.length,66);
  const counts=Object.fromEntries(Object.keys(data.categories).map(cat=>[cat,data.points.filter(p=>p.cat===cat).length]));
  assert.deepEqual(counts,{pro:19,ant:30,cinza:2,crit:7,ocul:4,veu:4});
  for(const id of ['eua','cu','hagland','vogla','hakure','zhonghao','solace','salabranca','abismo','catedral']){
    assert.ok(data.points.some(p=>p.id===id),`registro ausente: ${id}`);
  }
});

test('20 locais visitáveis possuem arte local otimizada e nenhum visitável fica sem imagem',()=>{
  const data=atlasData(),visitable=data.points.filter(p=>p.visitable);
  assert.equal(visitable.length,20);
  for(const p of visitable){
    assert.ok(p.art,`${p.id} deveria possuir arte`);
    const file=join(root,p.art);
    assert.ok(existsSync(file),`arte ausente: ${p.art}`);
    assert.ok(statSync(file).size>50_000,`arte suspeitamente pequena: ${p.art}`);
    assert.match(p.art,/^assets\/atlas\/places\/[a-z0-9-]+\.webp$/);
  }
});

test('Escudo monta o Atlas Leaflet sob demanda e preserva dimensionamento de aba oculta',()=>{
  const shield=read('js/master-shield.js'),loader=read('js/master-shield-loader.js'),vendor=read('js/vendor-loader.js'),features=read('js/feature-loader.js'),html=read('index.html');
  assert.match(shield,/MSAtlas\?\.mount/);
  assert.match(shield,/MSAtlas\?\.refreshLayout/);
  assert.match(loader,/master-atlas-data\.js/);
  assert.match(loader,/master-atlas\.js/);
  assert.ok(loader.indexOf('master-atlas-data.js')<loader.indexOf('master-atlas.js'));
  assert.ok(loader.indexOf('master-atlas.js')<loader.indexOf('master-shield.js'));
  assert.match(vendor,/leaflet:\{global:'L'/);
  assert.match(vendor,/leaflet@1\.9\.4/);
  assert.doesNotMatch(html,/css\/master-atlas\.css/);
  assert.match(features,/css\/master-atlas\.css/);
  assert.match(features,/ensureShieldStyles/);
});

test('Mestre solicita alteração e ADM mantém exclusividade de edição e economia',()=>{
  const atlas=read('js/master-atlas.js'),services=read('js/ms-services.js'),db=read('js/supabase-db.js'),admin=read('js/script.js');
  assert.match(atlas,/function isAdmin\(\)\{return role\(\)==='admin';\}/);
  assert.match(atlas,/role\(\)!=='mestre'/);
  assert.match(atlas,/SOLICITAR ALTERAÇÃO/);
  assert.match(atlas,/Somente o ADM pode publicar alterações/);
  assert.match(atlas,/Somente o ADM pode comandar a economia/);
  assert.match(services,/type: 'atlas_change'/);
  assert.match(db,/updateAdminRequestStatus/);
  assert.match(admin,/Solicitação Cartográfica/);
  assert.match(admin,/reviewAtlasRequest/);
});

test('Simulador aceita apenas os dez comandos econômicos predefinidos',()=>{
  const atlas=read('js/master-atlas.js');
  const commands=['AVANCAR_CICLO','CRISE_ANT_NEXO','CRISE_PRO_NEXO','EMBARGO_GLOBAL','RUPTURA_DO_VEU','BOOM_HAKURE','CHOQUE_VOGLASKOV','COLAPSO_DF','ESTABILIZAR_MERCADOS','RESET_ECONOMIA'];
  for(const command of commands) assert.match(atlas,new RegExp(command));
  assert.match(atlas,/if\(!ECON_COMMANDS\[code\]\)/);
  assert.doesNotMatch(atlas,/\beval\s*\(/);
  assert.doesNotMatch(atlas,/new\s+Function\s*\(/);
  const data=atlasData();
  assert.equal(Object.keys(data.economy.markets).length,51);
});

test('Migração RLS protege estado do Escudo e pedidos cartográficos no banco',()=>{
  const sql=read('supabase-atlas-v2.6-migration.sql');
  assert.match(sql,/ms_site_settings_public_select/);
  assert.match(sql,/key not like 'master_shield_%'/);
  assert.match(sql,/ms_site_settings_shield_select/);
  assert.match(sql,/to authenticated\s+using \(\(select public\.current_profile_role\(\)\) in \('mestre','admin'\)\)/s);
  assert.match(sql,/ms_site_settings_insert/);
  assert.match(sql,/ms_site_settings_update/);
  assert.match(sql,/ms_site_settings_delete/);
  assert.match(sql,/coalesce\(data->>'type',''\) <> 'atlas_change'/);
  assert.match(sql,/user_id=\(select auth\.uid\(\)\)::text/);
});
