import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function setup(){
 const nodes=new Map(),created=[],context=new Proxy({},{get:()=>()=>{}});
 function el(tag='div'){return {tag,style:{},dataset:{},children:[],width:600,height:400,value:'1',offsetWidth:600,offsetHeight:400,parentElement:{getBoundingClientRect:()=>({width:600,height:400})},getBoundingClientRect:()=>({width:600,height:400}),getContext:()=>context,toDataURL(){return 'data:image/jpeg;base64,result';},addEventListener(){},querySelectorAll:()=>[],setAttribute(){},focus(){},appendChild(e){this.children.push(e);},replaceChildren(){this.children=[];}};}
 for(const id of ['crop-modal','crop-canvas','crop-title','crop-zoom','crop-free-ratio','gallery-container','avatar-preview-container'])nodes.set(id,el());
 const loaded=[];class Image{naturalWidth=1200;naturalHeight=800;set src(v){loaded.push(v);this.onload();}}
 const c={console,Image,currentGallery:['legacy-image'],currentImageEdits:{avatar:null,gallery:[]},currentAvatarBase64:'',isEditMode:true,requestAnimationFrame:fn=>fn(),alert:msg=>{throw Error(msg)},document:{activeElement:el(),getElementById:id=>nodes.get(id),createElement:tag=>{const e=el(tag);created.push(e);return e;},addEventListener(){}},addEventListener(){},MS_ONLINE_UI:{saveBuilderDraft(){}},viewFullscreen(){}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('js/gallery-editor.js','utf8'),c);return {c,nodes,created,loaded};
}
test('galeria preserva original ao aplicar, reabrir e cancelar; exportação 16:9',()=>{
 const {c,created,loaded}=setup();c.openCropModal('legacy-image','gallery-edit',0);c.setAspectRatio(16/9);assert.equal(c.confirmCrop(),true);
 const out=created.find(x=>x.tag==='canvas');assert.equal(out.width,1600);assert.equal(out.height,900);assert.equal(c.currentImageEdits.gallery[0].source,'legacy-image');
 c.openCropModal(c.currentGallery[0],'gallery-edit',0);assert.equal(loaded.at(-1),'legacy-image');c.rotateCrop(90);c.cancelCrop();assert.equal(c.currentImageEdits.gallery[0].rotation,0);assert.equal(c.currentGallery.length,1);
});
test('retratos e remoção preservam correspondência dos metadados',()=>{const {c}=setup();c.openCropModal('portrait','avatar');c.confirmCrop();assert.equal(c.currentImageEdits.avatar.source,'portrait');c.currentImageEdits.gallery=[{source:'original'}];c.removeGalleryImage(0);assert.equal(c.currentImageEdits.gallery.length,0);assert.equal(c.currentGallery.length,0);});
