/* Mundos Sombrios — Portal Oficial / Biblioteca de mídia V2.0
   Fonte única para imagens e vídeos do Portal: Supabase Storage.
   Bucket público: `portal-media`. Sem IndexedDB/local como fonte de verdade,
   para que a mídia publicada pelo ADM apareça para todos os visitantes.
*/
(function () {
  'use strict';

  const MAX_IMAGE = 8 * 1024 * 1024;   // 8 MB
  const MAX_VIDEO = 40 * 1024 * 1024;  // 40 MB

  function assertOnline() {
    if (!window.MS_DB || !window.MS_DB.ready) {
      throw new Error('Serviço online indisponível. A mídia do portal exige conexão com o Supabase.');
    }
  }

  async function put(file) {
    assertOnline();
    if (!(file instanceof File || file instanceof Blob)) throw new Error('Arquivo inválido.');
    const type = String(file.type || '').toLowerCase();
    const isImage = type.startsWith('image/');
    const isVideo = type.startsWith('video/');
    if (!isImage && !isVideo) throw new Error('Selecione uma imagem ou vídeo válido.');
    if (isImage && file.size > MAX_IMAGE) throw new Error('Imagem acima de 8 MB.');
    if (isVideo && file.size > MAX_VIDEO) throw new Error('Vídeo acima de 40 MB.');
    const media = await window.MS_DB.uploadPortalMedia(file);
    if (!media || !media.url) throw new Error('Não foi possível enviar a mídia para o armazenamento online.');
    return {
      id: media.path || media.id,
      path: media.path || media.id,
      name: media.name || file.name || 'midia',
      kind: media.kind || (isImage ? 'image' : 'video'),
      type,
      url: media.url,
      createdAt: media.createdAt || new Date().toISOString()
    };
  }

  // `url` resolve qualquer referência de mídia para uma URL pública do Supabase.
  function url(ref) {
    if (!ref) return '';
    if (typeof ref === 'string') return ref;
    if (ref.url) return String(ref.url);
    const path = ref.path || ref.id;
    if (!path) return '';
    if (window.MS_DB && window.MS_DB.ready && window.MS_DB.getPortalMediaUrl) {
      try { return window.MS_DB.getPortalMediaUrl(path) || ''; } catch (_) { return ''; }
    }
    return '';
  }

  async function remove(ref) {
    if (!ref) return true;
    const path = typeof ref === 'string' ? ref : (ref.path || ref.id);
    if (!path) return true;
    if (!window.MS_DB || !window.MS_DB.ready || !window.MS_DB.removePortalMedia) return false;
    return window.MS_DB.removePortalMedia(path);
  }

  // Monta um mapa id → URL pública para todo o conteúdo do portal.
  function prepareContent(content) {
    const map = {};
    if (!content || typeof content !== 'object') return map;
    const collect = (item) => {
      if (!item || !item.media) return;
      const m = item.media;
      const u = url(m);
      if (u) { map[m.id || m.path || u] = u; if (m.path) map[m.path] = u; }
    };
    collect(content.hero);
    collect(content.featured);
    ['announcements', 'events', 'classes', 'expansions', 'community', 'stories', 'worlds'].forEach((k) => {
      (Array.isArray(content[k]) ? content[k] : []).forEach(collect);
    });
    return map;
  }

  function revokeAll() { /* URLs públicas do Supabase não precisam de revokeObjectURL. */ }

  window.PortalMedia = { MAX_IMAGE, MAX_VIDEO, put, url, remove, prepareContent, revokeAll };
})();
