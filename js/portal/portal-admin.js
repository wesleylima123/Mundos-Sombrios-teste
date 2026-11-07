/* Mundos Sombrios — CMS local do Portal Oficial V0.61.3
   Somente ADM. Configuração em site_content; conteúdo editorial em posts; mídia em Supabase Storage.
*/
(function(){
  'use strict';
  const esc=v=>PortalContent.escapeHtml(v);
  const read=()=>PortalContent.read();
  const write=v=>PortalContent.write(v);
  const isAdmin=()=>PortalContent.isAdmin();
  const typeMap={announcements:'announcement',events:'event',classes:'class',expansions:'expansion',community:'community',stories:'story',worlds:'world'};
  const config={
    announcement:{key:'announcements',label:'Anúncio',field:'summary',dateType:'date',place:'Categoria'},
    event:{key:'events',label:'Evento',field:'description',dateType:'datetime-local',place:'Mundo'},
    class:{key:'classes',label:'Classe',field:'description',dateType:'date',place:'Mundo'},
    expansion:{key:'expansions',label:'Expansão',field:'description',dateType:'date',place:'Mundo'},
    community:{key:'community',label:'Comunidade',field:'description',dateType:'date',place:'Tipo'},
    story:{key:'stories',label:'História / Conto',field:'description',dateType:'date',place:'Mundo'},
    world:{key:'worlds',label:'Mundo',field:'description',dateType:'text',place:'Identificador'}
  };
  function close(){const modal=document.getElementById('portal-admin-modal');if(modal){modal.style.display='none';modal.innerHTML='';modal.setAttribute('aria-hidden','true');}}
  function open(){
    if(!isAdmin()){alert('Acesso restrito ao ADM.');return false;}
    const modal=document.getElementById('portal-admin-modal');if(!modal)return false;
    modal.innerHTML=`<div class="portal-admin-card"><header><div><span>ARQUIVO DO ARCONTE</span><h2>Administrar Portal</h2><p>Publique conteúdo e associe imagens ou vídeos aos blocos do Portal.</p></div><button type="button" data-close>FECHAR</button></header>
      <nav class="portal-admin-tabs" role="tablist" aria-label="Tipo de conteúdo">
        <button type="button" class="active" data-tab="announcement">Anúncio</button><button type="button" data-tab="event">Evento</button><button type="button" data-tab="class">Classe</button><button type="button" data-tab="expansion">Expansão</button><button type="button" data-tab="story">História</button><button type="button" data-tab="community">Comunidade</button><button type="button" data-tab="world">Mundo</button><button type="button" data-tab="featured">Destaque</button><button type="button" data-tab="hero">Portal</button>
      </nav><div id="portal-admin-form"></div><section class="portal-admin-list"><h3>Conteúdo publicado</h3><div id="portal-admin-items"></div></section></div>`;
    modal.style.display='flex';modal.setAttribute('aria-hidden','false');
    modal.querySelector('[data-close]').addEventListener('click',close);
    modal.onclick=e=>{if(e.target===modal)close();};
    modal.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{modal.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===btn));renderForm(modal.querySelector('#portal-admin-form'),btn.dataset.tab);}));
    renderForm(modal.querySelector('#portal-admin-form'),'announcement');renderItems(modal.querySelector('#portal-admin-items'));return true;
  }
  function mediaFields(item){return `<fieldset class="portal-media-fieldset"><legend>Mídia do bloco</legend><label>Imagem ou vídeo<input type="file" name="media" accept="image/*,video/*"></label><label>Texto alternativo / descrição da mídia<input name="mediaAlt" value="${esc(item.media?.alt||'')}" placeholder="Descreva a imagem para acessibilidade"></label>${item.media?.id?`<label class="portal-admin-media-state"><input type="checkbox" name="removeMedia"> Remover mídia atual <span>${esc(item.media.name||item.media.kind||'arquivo')}</span></label>`:''}<small>Imagens: até 8 MB. Vídeos: até 40 MB. O arquivo vai para o Supabase Storage e fica visível para todos.</small></fieldset>`;}
  function formDataForType(type,item={}){
    if(type==='featured'){const f={...read().featured,...(item||{})};return `<form class="portal-admin-form" data-type="featured"><label>Título<input name="title" required value="${esc(f.title)}"></label><label>Subtítulo<input name="subtitle" value="${esc(f.subtitle)}"></label><label>Descrição<textarea name="description">${esc(f.description)}</textarea></label><label>Categoria<input name="category" value="${esc(f.category)}"></label><label>Mundo<input name="world" value="${esc(f.world)}"></label>${mediaFields(f)}<button class="portal-btn primary">SALVAR DESTAQUE</button></form>`;}
    if(type==='hero'){const h={...read().hero,...(item||{})};return `<form class="portal-admin-form" data-type="hero"><label>Eyebrow<input name="eyebrow" value="${esc(h.eyebrow)}"></label><label>Título<input name="title" required value="${esc(h.title)}"></label><label>Subtítulo<input name="subtitle" value="${esc(h.subtitle)}"></label><label>Descrição<textarea name="description">${esc(h.description)}</textarea></label><label>Botão principal<input name="primaryLabel" value="${esc(h.primaryLabel)}"></label>${mediaFields(h)}<button class="portal-btn primary">SALVAR PORTAL</button></form>`;}
    const cfg=config[type];
    if(!cfg)return '<p class="portal-empty">Tipo de conteúdo inválido.</p>';
    return `<form class="portal-admin-form" data-type="${type}"><label>Título<input name="title" required value="${esc(item.title||'')}"></label><label>${cfg.dateType==='text'?'Subtítulo / Eyebrow':`Data${cfg.dateType==='datetime-local'?' e hora':''}`}<input type="${cfg.dateType==='text'?'text':cfg.dateType}" name="date" value="${esc(type==='world'?(item.eyebrow||item.date||''):(item.date||item.key||''))}"></label><label>${cfg.place}<input name="world" value="${esc(item.world||item.category||item.kind||item.key||'')}"></label>${type==='class'?`<label>Subtítulo<input name="subtitle" value="${esc(item.subtitle||'')}"></label>`:''}<label>Descrição / resumo<textarea name="description">${esc(item[cfg.field]||item.description||'')}</textarea></label>${type==='story'?`<label>Texto integral do conto<textarea name="body" class="portal-story-body-input">${esc(item.body||'')}</textarea></label>`:''}<label><input type="checkbox" name="published" ${item.published!==false?'checked':''}> Publicado</label>${mediaFields(item)}<button class="portal-btn primary">${item.id?'SALVAR ALTERAÇÕES':'PUBLICAR'}</button></form>`;
  }
  async function renderForm(root,type,item=null){
    if(!root)return;
    const baseItem=item||(type==='featured'?read().featured:type==='hero'?read().hero:null);
    root.innerHTML=formDataForType(type,baseItem||{});const form=root.querySelector('form');if(!form)return;
    form.addEventListener('submit',async e=>{
      e.preventDefault();const submit=form.querySelector('button[type="submit"],button.portal-btn');if(submit){submit.disabled=true;submit.setAttribute('aria-busy','true');}
      try{
        const fd=new FormData(form);const c=read();let media=baseItem?.media||null;
        if(fd.get('removeMedia')==='on'&&media?.id){await PortalMedia.remove(media.id);media=null;}
        const file=form.querySelector('input[name="media"]')?.files?.[0];
        if(file){if(baseItem?.media?.id)await PortalMedia.remove(baseItem.media.id);media=await PortalMedia.put(file);media.alt=String(fd.get('mediaAlt')||'').trim();}
        else if(media)media={...media,alt:String(fd.get('mediaAlt')||media.alt||'').trim()};
        if(type==='featured'){
          c.featured={...c.featured,title:String(fd.get('title')||'').trim(),subtitle:String(fd.get('subtitle')||'').trim(),description:String(fd.get('description')||'').trim(),category:String(fd.get('category')||'').trim(),world:String(fd.get('world')||'').trim(),status:'featured',media};
          if(!await write(c))throw new Error('Não foi possível salvar o destaque no Supabase.');
        }
        else if(type==='hero'){
          c.hero={...c.hero,eyebrow:String(fd.get('eyebrow')||'').trim(),title:String(fd.get('title')||'').trim(),subtitle:String(fd.get('subtitle')||'').trim(),description:String(fd.get('description')||'').trim(),primaryLabel:String(fd.get('primaryLabel')||'ENTRAR NO JOGO').trim(),media};
          if(!await write(c))throw new Error('Não foi possível salvar o Portal no Supabase.');
        }
        else if(type==='world'){
          const cfg=config[type];
          const eyebrowVal=String(fd.get('date')||'').trim();
          const payload={id:item?.id||`world-${Date.now().toString(36)}`,title:String(fd.get('title')||'').trim(),date:eyebrowVal,eyebrow:eyebrowVal||item?.eyebrow||'CENÁRIO OFICIAL',accent:item?.accent||'tech',key:String(fd.get('world')||'').trim()||item?.key||`world-${Date.now().toString(36)}`,description:String(fd.get('description')||'').trim(),media};
          const worlds=Array.isArray(c.worlds)?[...c.worlds]:[];
          const ix=worlds.findIndex(x=>String(x.id)===String(payload.id));
          if(ix>=0) worlds[ix]={...worlds[ix],...payload}; else worlds.unshift(payload);
          c.worlds=worlds;
          const saved=await write(c);
          if(!saved) throw new Error('Não foi possível salvar a configuração do mundo.');
        }
        else{
          const cfg=config[type];
          const title=String(fd.get('title')||'').trim();
          const date=String(fd.get('date')||'').trim();
          const place=String(fd.get('world')||'').trim();
          const description=String(fd.get('description')||'').trim();
          const published=fd.get('published')==='on';
          const payload={
            id:item?.id||`${type}-${Date.now().toString(36)}`, type, title,
            subtitle:type==='class'?String(fd.get('subtitle')||'').trim():'',
            summary:(type==='announcement'||type==='story')?description:'',
            body:type==='story'?String(fd.get('body')||'').trim():description,
            category:type==='announcement'?place:(type==='community'?place:cfg.label),
            world:type==='announcement'||type==='community'?'':place,
            status:published?'published':'draft', published,
            createdAt:item?.createdAt||new Date().toISOString(),
            metadata:{date,media,source:'portal-admin'}
          };
          const saved=await window.MS_DB.savePost(payload);
          if(!saved) throw new Error('Não foi possível salvar a postagem no Supabase.');
          await PortalContent.hydrate({force:true});
        }
        if (window.PortalContent && typeof window.PortalContent.hydrate === 'function') {
          await window.PortalContent.hydrate({force:true});
        }
        if(typeof window.renderOfficialPortal==='function')await window.renderOfficialPortal();
        open();
      }catch(err){alert(err?.message||'Não foi possível salvar o conteúdo.');}
      finally{if(submit){submit.disabled=false;submit.removeAttribute('aria-busy');}}
    });
  }
  function renderItems(root){
    if(!root)return;const c=read();const entries=[['announcements','Anúncio'],['events','Evento'],['classes','Classe'],['expansions','Expansão'],['stories','História/Conto'],['community','Comunidade'],['worlds','Mundo']];const parts=[];
    entries.forEach(([key,label])=>{const rows=Array.isArray(c[key])?c[key]:[];parts.push(`<div class="portal-admin-group"><h4>${label}</h4>`);if(!rows.length)parts.push('<p class="portal-empty">Sem registros.</p>');rows.slice(0,12).forEach(x=>parts.push(`<article><div><b>${esc(x.title)}</b><small>${esc(x.date||x.world||x.category||x.kind||'')}${x.media?' · 📎 mídia':''}</small></div><button type="button" data-edit="${esc(key)}:${esc(x.id)}">EDITAR</button><button type="button" data-delete="${esc(key)}:${esc(x.id)}">EXCLUIR</button></article>`));parts.push('</div>');});root.innerHTML=parts.join('');
    root.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>{const [key,id]=btn.dataset.edit.split(':');const type=typeMap[key];const data=read();const item=(data[key]||[]).find(x=>String(x.id)===String(id));renderForm(document.getElementById('portal-admin-form'),type,item);document.querySelectorAll('#portal-admin-modal [data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===type));}));
    root.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(!confirm('Excluir este conteúdo?'))return;
      const [key,id]=btn.dataset.delete.split(':');
      const item=(read()[key]||[]).find(x=>String(x.id)===String(id));
      try{
        if(item?.media?.id)await PortalMedia.remove(item.media.id);
        if(key==='worlds'){
          const data=read();data.worlds=(data.worlds||[]).filter(x=>String(x.id)!==String(id));
          if(!await write(data))throw new Error('Não foi possível excluir o mundo.');
        }else{
          if(!window.MS_DB?.deletePost)throw new Error('Função de exclusão de posts indisponível.');
          if(!await window.MS_DB.deletePost(id))throw new Error('Não foi possível excluir a postagem no Supabase.');
          await PortalContent.hydrate({force:true});
        }
        renderItems(root);if(typeof window.renderOfficialPortal==='function')await window.renderOfficialPortal();
      }catch(err){alert(err?.message||'Não foi possível excluir o conteúdo.');}
    }));
  }
  window.openPortalAdmin=open;window.closePortalAdmin=close;
})();
