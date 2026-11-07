/* Mundos Sombrios — Grid Engine V2.10.9
 * Editor de matriz tática por Cena com preview não destrutivo em tempo real.
 * A configuração oficial só muda em APLICAR À CENA; todo ajuste do Mestre usa
 * um rascunho visual isolado e pode ser descartado integralmente.
 */
(function(){
  'use strict';

  const VERSION='2.10.9';
  const TYPES=new Set(['square','hex-flat','hex-pointy','iso','none']);
  const DEFAULT_CONFIG=Object.freeze({
    schemaVersion:1,type:'square',columns:16,rows:16,
    cellWidth:64,cellHeight:64,boardWidth:1024,boardHeight:1024,
    offsetX:0,offsetY:0,rotation:0,snap:true,showGrid:true,
    showCoordinates:false,showToPlayers:true,lineWidth:1,opacity:.45,
    lineColor:'#65717a',unitName:'m',unitsPerCell:1.5
  });

  const state={
    config:null,previewConfig:null,remotePreview:null,
    overlay:null,ctx:null,host:null,panel:null,
    calibrating:false,dragHandle:null,sharePreview:false,
    renderFrame:null,renderNeedsFit:false,renderNeedsRescale:false,previewBroadcastTimer:null,
    objectSnapshots:null,paletteTab:'structure',paletteMinimized:false,paletteDrag:null,uiBound:false
  };

  const clone=v=>JSON.parse(JSON.stringify(v));
  const clamp=(n,min,max,fallback)=>{n=Number(n);return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback};
  const num=(n,f)=>Number.isFinite(Number(n))?Number(n):f;
  const gm=()=>{try{return !!window.__msVttIsGM}catch(_){return false}};
  const canvas=()=>window.vttCanvas||null;
  const panelOpen=()=>!!(state.panel&&!state.panel.hidden);
  const configsEqual=(a,b)=>JSON.stringify(normalize(a||{}))===JSON.stringify(normalize(b||{}));

  function normalize(raw={}){
    const src={...DEFAULT_CONFIG,...(raw&&typeof raw==='object'?raw:{})};
    const type=TYPES.has(src.type)?src.type:'square';
    return {
      schemaVersion:1,type,
      columns:Math.round(clamp(src.columns,1,200,16)),rows:Math.round(clamp(src.rows,1,200,16)),
      cellWidth:clamp(src.cellWidth,4,1024,64),cellHeight:clamp(src.cellHeight,4,1024,64),
      boardWidth:clamp(src.boardWidth,128,8192,1024),boardHeight:clamp(src.boardHeight,128,8192,1024),
      offsetX:clamp(src.offsetX,-8192,8192,0),offsetY:clamp(src.offsetY,-8192,8192,0),
      rotation:clamp(src.rotation,-360,360,0),snap:src.snap!==false,showGrid:src.showGrid!==false,
      showCoordinates:!!src.showCoordinates,showToPlayers:src.showToPlayers!==false,
      lineWidth:clamp(src.lineWidth,.25,8,1),opacity:clamp(src.opacity,.05,1,.45),
      lineColor:/^#[0-9a-f]{6}$/i.test(String(src.lineColor||''))?String(src.lineColor):'#65717a',
      unitName:String(src.unitName||'m').trim().slice(0,16)||'m',unitsPerCell:clamp(src.unitsPerCell,.01,100000,1.5)
    };
  }

  function official(){
    if(!state.config)state.config=normalize(window.MasterTools?.getGridConfig?.()||DEFAULT_CONFIG);
    return state.config;
  }
  function active(){return state.previewConfig||state.remotePreview||official();}
  function isPreviewing(){return !!state.previewConfig&&panelOpen();}
  function logicalScale(){const c=canvas(),cfg=active();return{sx:Math.max(.0001,num(c?.width,640)/cfg.boardWidth),sy:Math.max(.0001,num(c?.height,640)/cfg.boardHeight)}}
  function toScreen(p){const{sx,sy}=logicalScale();return{x:p.x*sx,y:p.y*sy}}
  function toLogical(p){const{sx,sy}=logicalScale();return{x:p.x/sx,y:p.y/sy}}
  function deg(v){return v*Math.PI/180}
  function rotatePoint(x,y,cx,cy,angle){const a=deg(angle),cs=Math.cos(a),sn=Math.sin(a),dx=x-cx,dy=y-cy;return{x:cx+dx*cs-dy*sn,y:cy+dx*sn+dy*cs}}
  function inverseRotatePoint(x,y,cx,cy,angle){return rotatePoint(x,y,cx,cy,-angle)}
  function metrics(){const cfg=active(),{sx,sy}=logicalScale();return{config:clone(cfg),cols:cfg.columns,rows:cfg.rows,cellW:cfg.cellWidth*sx,cellH:cfg.cellHeight*sy,logicalCellW:cfg.cellWidth,logicalCellH:cfg.cellHeight,boardWidth:cfg.boardWidth,boardHeight:cfg.boardHeight,sx,sy}}

  function ensureOverlay(){
    const host=document.getElementById('canvas-wrapper');if(!host)return null;state.host=host;
    let el=host.querySelector(':scope > canvas.ms-grid-overlay');
    if(!el){el=document.createElement('canvas');el.className='ms-grid-overlay';el.setAttribute('aria-hidden','true');host.appendChild(el);installCalibrationEvents(el)}
    state.overlay=el;state.ctx=el.getContext('2d');resizeOverlay();return el;
  }
  function resizeOverlay(){
    const el=state.overlay,host=state.host||document.getElementById('canvas-wrapper');if(!el||!host)return;
    const dpr=Math.min(2,window.devicePixelRatio||1),w=Math.max(1,Math.round(host.clientWidth)),h=Math.max(1,Math.round(host.clientHeight));
    if(el.width!==Math.round(w*dpr)||el.height!==Math.round(h*dpr)){
      el.width=Math.round(w*dpr);el.height=Math.round(h*dpr);el.style.width=w+'px';el.style.height=h+'px';
      const ctx=el.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);state.ctx=ctx;
    }
  }
  function applyHostRatio(){
    const host=document.getElementById('canvas-wrapper'),cfg=active();if(!host)return;
    host.style.setProperty('--ms-board-ratio',`${cfg.boardWidth} / ${cfg.boardHeight}`);
    host.style.setProperty('--ms-board-aspect',String(cfg.boardWidth/cfg.boardHeight));
    host.style.aspectRatio=`${cfg.boardWidth} / ${cfg.boardHeight}`;
  }
  function requestRender({fit=false,rescale=false}={}){
    if(fit){applyHostRatio();state.renderNeedsFit=true;state.renderNeedsRescale=true}
    if(rescale)state.renderNeedsRescale=true;
    if(state.renderFrame)return;
    const raf=window.requestAnimationFrame||((fn)=>setTimeout(fn,16));
    state.renderFrame=raf(()=>{
      state.renderFrame=null;const needsFit=state.renderNeedsFit,needsRescale=state.renderNeedsRescale;state.renderNeedsFit=false;state.renderNeedsRescale=false;
      if(needsFit)window.msResizeVttGrid?.();
      resizeOverlay();
      if(needsRescale)rescaleManagedTokens();
      draw();window.MS_GRID_ARCHITECT?.draw?.();
    });
  }
  function fitHost(){applyHostRatio();requestRender({fit:true,rescale:true})}

  function shouldDraw(){const cfg=active();if(window.MS_GRID_ARCHITECT)return false;return cfg.type!=='none'&&cfg.showGrid&&(gm()||cfg.showToPlayers)}
  function beginStyle(ctx){const cfg=active();ctx.lineWidth=cfg.lineWidth;ctx.strokeStyle=cfg.lineColor;ctx.globalAlpha=cfg.opacity;ctx.lineCap='butt';ctx.lineJoin='round'}
  function line(ctx,a,b){const A=toScreen(a),B=toScreen(b);ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.stroke()}
  function squarePoint(col,row){const cfg=active(),p={x:cfg.offsetX+col*cfg.cellWidth,y:cfg.offsetY+row*cfg.cellHeight};return rotatePoint(p.x,p.y,cfg.offsetX,cfg.offsetY,cfg.rotation)}
  function drawSquare(ctx){const cfg=active();for(let c=0;c<=cfg.columns;c++)line(ctx,squarePoint(c,0),squarePoint(c,cfg.rows));for(let r=0;r<=cfg.rows;r++)line(ctx,squarePoint(0,r),squarePoint(cfg.columns,r));if(cfg.showCoordinates)drawSquareCoordinates(ctx)}
  function drawSquareCoordinates(ctx){
    const cfg=active();ctx.save();ctx.globalAlpha=Math.min(1,cfg.opacity+.35);ctx.fillStyle=cfg.lineColor;ctx.font='10px system-ui,sans-serif';
    for(let c=0;c<cfg.columns;c+=Math.max(1,Math.ceil(cfg.columns/32))){const p=toScreen(squarePoint(c+.5,.35));ctx.fillText(String(c+1),p.x-3,p.y)}
    for(let r=0;r<cfg.rows;r+=Math.max(1,Math.ceil(cfg.rows/32))){const p=toScreen(squarePoint(.2,r+.55));ctx.fillText(String.fromCharCode(65+(r%26)),p.x,p.y)}ctx.restore();
  }
  function hexDims(){const cfg=active();if(cfg.type==='hex-flat'){const rx=cfg.cellWidth/2,ry=cfg.cellHeight/2;return{rx,ry,dx:rx*1.5,dy:ry*2}}const rx=cfg.cellWidth/2,ry=cfg.cellHeight/2;return{rx,ry,dx:rx*2,dy:ry*1.5}}
  function hexCenter(col,row){const cfg=active(),d=hexDims();let x,y;if(cfg.type==='hex-flat'){x=cfg.offsetX+d.rx+col*d.dx;y=cfg.offsetY+d.ry+row*d.dy+(col%2?d.ry:0)}else{x=cfg.offsetX+d.rx+col*d.dx+(row%2?d.rx:0);y=cfg.offsetY+d.ry+row*d.dy}return rotatePoint(x,y,cfg.offsetX,cfg.offsetY,cfg.rotation)}
  function hexVertices(center){const cfg=active(),d=hexDims(),start=cfg.type==='hex-flat'?0:-30,out=[],base=inverseRotatePoint(center.x,center.y,cfg.offsetX,cfg.offsetY,cfg.rotation);for(let i=0;i<6;i++){const a=deg(start+i*60),p={x:base.x+d.rx*Math.cos(a),y:base.y+d.ry*Math.sin(a)};out.push(rotatePoint(p.x,p.y,cfg.offsetX,cfg.offsetY,cfg.rotation))}return out}
  function drawHex(ctx){const cfg=active();for(let r=0;r<cfg.rows;r++)for(let c=0;c<cfg.columns;c++){const center=hexCenter(c,r),vs=hexVertices(center).map(toScreen);ctx.beginPath();vs.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();if(cfg.showCoordinates&&cfg.columns*cfg.rows<=1600){const p=toScreen(center);ctx.save();ctx.globalAlpha=Math.min(1,cfg.opacity+.35);ctx.fillStyle=cfg.lineColor;ctx.font='9px system-ui,sans-serif';ctx.fillText(`${c+1},${r+1}`,p.x-8,p.y+3);ctx.restore()}}}
  function drawCalibration(ctx){
    if(!state.calibrating||!gm())return;const hs=calibrationHandles(),o=hs.origin,x=hs.x,y=hs.y;
    ctx.save();ctx.globalAlpha=1;ctx.setLineDash([5,4]);ctx.strokeStyle='#f4cf72';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(x.x,x.y);ctx.moveTo(o.x,o.y);ctx.lineTo(y.x,y.y);ctx.stroke();ctx.setLineDash([]);
    [['origin',o,'O'],['x',x,'X'],['y',y,'Y']].forEach(([k,p,t])=>{ctx.fillStyle=k==='origin'?'#fff1bd':k==='x'?'#62e6ff':'#e692ff';ctx.beginPath();ctx.arc(p.x,p.y,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#101217';ctx.font='bold 9px system-ui';ctx.fillText(t,p.x-3,p.y+3)});ctx.restore();
  }
  function fmt(n){const v=Number(n);return Number.isInteger(v)?String(v):String(Math.round(v*100)/100).replace('.',',')}
  function updateReadouts(){
    const cfg=active(),label=document.querySelector('.ms-grid-dimension'),scale=document.getElementById('vtt-grid-scale-readout');
    if(label){const t={square:'ORTOGONAL','hex-flat':'HEX · HORIZONTAL','hex-pointy':'HEX · VERTICAL',iso:'ISOMÉTRICO',none:'LIVRE'}[cfg.type]||cfg.type;label.textContent=`MATRIZ TÁTICA · ${cfg.columns} × ${cfg.rows} · ${t}${state.previewConfig?' · PREVIEW':''}`}
    if(scale)scale.textContent=`${fmt(cfg.unitsPerCell)} ${cfg.unitName} / célula`;
    const snap=document.querySelector('[data-ms-grid-snap-state]');if(snap)snap.textContent=cfg.snap?'Snap: ligado':'Snap: livre';
  }
  function draw(){
    const el=ensureOverlay();if(!el||!state.ctx)return;resizeOverlay();
    const ctx=state.ctx,w=parseFloat(el.style.width)||el.clientWidth,h=parseFloat(el.style.height)||el.clientHeight;ctx.clearRect(0,0,w,h);
    if(shouldDraw()){ctx.save();beginStyle(ctx);['square','iso'].includes(active().type)?drawSquare(ctx):drawHex(ctx);ctx.restore()}
    drawCalibration(ctx);updateReadouts();
  }

  function nearestHex(logical){
    const cfg=active(),d=hexDims(),q=inverseRotatePoint(logical.x,logical.y,cfg.offsetX,cfg.offsetY,cfg.rotation);let c0=0,r0=0;
    if(cfg.type==='hex-flat'){c0=Math.round((q.x-cfg.offsetX-d.rx)/d.dx);r0=Math.round((q.y-cfg.offsetY-d.ry-(c0%2?d.ry:0))/d.dy)}else{r0=Math.round((q.y-cfg.offsetY-d.ry)/d.dy);c0=Math.round((q.x-cfg.offsetX-d.rx-(r0%2?d.rx:0))/d.dx)}
    let best=null,dist=Infinity;for(let r=Math.max(0,r0-2);r<=Math.min(cfg.rows-1,r0+2);r++)for(let c=Math.max(0,c0-2);c<=Math.min(cfg.columns-1,c0+2);c++){const p=hexCenter(c,r),ds=(p.x-logical.x)**2+(p.y-logical.y)**2;if(ds<dist){dist=ds;best={...p,col:c,row:r}}}
    return best||{x:logical.x,y:logical.y,col:Math.max(0,Math.min(cfg.columns-1,c0)),row:Math.max(0,Math.min(cfg.rows-1,r0))};
  }
  function snapPoint(screenPoint){const cfg=active();if(!cfg.snap||cfg.type==='none')return{x:screenPoint.x,y:screenPoint.y};const p=toLogical(screenPoint);if(cfg.type==='square'||cfg.type==='iso'){const q=inverseRotatePoint(p.x,p.y,cfg.offsetX,cfg.offsetY,cfg.rotation),col=Math.round((q.x-cfg.offsetX)/cfg.cellWidth),row=Math.round((q.y-cfg.offsetY)/cfg.cellHeight),s=squarePoint(col,row);return toScreen(s)}return toScreen(nearestHex(p))}
  function snapObject(obj){if(!obj||!active().snap||active().type==='none')return obj;const p=snapPoint({x:num(obj.left,0),y:num(obj.top,0)});obj.set?.({left:p.x,top:p.y});return obj}
  function squareCellAt(screenPoint){const cfg=active(),p=toLogical(screenPoint),q=inverseRotatePoint(p.x,p.y,cfg.offsetX,cfg.offsetY,cfg.rotation);return{col:Math.floor((q.x-cfg.offsetX)/cfg.cellWidth),row:Math.floor((q.y-cfg.offsetY)/cfg.cellHeight)}}
  function cellAt(screenPoint){return active().type==='square'?squareCellAt(screenPoint):nearestHex(toLogical(screenPoint))}
  function axialFromOffset(col,row,type){if(type==='hex-flat'){const q=col,r=row-(col-(col&1))/2;return{q,r}}const q=col-(row-(row&1))/2,r=row;return{q,r}}
  function hexDistance(a,b,type){const A=axialFromOffset(a.col,a.row,type),B=axialFromOffset(b.col,b.row,type),ax=A.q,az=A.r,ay=-ax-az,bx=B.q,bz=B.r,by=-bx-bz;return(Math.abs(ax-bx)+Math.abs(ay-by)+Math.abs(az-bz))/2}
  function measure(a,b){const cfg=active();let cells=0;if(cfg.type==='square'){const A=squareCellAt(a),B=squareCellAt(b),dx=B.col-A.col,dy=B.row-A.row;cells=Math.hypot(dx,dy)}else if(cfg.type.startsWith('hex')){cells=hexDistance(cellAt(a),cellAt(b),cfg.type)}else{const A=toLogical(a),B=toLogical(b);cells=Math.hypot(B.x-A.x,B.y-A.y)/Math.max(1,(cfg.cellWidth+cfg.cellHeight)/2)}return{cells,distance:cells*cfg.unitsPerCell,unit:cfg.unitName}}
  function tokenCellPixels(){const cfg=active(),m=metrics();return{w:cfg.cellWidth*m.sx,h:cfg.cellHeight*m.sy}}
  function applyTokenSize(obj,widthCells=1,heightCells=widthCells,{silent=false}={}){if(!obj)return false;widthCells=clamp(widthCells,.25,20,1);heightCells=clamp(heightCells,.25,20,widthCells);const p=tokenCellPixels(),baseW=Math.max(1,num(obj.width,1)),baseH=Math.max(1,num(obj.height,1));obj.set?.({msTokenWidthCells:widthCells,msTokenHeightCells:heightCells,scaleX:(p.w*widthCells)/baseW,scaleY:(p.h*heightCells)/baseH});obj.setCoords?.();if(!silent)canvas()?.requestRenderAll?.();return true}
  function rescaleManagedTokens(){const c=canvas();if(!c)return;c.getObjects?.().forEach(o=>{if(num(o.msTokenWidthCells,0)>0)applyTokenSize(o,o.msTokenWidthCells,o.msTokenHeightCells||o.msTokenWidthCells,{silent:true})});c.requestRenderAll?.()}

  function setOfficial(next,{persist=false,broadcast=true,fit=true}={}){
    state.config=normalize(next);state.remotePreview=null;
    if(fit)fitHost();else requestRender({rescale:true});
    if(persist&&gm())return Promise.resolve(window.MasterTools?.saveSceneGridConfig?.(state.config,{broadcast})).then(()=>clone(state.config));
    return clone(state.config);
  }
  function setPreview(next,{fit=false,rescale=false,share=true}={}){
    if(!gm()||!panelOpen())return setOfficial(next,{persist:false,fit});
    state.previewConfig=normalize(next);
    if(fit)fitHost();else requestRender({rescale});
    syncPanel();
    if(share)scheduleSharedPreview();
    return clone(state.previewConfig);
  }
  function setConfig(next,{persist=false,broadcast=true,fit=true}={}){
    if(persist)return setOfficial(next,{persist:true,broadcast,fit});
    if(isPreviewing())return setPreview(next,{fit});
    return setOfficial(next,{persist:false,fit});
  }
  function applyRemote(next){
    state.config=normalize(next||DEFAULT_CONFIG);state.remotePreview=null;
    if(!isPreviewing())state.previewConfig=null;
    requestRender({fit:true});return clone(state.config);
  }
  function applySharedPreview(next){
    if(isPreviewing())return clone(active());
    state.remotePreview=next&&typeof next==='object'?normalize(next):null;
    requestRender({fit:true});return clone(active());
  }
  function persisted(){return normalize(window.MasterTools?.getGridConfig?.()||DEFAULT_CONFIG)}

  function snapshotObjects(){
    const c=canvas();state.objectSnapshots=new Map();if(!c?.getObjects)return;
    c.getObjects().forEach(o=>{if(o.isGridLine||o.isRuler)return;state.objectSnapshots.set(o,{left:num(o.left,0),top:num(o.top,0),angle:num(o.angle,0),scaleX:num(o.scaleX,1),scaleY:num(o.scaleY,1),msTokenWidthCells:o.msTokenWidthCells??null,msTokenHeightCells:o.msTokenHeightCells??null})});
  }
  function restoreObjectSnapshots(){
    const c=canvas();if(!state.objectSnapshots||!c)return;
    state.objectSnapshots.forEach((snap,obj)=>{if(!c.getObjects().includes(obj))return;obj.set?.(snap);obj.setCoords?.()});c.requestRenderAll?.();
  }
  function objectChanged(obj,snap){
    if(!snap)return false;const eps=.001;
    return Math.abs(num(obj.left,0)-snap.left)>eps||Math.abs(num(obj.top,0)-snap.top)>eps||Math.abs(num(obj.angle,0)-snap.angle)>eps||Number(obj.msTokenWidthCells||0)!==Number(snap.msTokenWidthCells||0)||Number(obj.msTokenHeightCells||0)!==Number(snap.msTokenHeightCells||0);
  }
  function anyObjectDraft(){if(!state.objectSnapshots)return false;for(const [obj,snap] of state.objectSnapshots.entries())if(objectChanged(obj,snap))return true;return false}
  async function commitObjectDrafts(){
    const c=canvas(),jobs=[];if(!c||!state.objectSnapshots)return;
    state.objectSnapshots.forEach((snap,obj)=>{
      if(!objectChanged(obj,snap)||!obj.msTokenId)return;
      if(window.MS_TABLE_SESSION?.send&&window.MS_TABLE_SESSION?.current?.().tableId)jobs.push(Promise.resolve(window.MS_TABLE_SESSION.send('token_move',{tokenId:String(obj.msTokenId),left:num(obj.left,0),top:num(obj.top,0),angle:num(obj.angle,0),scaleX:num(obj.scaleX,1),scaleY:num(obj.scaleY,1),msTokenWidthCells:Number(obj.msTokenWidthCells)||null,msTokenHeightCells:Number(obj.msTokenHeightCells)||null})).catch(()=>null));
    });
    window.MasterTools?.saveGrid?.(c);if(jobs.length)await Promise.all(jobs);
  }
  function previewSelectedTokenSize(){
    if(!isPreviewing())return false;const panel=state.panel,obj=canvas()?.getActiveObject?.();
    if(!obj||obj.isGridLine||obj.isRuler)return false;
    const w=panel?.querySelector('#ms-token-width-cells')?.value,h=panel?.querySelector('#ms-token-height-cells')?.value;
    applyTokenSize(obj,w,h);updateDraftState();return true;
  }
  function syncTokenPanelFromSelection(){
    const panel=state.panel,obj=canvas()?.getActiveObject?.();if(!panel)return;
    const w=panel.querySelector('#ms-token-width-cells'),h=panel.querySelector('#ms-token-height-cells');if(!w||!h)return;
    w.value=Number(obj?.msTokenWidthCells)||1;h.value=Number(obj?.msTokenHeightCells)||Number(obj?.msTokenWidthCells)||1;
  }

  function preset(name){const cfg=clone(active()),p={compact:[12,12],standard:[16,16],wide:[24,16],large:[30,20],epic:[50,50]}[name]||[16,16];cfg.columns=p[0];cfg.rows=p[1];cfg.cellWidth=64;cfg.cellHeight=64;cfg.boardWidth=cfg.columns*cfg.cellWidth;cfg.boardHeight=cfg.rows*cfg.cellHeight;cfg.offsetX=cfg.offsetY=0;cfg.rotation=0;return setPreview(cfg,{fit:true,rescale:true})}
  function fitCellsToBoard(){const cfg=clone(active());cfg.cellWidth=cfg.boardWidth/cfg.columns;cfg.cellHeight=cfg.boardHeight/cfg.rows;return isPreviewing()?setPreview(cfg,{rescale:true}):setOfficial(cfg)}
  function fitBoardToGrid(){const cfg=clone(active());if(cfg.type==='square'||cfg.type==='iso'){cfg.boardWidth=Math.max(128,cfg.offsetX+cfg.columns*cfg.cellWidth);cfg.boardHeight=Math.max(128,cfg.offsetY+cfg.rows*cfg.cellHeight)}else{const d=hexDims();if(cfg.type==='hex-flat'){cfg.boardWidth=Math.max(128,cfg.offsetX+d.rx*2+(cfg.columns-1)*d.dx);cfg.boardHeight=Math.max(128,cfg.offsetY+cfg.rows*d.dy+d.ry)}else{cfg.boardWidth=Math.max(128,cfg.offsetX+cfg.columns*d.dx+d.rx);cfg.boardHeight=Math.max(128,cfg.offsetY+d.ry*2+(cfg.rows-1)*d.dy)}}return isPreviewing()?setPreview(cfg,{fit:true,rescale:true}):setOfficial(cfg)}
  function fitBoardToBackground(){const bg=canvas()?.backgroundImage;if(!bg?.width||!bg?.height){window.MS_PLATFORM?.toast?.('Carregue um mapa de fundo antes de ajustar o tabuleiro.','error');return false}const cfg=clone(active());cfg.boardWidth=clamp(bg.width,128,8192,1024);cfg.boardHeight=clamp(bg.height,128,8192,1024);isPreviewing()?setPreview(cfg,{fit:true,rescale:true}):setOfficial(cfg);return true}

  const PALETTE_POSITION_KEY='ms:grid-palette-position:v2';
  function paletteHost(){return document.getElementById('vtt-grid-window')||document.body}
  function storedPalettePosition(){try{return JSON.parse(localStorage.getItem(PALETTE_POSITION_KEY)||'null')}catch(_){return null}}
  function storePalettePosition(){const p=state.panel;if(!p||p.hidden)return;try{localStorage.setItem(PALETTE_POSITION_KEY,JSON.stringify({left:parseFloat(p.style.left)||0,top:parseFloat(p.style.top)||0}))}catch(_){}}
  function clampPalettePosition(left,top){
    const panel=state.panel,host=paletteHost(),rect=host.getBoundingClientRect(),margin=6;
    const width=Math.min(panel?.offsetWidth||430,Math.max(0,rect.width-margin*2));
    const minVisible=state.paletteMinimized?52:96;
    const maxLeft=Math.max(margin,rect.width-Math.min(width,rect.width-margin*2)-margin);
    const maxTop=Math.max(margin,rect.height-minVisible-margin);
    return{left:Math.max(margin,Math.min(maxLeft,num(left,margin))),top:Math.max(margin,Math.min(maxTop,num(top,72)))};
  }
  function placePalette(position=null){
    const panel=state.panel;if(!panel)return;
    const host=paletteHost(),rect=host.getBoundingClientRect();
    const hasPosition=!!(position&&typeof position==='object'&&(position.clientX!=null||position.left!=null||position.top!=null));
    let pos=hasPosition?position:storedPalettePosition();
    if(position?.clientX!=null)pos={left:position.clientX-rect.left-(panel.offsetWidth||430)/2,top:position.clientY-rect.top-26};
    if(!pos)pos={left:Math.max(8,rect.width-(panel.offsetWidth||430)-18),top:76};
    const clamped=clampPalettePosition(pos.left,pos.top);panel.style.left=`${clamped.left}px`;panel.style.top=`${clamped.top}px`;
  }
  function movePaletteBy(dx,dy){const p=state.panel;if(!p)return;const next=clampPalettePosition((parseFloat(p.style.left)||0)+dx,(parseFloat(p.style.top)||0)+dy);p.style.left=`${next.left}px`;p.style.top=`${next.top}px`;storePalettePosition()}
  function installPaletteDrag(panel){
    const handle=panel.querySelector('[data-grid-drag-handle]');if(!handle)return;
    const begin=e=>{
      if(e.button!=null&&e.button!==0)return;if(e.target.closest('button,input,select,textarea'))return;
      const r=panel.getBoundingClientRect(),host=paletteHost().getBoundingClientRect();state.paletteDrag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top,hostLeft:host.left,hostTop:host.top};
      panel.classList.add('is-dragging');handle.setPointerCapture?.(e.pointerId);e.preventDefault();
    };
    handle.addEventListener('pointerdown',begin);
    handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const step=e.shiftKey?32:12;const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;movePaletteBy(dx,dy);e.preventDefault()});
    handle.addEventListener('pointermove',e=>{const d=state.paletteDrag;if(!d||d.id!==e.pointerId)return;const pos=clampPalettePosition(e.clientX-d.hostLeft-d.dx,e.clientY-d.hostTop-d.dy);panel.style.left=`${pos.left}px`;panel.style.top=`${pos.top}px`;e.preventDefault()});
    const end=e=>{const d=state.paletteDrag;if(!d||d.id!==e.pointerId)return;state.paletteDrag=null;panel.classList.remove('is-dragging');try{handle.releasePointerCapture?.(e.pointerId)}catch(_){ }storePalettePosition()};
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
  }
  function setPaletteTab(tab){
    const panel=state.panel;if(!panel)return;const allowed=new Set(['structure','align','visual','scale','token']);state.paletteTab=allowed.has(tab)?tab:'structure';
    panel.querySelectorAll('[data-grid-tab]').forEach(btn=>{const active=btn.dataset.gridTab===state.paletteTab;btn.classList.toggle('is-active',active);btn.setAttribute('aria-selected',String(active))});
    panel.querySelectorAll('[data-grid-tab-panel]').forEach(section=>section.hidden=section.dataset.gridTabPanel!==state.paletteTab);
  }
  function setPaletteMinimized(minimized){state.paletteMinimized=!!minimized;const p=state.panel;if(!p)return;p.classList.toggle('is-minimized',state.paletteMinimized);const b=p.querySelector('[data-grid-minimize]');if(b){b.textContent=state.paletteMinimized?'□':'—';b.setAttribute('aria-label',state.paletteMinimized?'Expandir editor da matriz':'Recolher editor da matriz')}placePalette({left:parseFloat(p.style.left)||8,top:parseFloat(p.style.top)||72})}

  function makePanel(){
    let panel=document.getElementById('ms-grid-config-panel');if(panel){state.panel=panel;return panel}
    panel=document.createElement('section');panel.id='ms-grid-config-panel';panel.className='ms-grid-config-panel ms-grid-palette';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','false');panel.setAttribute('aria-labelledby','ms-grid-config-title');
    panel.innerHTML=`
      <header class="ms-grid-palette-head" data-grid-drag-handle tabindex="0" aria-label="Mover editor da matriz. Arraste ou use as setas do teclado.">
        <span class="ms-grid-palette-grip" aria-hidden="true">⠿</span>
        <div class="ms-grid-palette-title"><small>MESTRE · EDITOR DE CENA</small><strong id="ms-grid-config-title">Matriz</strong><span data-grid-head-summary>16×16 · Ortogonal</span></div>
        <strong class="ms-grid-draft-badge" data-grid-preview-indicator>PREVIEW</strong>
        <div class="ms-grid-palette-window-actions"><button type="button" data-grid-minimize aria-label="Recolher editor da matriz">—</button><button type="button" data-grid-close aria-label="Fechar editor e descartar alterações não aplicadas">×</button></div>
      </header>
      <nav class="ms-grid-palette-tabs" role="tablist" aria-label="Áreas de configuração da matriz">
        <button type="button" role="tab" data-grid-tab="structure">Estrutura</button><button type="button" role="tab" data-grid-tab="align">Alinhamento</button><button type="button" role="tab" data-grid-tab="visual">Visual</button><button type="button" role="tab" data-grid-tab="scale">Escala</button><button type="button" role="tab" data-grid-tab="token">Totem</button>
      </nav>
      <div class="ms-grid-palette-body">
        <div class="ms-grid-live-summary" data-grid-summary aria-live="polite"></div>
        <section class="ms-grid-palette-section" data-grid-tab-panel="structure">
          <div class="ms-grid-preset-row"><button type="button" data-grid-preset="compact">12×12</button><button type="button" data-grid-preset="standard">16×16</button><button type="button" data-grid-preset="wide">24×16</button><button type="button" data-grid-preset="large">30×20</button><button type="button" data-grid-preset="epic">50×50</button></div>
          <label class="ms-grid-field">Formato<select data-grid="type"><option value="square">Ortogonal</option><option value="hex-flat">Hexagonal horizontal</option><option value="hex-pointy">Hexagonal vertical</option><option value="iso">Isométrico</option><option value="none">Livre / sem grade</option></select></label>
          <div class="ms-grid-fields-2"><label class="ms-grid-field">Colunas<input data-grid="columns" type="number" min="1" max="200"></label><label class="ms-grid-field">Linhas<input data-grid="rows" type="number" min="1" max="200"></label></div>
          <label class="ms-grid-field">Largura da célula<div class="ms-grid-live-control"><input data-grid="cellWidth" type="number" min="4" max="1024" step="1"><input data-grid-range="cellWidth" type="range" min="4" max="256" step="1"></div></label>
          <label class="ms-grid-field">Altura da célula<div class="ms-grid-live-control"><input data-grid="cellHeight" type="number" min="4" max="1024" step="1"><input data-grid-range="cellHeight" type="range" min="4" max="256" step="1"></div></label>
          <button type="button" class="ms-grid-wide-action" data-grid-action="fit-cells">AJUSTAR CÉLULAS AO TABULEIRO</button>
        </section>
        <section class="ms-grid-palette-section" data-grid-tab-panel="align" hidden>
          <div class="ms-grid-fields-2"><label class="ms-grid-field">Área · largura<input data-grid="boardWidth" type="number" min="128" max="8192"></label><label class="ms-grid-field">Área · altura<input data-grid="boardHeight" type="number" min="128" max="8192"></label></div>
          <div class="ms-grid-fields-2"><label class="ms-grid-field">Deslocamento X<input data-grid="offsetX" type="number" step="1"></label><label class="ms-grid-field">Deslocamento Y<input data-grid="offsetY" type="number" step="1"></label></div>
          <label class="ms-grid-field">Rotação<div class="ms-grid-live-control"><input data-grid="rotation" type="number" min="-360" max="360" step="0.5"><input data-grid-range="rotation" type="range" min="-180" max="180" step="0.5"><output data-grid-readout="rotation">0°</output></div></label>
          <div class="ms-grid-action-stack"><button type="button" data-grid-action="calibrate">CALIBRAR DIRETAMENTE NO MAPA</button><button type="button" data-grid-action="fit-board">REDIMENSIONAR ÁREA PARA A GRADE</button><button type="button" data-grid-action="fit-background">USAR TAMANHO DA IMAGEM</button></div>
          <p class="ms-grid-help">Na calibração, arraste <b>O</b> para a origem, <b>X</b> para largura/rotação e <b>Y</b> para altura. A paleta continua móvel durante o ajuste.</p>
        </section>
        <section class="ms-grid-palette-section" data-grid-tab-panel="visual" hidden>
          <div class="ms-grid-toggle-list"><label><input data-grid="showGrid" type="checkbox"> Exibir grade</label><label><input data-grid="snap" type="checkbox"> Encaixar totens e objetos</label><label><input data-grid="showCoordinates" type="checkbox"> Mostrar coordenadas</label><label><input data-grid="showToPlayers" type="checkbox"> Mostrar grade aos jogadores</label><label class="ms-grid-share"><input data-grid-share-preview type="checkbox"> Compartilhar este preview ao vivo</label></div>
          <div class="ms-grid-fields-2"><label class="ms-grid-field">Cor<input data-grid="lineColor" type="color"></label><label class="ms-grid-field">Opacidade<div class="ms-grid-live-control compact"><input data-grid="opacity" type="range" min="0.05" max="1" step="0.05"><output data-grid-readout="opacity"></output></div></label></div>
          <label class="ms-grid-field">Espessura<div class="ms-grid-live-control compact"><input data-grid="lineWidth" type="range" min="0.25" max="8" step="0.25"><output data-grid-readout="lineWidth"></output></div></label>
        </section>
        <section class="ms-grid-palette-section" data-grid-tab-panel="scale" hidden>
          <div class="ms-grid-fields-2"><label class="ms-grid-field">Distância / célula<input data-grid="unitsPerCell" type="number" min="0.01" step="0.01"></label><label class="ms-grid-field">Unidade<input data-grid="unitName" type="text" maxlength="16" placeholder="m"></label></div>
          <div class="ms-grid-scale-card"><span>RÉGUA DA CENA</span><strong data-grid-scale-preview>1,5 m / célula</strong><p>A régua e as medições táticas usam automaticamente esta escala.</p></div>
        </section>
        <section class="ms-grid-palette-section" data-grid-tab-panel="token" hidden>
          <p class="ms-grid-help">Selecione um totem no mapa. O tamanho abaixo fica apenas em preview até <b>Aplicar à Cena</b>.</p>
          <div class="ms-grid-token-presets"><button type="button" data-token-size="0.5">½</button><button type="button" data-token-size="1">1×1</button><button type="button" data-token-size="2">2×2</button><button type="button" data-token-size="3">3×3</button><button type="button" data-token-size="4">4×4</button></div>
          <div class="ms-grid-fields-2"><label class="ms-grid-field">Largura em células<input id="ms-token-width-cells" type="number" min="0.25" max="20" step="0.25" value="1"></label><label class="ms-grid-field">Altura em células<input id="ms-token-height-cells" type="number" min="0.25" max="20" step="0.25" value="1"></label></div>
          <button type="button" class="ms-grid-wide-action" data-grid-action="token-size">ATUALIZAR PREVIEW DO TOTEM</button>
        </section>
      </div>
      <footer class="ms-grid-palette-footer"><span data-grid-draft-state>Sem alterações pendentes.</span><div><button type="button" data-grid-reset>PADRÃO 16×16</button><button type="button" data-grid-discard>DESCARTAR</button><button type="button" class="primary" data-grid-apply>APLICAR À CENA</button></div></footer>`;
    paletteHost().appendChild(panel);state.panel=panel;installPaletteDrag(panel);
    panel.querySelector('[data-grid-close]').onclick=()=>closePanel(false);
    panel.querySelector('[data-grid-minimize]').onclick=()=>setPaletteMinimized(!state.paletteMinimized);
    panel.querySelector('[data-grid-discard]').onclick=()=>discardDraft();
    panel.querySelector('[data-grid-apply]').onclick=()=>applyPanel();
    panel.querySelector('[data-grid-reset]').onclick=()=>{setPreview(DEFAULT_CONFIG,{fit:true,rescale:true});syncPanel()};
    panel.querySelectorAll('[data-grid-tab]').forEach(b=>b.onclick=()=>setPaletteTab(b.dataset.gridTab));
    panel.querySelectorAll('[data-grid-preset]').forEach(b=>b.onclick=()=>{preset(b.dataset.gridPreset);syncPanel()});
    panel.querySelectorAll('[data-grid]').forEach(el=>el.addEventListener('input',()=>{readPanel(el.dataset.grid);syncRangeFromField(el.dataset.grid)}));
    panel.querySelectorAll('[data-grid-range]').forEach(el=>el.addEventListener('input',()=>{const field=panel.querySelector(`[data-grid="${el.dataset.gridRange}"]`);if(field)field.value=el.value;readPanel(el.dataset.gridRange)}));
    panel.querySelector('[data-grid-share-preview]').addEventListener('change',e=>{state.sharePreview=!!e.target.checked;if(state.sharePreview)scheduleSharedPreview(true);else clearSharedPreview()});
    panel.querySelectorAll('[data-token-size]').forEach(b=>b.onclick=()=>{panel.querySelector('#ms-token-width-cells').value=b.dataset.tokenSize;panel.querySelector('#ms-token-height-cells').value=b.dataset.tokenSize;previewSelectedTokenSize()});
    panel.querySelector('#ms-token-width-cells').addEventListener('input',previewSelectedTokenSize);panel.querySelector('#ms-token-height-cells').addEventListener('input',previewSelectedTokenSize);
    panel.querySelector('[data-grid-action="fit-cells"]').onclick=()=>{fitCellsToBoard();syncPanel()};panel.querySelector('[data-grid-action="fit-board"]').onclick=()=>{fitBoardToGrid();syncPanel()};panel.querySelector('[data-grid-action="fit-background"]').onclick=()=>{if(fitBoardToBackground())syncPanel()};panel.querySelector('[data-grid-action="calibrate"]').onclick=()=>toggleCalibration();panel.querySelector('[data-grid-action="token-size"]').onclick=()=>{if(!previewSelectedTokenSize())window.MS_PLATFORM?.toast?.('Selecione um totem antes de definir o tamanho.','error')};
    setPaletteTab(state.paletteTab);return panel;
  }

  function readPanel(changedKey=''){
    const panel=state.panel;if(!panel||!state.previewConfig)return;const cfg=clone(state.previewConfig);
    panel.querySelectorAll('[data-grid]').forEach(el=>{const k=el.dataset.grid;if(el.type==='checkbox')cfg[k]=el.checked;else if(['unitName','type','lineColor'].includes(k))cfg[k]=el.value;else if(el.value!=='')cfg[k]=Number(el.value)});
    const fit=['boardWidth','boardHeight'].includes(changedKey);const rescale=fit||['cellWidth','cellHeight'].includes(changedKey);setPreview(cfg,{fit,rescale});
  }
  function syncRangeFromField(key){const panel=state.panel;if(!panel)return;const field=panel.querySelector(`[data-grid="${key}"]`),range=panel.querySelector(`[data-grid-range="${key}"]`);if(field&&range){const v=Number(field.value);range.value=String(Math.max(Number(range.min)||v,Math.min(Number(range.max)||v,v)))}}
  function syncPanel(){
    const panel=state.panel;if(!panel)return;const cfg=state.previewConfig||active();
    panel.querySelectorAll('[data-grid]').forEach(el=>{const k=el.dataset.grid;if(el.type==='checkbox')el.checked=!!cfg[k];else el.value=cfg[k]});
    panel.querySelectorAll('[data-grid-range]').forEach(el=>{const k=el.dataset.gridRange,v=Number(cfg[k]);el.value=String(Math.max(Number(el.min)||v,Math.min(Number(el.max)||v,v)))});
    const rot=panel.querySelector('[data-grid-readout="rotation"]');if(rot)rot.textContent=`${fmt(cfg.rotation)}°`;const op=panel.querySelector('[data-grid-readout="opacity"]');if(op)op.textContent=`${Math.round(cfg.opacity*100)}%`;const lw=panel.querySelector('[data-grid-readout="lineWidth"]');if(lw)lw.textContent=`${fmt(cfg.lineWidth)} px`;
    const share=panel.querySelector('[data-grid-share-preview]');if(share)share.checked=state.sharePreview;
    const typeLabel={square:'Ortogonal','hex-flat':'Hex horizontal','hex-pointy':'Hex vertical',iso:'Isométrico',none:'Livre'}[cfg.type]||cfg.type;
    const summary=panel.querySelector('[data-grid-summary]');if(summary)summary.innerHTML=`<span><strong>${cfg.columns}×${cfg.rows}</strong> células</span><span><strong>${fmt(cfg.cellWidth)}×${fmt(cfg.cellHeight)}</strong> px</span><span>${typeLabel}</span><span>${cfg.snap?'Snap':'Livre'}</span>`;
    const head=panel.querySelector('[data-grid-head-summary]');if(head)head.textContent=`${cfg.columns}×${cfg.rows} · ${typeLabel} · ${fmt(cfg.unitsPerCell)} ${cfg.unitName||'u'}`;
    const scalePreview=panel.querySelector('[data-grid-scale-preview]');if(scalePreview)scalePreview.textContent=`${fmt(cfg.unitsPerCell)} ${cfg.unitName||'u'} / célula`;
    const btn=panel.querySelector('[data-grid-action="calibrate"]');if(btn)btn.textContent=state.calibrating?'ENCERRAR CALIBRAÇÃO':'CALIBRAR DIRETAMENTE NO MAPA';setPaletteTab(state.paletteTab);updateDraftState();
  }
  function updateDraftState(){
    const panel=state.panel;if(!panel)return;const dirty=!!state.previewConfig&&(!configsEqual(state.previewConfig,official())||anyObjectDraft());
    const label=panel.querySelector('[data-grid-draft-state]');if(label){label.textContent=dirty?'Alterações locais — ainda não aplicadas.':'Cena sincronizada.';label.classList.toggle('is-dirty',dirty)}
    const badge=panel.querySelector('[data-grid-preview-indicator]');if(badge){badge.textContent=dirty?'RASCUNHO':'PREVIEW';badge.classList.toggle('is-dirty',dirty)}
  }

  function openPanel(options={}){
    if(!gm()){window.MS_PLATFORM?.toast?.('A matriz da Cena só pode ser alterada pelo Mestre.','error');return false}
    const panel=makePanel();state.remotePreview=null;
    if(!state.previewConfig){state.previewConfig=clone(official());state.sharePreview=false;snapshotObjects()}
    panel.hidden=false;document.body.classList.add('ms-grid-config-open');state.paletteMinimized=false;panel.classList.remove('is-minimized');const minBtn=panel.querySelector('[data-grid-minimize]');if(minBtn){minBtn.textContent='—';minBtn.setAttribute('aria-label','Recolher editor da matriz')}syncTokenPanelFromSelection();syncPanel();requestRender({fit:true});
    const anchor=options?.anchorEvent||(options&&typeof options==='object'&&(options.clientX!=null||options.left!=null||options.top!=null)?options:null);requestAnimationFrame(()=>placePalette(anchor));return true;
  }
  async function discardDraft(){
    if(!state.previewConfig)return;if(state.sharePreview)await clearSharedPreview();restoreObjectSnapshots();state.calibrating=false;state.dragHandle=null;state.overlay?.classList.remove('is-calibrating');state.previewConfig=clone(official());state.sharePreview=false;snapshotObjects();syncTokenPanelFromSelection();syncPanel();requestRender({fit:true});window.MS_PLATFORM?.toast?.('Rascunho descartado. A Cena voltou à matriz aplicada.','info');
  }
  async function closePanel(commit=false){
    const panel=state.panel;if(!panel)return;if(commit)return applyPanel();if(state.sharePreview)await clearSharedPreview();restoreObjectSnapshots();state.calibrating=false;state.dragHandle=null;state.overlay?.classList.remove('is-calibrating');state.previewConfig=null;state.objectSnapshots=null;state.sharePreview=false;panel.hidden=true;document.body.classList.remove('ms-grid-config-open');requestRender({fit:true});
  }
  async function applyPanel(){
    if(!gm()||!state.previewConfig)return;const next=clone(state.previewConfig),before=clone(official()),wasShared=state.sharePreview;
    if(state.previewBroadcastTimer){clearTimeout(state.previewBroadcastTimer);state.previewBroadcastTimer=null}state.calibrating=false;state.overlay?.classList.remove('is-calibrating');
    try{
      state.config=normalize(next);state.previewConfig=clone(state.config);requestRender({fit:true});await window.MasterTools?.saveSceneGridConfig?.(state.config,{broadcast:true});await commitObjectDrafts();if(wasShared)await clearSharedPreview();state.sharePreview=false;snapshotObjects();syncPanel();window.MS_PLATFORM?.toast?.('Matriz aplicada à Cena e sincronizada com a Mesa.','success');
    }catch(error){state.config=normalize(before);state.previewConfig=normalize(next);state.sharePreview=wasShared;try{await window.MasterTools?.saveSceneGridConfig?.(before,{broadcast:false})}catch(_){ }requestRender({fit:true});syncPanel();window.MS_PLATFORM?.toast?.(error?.message||'Não foi possível salvar a matriz.','error')}
  }

  function toggleCalibration(){state.calibrating=!state.calibrating;ensureOverlay()?.classList.toggle('is-calibrating',state.calibrating);syncPanel();draw();if(state.calibrating)window.MS_PLATFORM?.toast?.('Arraste O para a origem, X para largura/rotação e Y para altura da célula.','info')}
  function pointerPos(e){const r=state.overlay.getBoundingClientRect();let x=e.clientX-r.left,y=e.clientY-r.top;const cam=window.MS_GRID_ARCHITECT?.state?.()?.camera;if(cam){const z=Number(cam.zoom)||1;x=(x-(Number(cam.x)||0))/z;y=(y-(Number(cam.y)||0))/z}return{x,y}}
  function calibrationHandles(){const cfg=active(),cam=window.MS_GRID_ARCHITECT?.state?.()?.camera,xform=p=>{const s=toScreen(p);if(!cam)return s;const z=Number(cam.zoom)||1;return{x:s.x*z+(Number(cam.x)||0),y:s.y*z+(Number(cam.y)||0)}},o=xform({x:cfg.offsetX,y:cfg.offsetY}),x=xform(rotatePoint(cfg.offsetX+cfg.cellWidth,cfg.offsetY,cfg.offsetX,cfg.offsetY,cfg.rotation)),y=xform(rotatePoint(cfg.offsetX,cfg.offsetY+cfg.cellHeight,cfg.offsetX,cfg.offsetY,cfg.rotation));return{origin:o,x,y}}
  function installCalibrationEvents(el){
    el.addEventListener('pointerdown',e=>{if(!state.calibrating||!gm()||!isPreviewing())return;const r=state.overlay.getBoundingClientRect(),p={x:e.clientX-r.left,y:e.clientY-r.top},hs=calibrationHandles();let best=null,d=18;Object.entries(hs).forEach(([k,h])=>{const n=Math.hypot(p.x-h.x,p.y-h.y);if(n<d){d=n;best=k}});if(!best)return;state.dragHandle=best;el.setPointerCapture?.(e.pointerId);e.preventDefault()});
    el.addEventListener('pointermove',e=>{if(!state.dragHandle||!state.calibrating||!state.previewConfig)return;const cfg=clone(state.previewConfig),p=toLogical(pointerPos(e));if(state.dragHandle==='origin'){cfg.offsetX=p.x;cfg.offsetY=p.y}else if(state.dragHandle==='x'){const dx=p.x-cfg.offsetX,dy=p.y-cfg.offsetY;cfg.cellWidth=Math.max(4,Math.hypot(dx,dy));cfg.rotation=Math.atan2(dy,dx)*180/Math.PI}else{const a=deg(cfg.rotation),dx=p.x-cfg.offsetX,dy=p.y-cfg.offsetY;cfg.cellHeight=Math.max(4,Math.abs(-dx*Math.sin(a)+dy*Math.cos(a)))}setPreview(cfg,{fit:false,rescale:state.dragHandle==='x'||state.dragHandle==='y'});syncPanel();e.preventDefault()});
    const end=e=>{if(!state.dragHandle)return;state.dragHandle=null;try{el.releasePointerCapture?.(e.pointerId)}catch(_){}};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  }

  function scheduleSharedPreview(immediate=false){
    if(!state.sharePreview||!state.previewConfig||!gm())return;
    if(state.previewBroadcastTimer)clearTimeout(state.previewBroadcastTimer);
    const send=()=>{state.previewBroadcastTimer=null;window.MS_TABLE_SESSION?.broadcastTransient?.('grid_preview',{active:true,gridConfig:clone(state.previewConfig)}).catch?.(()=>{})};
    if(immediate)send();else state.previewBroadcastTimer=setTimeout(send,80);
  }
  async function clearSharedPreview(){
    if(state.previewBroadcastTimer){clearTimeout(state.previewBroadcastTimer);state.previewBroadcastTimer=null}
    try{await window.MS_TABLE_SESSION?.broadcastTransient?.('grid_preview',{active:false,gridConfig:null})}catch(_){}
  }

  function toggleVisibility(){if(!gm())return official().showGrid;const cfg=clone(official());cfg.showGrid=!cfg.showGrid;setOfficial(cfg,{persist:true});return cfg.showGrid}
  function toggleSnap(){if(!gm())return official().snap;const cfg=clone(official());cfg.snap=!cfg.snap;setOfficial(cfg,{persist:true});window.MS_PLATFORM?.toast?.(cfg.snap?'Encaixe na matriz ativado.':'Encaixe na matriz desativado.','info');return cfg.snap}
  function boot(){state.config=persisted();state.previewConfig=null;state.remotePreview=null;ensureOverlay();fitHost();draw();if(!state.uiBound){state.uiBound=true;window.addEventListener?.('resize',()=>{if(panelOpen()){const p=state.panel;placePalette({left:parseFloat(p.style.left)||6,top:parseFloat(p.style.top)||72})}requestRender({fit:true})});window.MS_PLATFORM?.on?.('vtt:left',()=>{if(panelOpen())closePanel(false)})}return clone(official())}

  window.MS_GRID_ENGINE=Object.freeze({
    version:VERSION,DEFAULT_CONFIG:clone(DEFAULT_CONFIG),normalize,
    active:()=>clone(active()),official:()=>clone(official()),isPreviewing,
    metrics,boot,draw,fitHost,setConfig,applyRemote,applySharedPreview,persisted,
    snapPoint,snapObject,cellAt,measure,applyTokenSize,rescaleManagedTokens,
    openPanel,openAt:(clientX,clientY)=>openPanel({clientX,clientY}),closePanel,toggleVisibility,toggleSnap,fitCellsToBoard,fitBoardToGrid,fitBoardToBackground
  });
})();
