/*
 * MUNDOS SOMBRIOS — GALERIA / EDITOR DE CORTE
 * Proprietario canônico do fluxo de imagens da ficha.
 * Implementação nativa por Canvas: não depende de Cropper.js/CDN.
 */
(function installGalleryEditor(){
  'use strict';

  let loadTicket=0,previousFocus=null;const pointers=new Map();
  const state={
    target:null,index:-1,src:'',image:null,rotation:0,scale:1,minScale:1,offsetX:0,offsetY:0,
    aspectRatio:1,freeAspect:true,dragging:false,pointerX:0,pointerY:0
  };

  function byId(id){ return document.getElementById(id); }
  function canvas(){ return byId('crop-canvas'); }
  function ctx(){ const c=canvas(); return c?c.getContext('2d'):null; }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function normalizeRatio(r){ const n=Number(r); return Number.isFinite(n)&&n>0?n:null; }

  function fitCanvas(){
    const c=canvas(), host=c&&c.parentElement; if(!c||!host) return;
    const rect=host.getBoundingClientRect();
    c.width=Math.max(320,Math.floor(rect.width));
    c.height=Math.max(260,Math.floor(Math.min(rect.height||420,520)));
  }

  function cropRect(){
    const c=canvas(); if(!c) return null;
    const pad=22, maxW=c.width-pad*2, maxH=c.height-pad*2;
    let w=maxW,h=maxH;
    const ratio=state.freeAspect?Number(byId('crop-free-ratio')?.value||1):state.aspectRatio;w=Math.min(maxW,maxH*ratio);h=w/ratio;
    return {x:(c.width-w)/2,y:(c.height-h)/2,w,h};
  }

  function resetTransform(){
    if(!state.image) return;
    state.rotation=0;const c=canvas(), angle=false;
    const iw=angle?state.image.naturalHeight:state.image.naturalWidth;
    const ih=angle?state.image.naturalWidth:state.image.naturalHeight;
    state.minScale=Math.max(0.05,Math.max(c.width/iw,c.height/ih));
    state.scale=state.minScale;
    state.offsetX=0; state.offsetY=0; state.rotation=0;
    draw();
  }

  function draw(){
    const c=canvas(), g=ctx(); if(!c||!g) return;
    g.clearRect(0,0,c.width,c.height);
    g.fillStyle='#0b0b0b'; g.fillRect(0,0,c.width,c.height);
    if(state.image){
      g.save();
      g.translate(c.width/2+state.offsetX,c.height/2+state.offsetY);
      g.rotate(state.rotation*Math.PI/180);
      g.scale(state.scale,state.scale);
      g.drawImage(state.image,-state.image.naturalWidth/2,-state.image.naturalHeight/2);
      g.restore();
    }
    const r=cropRect();
    if(!r) return;
    g.save();
    g.fillStyle='rgba(0,0,0,.60)';
    g.beginPath(); g.rect(0,0,c.width,c.height); g.rect(r.x,r.y,r.w,r.h); g.fill('evenodd');
    g.strokeStyle='#d4af37'; g.lineWidth=2; g.strokeRect(r.x,r.y,r.w,r.h);
    g.strokeStyle='rgba(255,255,255,.28)'; g.lineWidth=1;
    g.beginPath();
    g.moveTo(r.x+r.w/3,r.y); g.lineTo(r.x+r.w/3,r.y+r.h);
    g.moveTo(r.x+r.w*2/3,r.y); g.lineTo(r.x+r.w*2/3,r.y+r.h);
    g.moveTo(r.x,r.y+r.h/3); g.lineTo(r.x+r.w,r.y+r.h/3);
    g.moveTo(r.x,r.y+r.h*2/3); g.lineTo(r.x+r.w,r.y+r.h*2/3);
    g.stroke(); g.restore();
    const slider=byId('crop-zoom');if(slider)slider.value=state.scale/state.minScale;
  }

  function setRatio(r){
    state.freeAspect=!normalizeRatio(r);
    if(!state.freeAspect) state.aspectRatio=normalizeRatio(r);
    draw(); return true;
  }

  function zoom(delta){
    if(!state.image) return false;
    state.scale=clamp(state.scale*(1+Number(delta||0)),state.minScale,Math.max(state.minScale*8,8));
    draw(); return true;
  }

  window.openCropModal=function(imageSrc,target='avatar',index=-1){
    const modal=byId('crop-modal'), c=canvas();
    if(!modal||!c){ alert('Editor de corte indisponível.'); return false; }
    if(!imageSrc){ alert('Nenhuma imagem válida foi selecionada.'); return false; }
    const ticket=++loadTicket;previousFocus=document.activeElement;const edits=currentImageEdits||{gallery:[]};const saved=target==='gallery-edit'?edits.gallery?.[index]:target==='avatar'&&imageSrc===currentAvatarBase64?edits.avatar:null;imageSrc=saved?.source||imageSrc;const img=new Image();
    img.onload=()=>{if(ticket!==loadTicket)return;
      state.src=imageSrc; state.target=target; state.index=Number.isFinite(Number(index))?Number(index):-1;
      state.image=img; state.aspectRatio=target==='avatar'?1:1; state.freeAspect=target!=='avatar';
      modal.style.display='flex';
      requestAnimationFrame(()=>{if(ticket!==loadTicket)return;fitCanvas();resetTransform();if(saved){state.aspectRatio=saved.ratio||1;state.freeAspect=false;state.rotation=saved.rotation||0;state.scale=state.minScale*(saved.zoom||1);state.offsetX=(saved.x||0)*canvas().width;state.offsetY=(saved.y||0)*canvas().height;draw();}byId('crop-title')?.focus();});
    };
    img.onerror=()=>ticket===loadTicket&&alert('Não foi possível carregar a imagem selecionada.');
    img.src=imageSrc;
    return true;
  };

  window.setAspectRatio=function(ratio){ return setRatio(ratio); };
  window.rotateCrop=function(degrees){ if(!state.image)return false; state.rotation=(state.rotation+Number(degrees||0))%360; draw(); return true; };
  window.zoomCrop=function(delta){ return zoom(delta); };
  window.resetCrop=function(){ if(!state.image)return false; resetTransform(); return true; };

  window.cancelCrop=function(){loadTicket++;pointers.clear();previousFocus?.focus?.();
    const modal=byId('crop-modal'); if(modal) modal.style.display='none';
    state.target=null; state.index=-1; state.image=null; state.src=''; state.dragging=false;
    const g=ctx(); if(g&&canvas()) g.clearRect(0,0,canvas().width,canvas().height);
    return true;
  };

  window.confirmCrop=function(){
    if(!state.image){ alert('Nenhuma área de corte está ativa.'); return false; }
    try{
      const srcCanvas=canvas(), r=cropRect();
      const ratio=r.w/r.h;
      const outW=Math.min(1600,Math.round(1600*ratio)), outH=Math.max(1,Math.round(outW/ratio));
      const out=document.createElement('canvas'); out.width=outW; out.height=outH;
      const g=out.getContext('2d');
      g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
      // Reproduz o mesmo transform do viewport, mas deslocado pelo recorte.
      g.save();
      g.beginPath(); g.rect(0,0,outW,outH); g.clip();
      const sx=outW/r.w, sy=outH/r.h;
      g.scale(sx,sy);
      g.translate(srcCanvas.width/2+state.offsetX-r.x,srcCanvas.height/2+state.offsetY-r.y);
      g.rotate(state.rotation*Math.PI/180);
      g.scale(state.scale,state.scale);
      g.drawImage(state.image,-state.image.naturalWidth/2,-state.image.naturalHeight/2);
      g.restore();
      const base64=out.toDataURL('image/jpeg',0.78);
      const target=state.target, idx=state.index;const edit={source:state.src,rotation:state.rotation,ratio,zoom:state.scale/state.minScale,x:state.offsetX/srcCanvas.width,y:state.offsetY/srcCanvas.height};currentImageEdits=currentImageEdits||{avatar:null,gallery:[]};currentImageEdits.gallery=currentImageEdits.gallery||[];
      if(target==='avatar'){
        currentAvatarBase64=base64;currentImageEdits.avatar=edit;
        const host=byId('avatar-preview-container'); if(host) host.innerHTML=`<img src="${base64}" alt="Retrato">`;
      }else if(target==='gallery-edit'){
        if(idx<0||!Array.isArray(currentGallery)||idx>=currentGallery.length) throw new Error('Imagem da galeria não encontrada.');
        currentGallery[idx]=base64;currentImageEdits.gallery[idx]=edit; window.renderGallery();
      }else if(target==='gallery'){
        if(!Array.isArray(currentGallery)) currentGallery=[];
        if(currentGallery.length>=10) throw new Error('A galeria já atingiu o limite de 10 imagens.');
        currentImageEdits.gallery[currentGallery.length]=edit;currentGallery.push(base64); window.renderGallery();
      }else throw new Error('Destino do corte desconhecido.');
      window.MS_ONLINE_UI?.saveBuilderDraft?.();window.MS_IMMERSION?.update?.();window.cancelCrop(); return true;
    }catch(error){ console.error('[Mundos Sombrios] Falha no editor de corte:',error); alert(`Não foi possível concluir o corte: ${error.message||'erro desconhecido'}`); return false; }
  };

  function bindCanvas(){
    const c=canvas(); if(!c||c.__msBound) return;
    c.__msBound=true;
    c.addEventListener('pointerdown',e=>{if(!state.image)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});c.setPointerCapture?.(e.pointerId);});
    c.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),other=[...pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const before=Math.hypot(old.x-other.x,old.y-other.y),after=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(before>0)zoom(after/before-1);}else{const r=c.getBoundingClientRect();state.offsetX+=(e.clientX-old.x)*c.width/r.width;state.offsetY+=(e.clientY-old.y)*c.height/r.height;draw();}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});e.preventDefault();});
    const end=e=>pointers.delete(e.pointerId);c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
    c.addEventListener('wheel',e=>{ if(!state.image)return; e.preventDefault(); zoom(e.deltaY<0?.08:-.08); },{passive:false});
    window.addEventListener('resize',()=>{if(state.image){const old=canvas().width;fitCanvas();const factor=canvas().width/old;state.scale*=factor;state.minScale*=factor;state.offsetX*=factor;state.offsetY*=factor;draw();}});
    bindCanvas.__bound=true;
  }

  window.removeGalleryImage=function(idx,event){
    if(event) event.stopPropagation(); if(!Array.isArray(currentGallery)||idx<0||idx>=currentGallery.length)return false;
    currentGallery.splice(idx,1);currentImageEdits?.gallery?.splice(idx,1);window.MS_ONLINE_UI?.saveBuilderDraft?.(); window.renderGallery(); return true;
  };

  window.renderGallery=function renderGalleryCanonical(){
    const container=byId('gallery-container'); if(!container)return;
    container.innerHTML=''; const list=Array.isArray(currentGallery)?currentGallery:[];
    list.forEach((src,idx)=>{
      const item=document.createElement('div'); item.className='gallery-thumb';
      const img=document.createElement('img'); img.src=src; img.alt=`Imagem da galeria ${idx+1}`;
      img.addEventListener('click',()=>viewFullscreen(src)); item.appendChild(img);
      if(typeof isEditMode==='undefined'||isEditMode){
        const edit=document.createElement('button'); edit.type='button'; edit.className='edit-gallery-btn'; edit.textContent='Editar imagem';
        edit.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.openCropModal(currentGallery[idx],'gallery-edit',idx);}); item.appendChild(edit);
        const del=document.createElement('button'); del.type='button'; del.className='delete-btn'; del.textContent='Remover'; del.title='Excluir imagem';
        del.addEventListener('click',e=>window.removeGalleryImage(idx,e)); item.appendChild(del);
      }
      if(typeof isEditMode==='undefined'||isEditMode){const portrait=document.createElement('button');portrait.type='button';portrait.textContent='Usar como retrato';portrait.onclick=()=>window.openCropModal(currentImageEdits?.gallery?.[idx]?.source||src,'avatar');item.appendChild(portrait);}container.appendChild(item);
    });
  };

  window.setCropZoom=value=>{if(!state.image)return;state.scale=state.minScale*clamp(Number(value),1,8);draw();};
  window.setCropTilt=value=>{state.rotation=Math.round(state.rotation/90)*90+Number(value);draw();};
  window.updateFreeCrop=()=>{state.freeAspect=true;draw();};
  document.addEventListener('keydown',e=>{if(byId('crop-modal')?.style.display!=='flex')return;if(e.key==='Escape'){e.preventDefault();window.cancelCrop();}if(e.key==='Tab'){const items=[...byId('crop-modal').querySelectorAll('button,input,select,[tabindex="0"]')],first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  bindCanvas();
  window.addEventListener('screen:changing',()=>{if(state.image)window.cancelCrop();});
  window.__galleryEditorOwner='js/gallery-editor.js';
  window.__galleryEditorReady=true;
  window.__galleryCropEngine='native-canvas';
})();
