/* Mundos Sombrios — Release Contract V2.10.1
 * Inventário executável da árvore canônica. Não substitui módulos: verifica se o
 * runtime realmente expõe os contratos necessários para as jornadas principais.
 */
(function(){
  'use strict';
  const requiredDb=[
    'getSession','signIn','fetchMyProfile','fetchMyCharacters','saveCharacter','fetchCharacterView',
    'fetchMyTableSummaries','createTableRemote','deleteTableSecure','fetchPublicTableDirectory',
    'requestTableJoin','resolveTableJoinRequest','fetchTableRoster','fetchTableCharacters',
    'fetchSoulAccountState','fetchProgressionTableState','buyTableProgressionPoints',
    'grantCharacterProgression','upgradeProgressionAttribute','requestCharacterResource',
    'resolveCharacterResourceRequest','fetchProgressionAdminTables','fetchProgressionAdminTableLedger','adminAdjustTableProgression'
  ];
  const features=['ensureBuilder','ensureProgression','ensureDice','ensureMasterHistory'];
  function selfCheck(){
    const missing=[];
    const db=window.MS_DB;
    if(!db?.ready)missing.push('MS_DB.ready');
    for(const key of requiredDb)if(typeof db?.[key]!=='function')missing.push(`MS_DB.${key}`);
    for(const key of features)if(typeof window.MS_FEATURES?.[key]!=='function')missing.push(`MS_FEATURES.${key}`);
    const result={version:'2.10.1',ok:missing.length===0,missing,offline:db?.offline===true,sandbox:window.MS_RUNTIME_CONFIG?.sandboxMode===true};
    window.dispatchEvent(new CustomEvent('ms:release-check',{detail:result}));
    if(!result.ok){console.error('[Mundos Sombrios V2.10.1] Contratos ausentes:',missing);window.MS_PLATFORM?.setStatus?.('release','error',new Error(missing.join(', ')));}
    else window.MS_PLATFORM?.setStatus?.('release','success');
    return result;
  }
  window.MS_RELEASE=Object.freeze({version:'2.10.1',requiredDb:[...requiredDb],features:[...features],selfCheck});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(selfCheck,0),{once:true});else setTimeout(selfCheck,0);
})();
