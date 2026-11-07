/* Mundos Sombrios — Portal Oficial / Conteúdo V2.2
   Fonte única de conteúdo público administrável pelo ADM.
*/
(function () {
  'use strict';

  const KEY = 'portal-official';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = Date.now();

  const defaults = {
    hero: {
      eyebrow: 'PORTAL OFICIAL',
      title: 'Mundos Sombrios',
      subtitle: 'Dois mundos. Dois abismos. Uma história que não deveria ter sido aberta.',
      description: 'Conheça o cenário, acompanhe as novidades, descubra classes e expansões e entre no sistema de criação de fichas quando estiver pronto.',
      primaryLabel: 'ENTRAR NO JOGO',
      media: {id:'included-hero',kind:'image',url:'assets/archetypes/natures/ocu-envolto.webp',alt:'O Envolto — arte do acervo Mundos Sombrios'}
    },
    featured: {
      title: 'A Ordem dos Sete Arcanjos',
      subtitle: 'Disponível no acervo',
      description: 'Consulte A Ordem dos Sete — Ecos da Alta Glória nos Códices de Ocultatun.',
      category: 'Expansão',
      world: 'Ocultatun',
      status: 'featured',
      media: {id:'included-order',kind:'image',url:'assets/archetypes/natures/ocu-ordem.webp',alt:'A Ordem dos Sete'}
    },
    announcements: [],
    events: [],
    classes: [
      {id:'included-alquerino',title:'Alquerino',world:'Ocultatun',category:'Classe',description:'Conheça o laboratório de síntese e os caminhos alquímicos na Forja e no livro base.',published:true,media:{id:'art-alquerino',kind:'image',url:'assets/archetypes/classes/alquerino.webp',alt:'Alquerino'}},
      {id:'included-taumaturgico',title:'Taumatúrgico',world:'Ocultatun',category:'Classe',description:'Consulte a classe no livro base e suas opções na criação de personagens.',published:true,media:{id:'art-taumaturgico',kind:'image',url:'assets/archetypes/classes/taumaturgico.webp',alt:'Taumatúrgico'}}
    ],
    community: [],
    expansions: (window.CODEX_FILE_CATALOG||[]).filter(x=>x.kind==='expansao').map(x=>({id:x.id,title:x.title,world:x.mode==='exodo'?'Êxodo':'Ocultatun',category:'Acervo disponível',description:'Documento incluído nos Códices. Consulte o suplemento completo.',published:true})),
    stories: [],
    worlds: [
      { id: 'world-1', key: 'exodo', title: 'Êxodo: Assimilação', eyebrow: 'SALA DE REGISTROS SECRETOS', description: 'Um mundo de protocolos, assimilação e sobrevivência entre registros que deveriam permanecer fechados.', accent: 'tech', media:{id:'included-exodo',kind:'image',url:'assets/archetypes/natures/exo-nexo.webp',alt:'Êxodo: Assimilação'} },
      { id: 'world-2', key: 'ocultatun', title: 'Ocultatun Ecos', eyebrow: 'BIBLIOTECA DOS SELOS', description: 'Um mundo de rituais, anomalias, símbolos e ecos que atravessam o conhecimento proibido.', accent: 'arcane', media:{id:'included-ocultatun',kind:'image',url:'assets/archetypes/natures/ocu-envolto.webp',alt:'Ocultatun Ecos'} }
    ],
    portalVersion: 'V2.2'
  };

  let current = JSON.parse(JSON.stringify(defaults));
  let hydratePromise = null;
  let hydratedAt = 0;
  const HYDRATE_TTL = 30000;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function merge(base, extra) {
    const out = { ...base, ...(extra || {}) };
    ['announcements', 'events', 'classes', 'expansions', 'community', 'stories', 'worlds'].forEach((k) => {
      out[k] = Array.isArray(extra?.[k]) ? extra[k] : clone(base[k]);
    });
    out.hero = { ...base.hero, ...(extra?.hero || {}) };
    out.featured = { ...base.featured, ...(extra?.featured || {}) };
    return out;
  }

  async function hydrateFromSupabase(options = {}) {
    if (!window.MS_DB || !window.MS_DB.ready) return current;
    const force = options === true || options?.force === true;
    if (!force && hydratedAt && Date.now() - hydratedAt < HYDRATE_TTL) return current;
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const [remote, posts] = await Promise.all([
          window.MS_DB.fetchSiteContent(KEY),
          window.MS_DB.fetchPosts()
        ]);
        const base = merge(defaults, remote && typeof remote === 'object' ? remote : {});
        const editorial = { announcements: [], events: [], classes: [], expansions: [], community: [], stories: [] };
        const typeToKey = { announcement: 'announcements', event: 'events', class: 'classes', expansion: 'expansions', community: 'community', story: 'stories' };
        (Array.isArray(posts) ? posts : []).forEach((p) => {
          const key = typeToKey[String(p?.type || '').toLowerCase()];
          if (!key || p.published !== true) return;
          const metadata = p.metadata && typeof p.metadata === 'object' ? p.metadata : {};
          editorial[key].push({
            id: p.id, title: p.title, subtitle: p.subtitle || '', summary: p.summary || '',
            body: p.body || '', description: p.summary || p.body || '', category: p.category || '',
            world: p.world || '', date: metadata.date || p.created_at || p.updated_at || '', kind: p.category || '',
            status: p.status || 'published', published: p.published === true,
            media: metadata.media || null, metadata
          });
        });
        // O acervo incluído só é fallback quando não há publicação/configuração editorial para a seção.
        for(const key of ['classes','expansions']){
          const configured=remote&&Object.prototype.hasOwnProperty.call(remote,key);
          const hasSectionPosts=(Array.isArray(posts)?posts:[]).some(p=>typeToKey[String(p?.type||'').toLowerCase()]===key);
          if(!configured&&!hasSectionPosts)editorial[key]=clone(defaults[key]);
        }
        current = { ...base, ...editorial };
        hydratedAt = Date.now();
      } catch (error) {
        console.warn('[Mundos Sombrios] Falha ao carregar conteúdo público do Supabase:', error);
      }
      return current;
    })();
    try { return await hydratePromise; }
    finally { hydratePromise = null; }
  }

  function read() { return clone(current); }

  async function write(data) {
    const next = merge(defaults, data || {});
    current = next;
    if (window.MS_DB && window.MS_DB.ready) {
      try {
        // Apenas configuração do portal fica em site_content.
        // Postagens editoriais vivem exclusivamente em posts.
        const siteData = {
          hero: next.hero,
          featured: next.featured,
          worlds: next.worlds,
          portalVersion: next.portalVersion
        };
        const result = await window.MS_DB.saveSiteContent(siteData, KEY);
        if (!result) return false;
        await hydrateFromSupabase();
        return true;
      } catch (error) {
        console.warn('[Mundos Sombrios] Falha ao salvar configuração do Portal:', error);
        return false;
      }
    }
    return true;
  }

  function isAdmin() {
    try {
      return !!(window.currentUser && window.currentUser.role === 'admin');
    } catch (_error) {
      return false;
    }
  }

  function published(list) {
    return (Array.isArray(list) ? list : []).filter((x) => x && x.published !== false);
  }

  hydrateFromSupabase();

  window.PortalContent = {
    KEY,
    defaults,
    read,
    write,
    hydrate: hydrateFromSupabase,
    isAdmin,
    published,
    escapeHtml: esc,
    now
  };
})();