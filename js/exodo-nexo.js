/* MUNDOS SOMBRIOS — ÊXODO / NEXO PADRÃO (EXCLUSIVO)
   Fonte mecânica: Livro Base de Êxodo: Assimilação.
   Esta camada só ativa para "Nexo Padrão (Livro Base)".
*/
(function(){
  'use strict';
  const NEXO = 'Nexo Padrão (Livro Base)';
  let genericHTML = null;
  let genericLabel = null;

  const P = [
    {id:'fisica',name:'Potência Física',short:'FORÇA · IMPACTO · TRAÇÃO',desc:'Define a capacidade de interagir com a massa física do mundo.',rows:[
      ['1','Até 100 kg','Condição Leve','Um homem adulto / Saco de cimento','1'],['2','Até 250 kg','Condição Leve-Mod.','Uma moto / Piano de cauda','1'],['3','Até 500 kg','Condição Moderada','Um boi / Motor de caminhão','2'],['4','1 Tonelada','Condição Mod.-Grave','Um carro popular','2'],['5','3 Toneladas','Condição Grave','Uma caminhonete blindada / SUV','3'],['6','10 Toneladas','Condição Grave +','Um caminhão carregado','3'],['7','30 Toneladas','Condição Catastrófica L.','Um ônibus / Vagão de metrô','4'],['8','100 Toneladas','Condição Catastrófica','Um avião de pequeno porte','4'],['9','500 Toneladas','Total Local','Um avião comercial / Prédio pequeno','5'],['10','1.000 Toneladas +','Transcendente','Navio cargueiro / Pontes','6']]},
    {id:'energetica',name:'Potência Energética',short:'EMISSÃO · CONVERSÃO',desc:'Define a intensidade de manifestações como calor, luz ou eletricidade.',rows:[
      ['1','Faísca / Calor corporal intenso','Acender pavio / Aquecer mãos','—','1'],['2','Clarão / Pequeno arco elétrico','Cegar por 1 rodada / Ligar eletrônico','—','1'],['3','Chama contínua / Descarga de bateria','Derreter metal leve (estanho)','—','2'],['4','Rajada de energia focalizada','Romper portas / Fusão de travas','—','2'],['5','Explosão energética / Raio intenso','Derreter aço / Destruir motor','—','3'],['6','Onda de choque térmica/elétrica','Incinerar madeira / Colapsar rede local','—','3'],['7','Tormenta energética focalizada','Vaporizar metal pesado','—','4'],['8','Fluxo de plasma / Radiação intensa','Destruir quarteirão (estruturalmente)','—','4'],['9','Colapso energético regional','Estilo ogiva térmica','—','5'],['10','Saturação energética planetária','Fenômeno cósmico','—','6']]},
    {id:'destrutiva',name:'Potência Destrutiva',short:'ANIQUILAÇÃO DE MATÉRIA',desc:'Diferente da força, foca em romper as ligações moleculares de objetos.',rows:[
      ['1','Tecidos orgânicos, vidro, gesso','Leve (Cortes/Fissuras)','—','1'],['2','Madeira densa, plástico industrial','Leve-Moderada','—','1'],['3','Concreto fino, tijolos, alumínio','Moderada (Fratura)','—','2'],['4','Aço comum, blindagem leve, concreto armado','Mod.-Grave','—','2'],['5','Titânio, blindagem de tanque, rochas','Grave (Mutilação)','—','3'],['6','Ligas exóticas / Metais de Eras passadas','Grave + (Carbonização)','—','3'],['7','Estruturas de edifícios (pilares mestres)','Catastrófica Leve','—','4'],['8','Bunkers fortificados / Instalações subterrâneas','Catastrófica','—','4'],['9','Desintegração molecular local','Total Local','—','5'],['10','Aniquilação massiva de matéria','Transcendente','—','6']]},
    {id:'dominio',name:'Potência de Domínio',short:'VOLUME · MASSA · CONTROLE',desc:'Define a quantidade de um elemento ou fenômeno que o Nexo pode reger.',rows:[
      ['1','Até 1 Litro / 1 Pequeno objeto','Uma chama de vela / Um copo d\'água','—','1'],['2','Até 10 Litros / 5 kg','Um balde / Uma rajada de vento curta','—','1'],['3','Até 50 Litros / 25 kg','Um bloco de gelo médio / Uma fogueira','—','2'],['4','Até 100 Litros / 100 kg','Uma onda pequena / Explosão de fogo','—','2'],['5','Até 500 Litros / 500 kg','Uma coluna d\'água / Incêndio em sala','—','3'],['6','Até 1.000 Litros / 2 Toneladas','Pequeno lago / Tempestade de areia','—','3'],['7','Escala de Tempestade Local','Inundar uma rua','—','4'],['8','Escala Urbana / Regional','Alterar o clima de um bairro','—','4'],['9','Escala Geográfica','Reconfigurar ecossistemas locais','—','5'],['10','Controle Absoluto de Fenômeno','Mudar a maré / Clima planetário','—','6']]},
    {id:'alcance',name:'Potência de Alcance',short:'DISTÂNCIA DE ATUAÇÃO',desc:'Define até onde o biocampo do gene consegue se estender sem perder coesão.',rows:[
      ['1','Toque / Até 15 metros','Alvo único','—','1'],['2','30 metros','5 metros de raio','—','1'],['3','45 metros','10 metros de raio','—','1'],['4','60 metros','20 metros de raio','—','2'],['5','75 metros','30 metros de raio','—','2'],['6','150 metros','60 metros de raio','—','3'],['7','300 metros','120 metros de raio','—','3'],['8','600 metros','240 metros de raio','—','4'],['9','1,5 km','480 metros de raio','—','5'],['10','3 km ou mais','1 km ou mais','—','6']]},
    {id:'projecao',name:'Potência de Projeção',short:'MANUTENÇÃO · DURAÇÃO',desc:'Define por quanto tempo o gene sustenta o esforço antes de exigir um novo teste de controle ou entrar em colapso.',rows:[
      ['1','1 Rodada (aprox. 6 segundos)','Golpe rápido / Clarão único','—','1'],['2','2 Rodadas','Escudo temporário','—','1'],['3','3 Rodadas','Campo de força em combate','—','2'],['4','5 Rodadas','Voo em curta distância','—','2'],['5','10 Rodadas (aprox. 1 minuto)','Manter aura ativa','—','3'],['6','1 a 5 minutos','Sustentar forma complexa','—','3'],['7','10 minutos','Poder em escala de cena inteira','—','4'],['8','30 minutos','Mutação ativa prolongada','—','4'],['9','1 hora','Poder autônomo (entidade/campo)','—','5'],['10','1 dia ou Permanente','Mutação fixa no hospedeiro','—','6']]},
    {id:'restauracao',name:'Potência de Restauração',short:'CURA · REGENERAÇÃO',desc:'Define a capacidade de recompor tecidos biológicos e funções orgânicas.',rows:[
      ['1','Fecha cortes superficiais e hematomas','Leve e 2d4 de PV','—','1'],['2','Estanca sangramentos e trata febre','Leve-Mod. 2d6 de PV','—','1'],['3','Solda fraturas simples e cauteriza feridas','Moderada 2d8 de PV','—','2'],['4','Repara órgãos internos e músculos rasgados','Grave Leve 2d10 de PV','—','2'],['5','Regenera membros inteiros (dedos, mãos)','Grave. 2d12 de PV','—','3'],['6','Cura múltiplos ferimentos simultâneos','Grave Múltipla. 3d10 de PV','—','3'],['7','Reconstrói sistema nervoso / Anula toxinas','Catastrófica L. 3d12 de PV','—','4'],['8','Regenera corpo de danos massivos','Catastrófica. 5d10 de PV','—','4'],['9','Reanima mortos recentes (morte clínica)','Total 5d12','—','5'],['10','Ressurreição e restauração total do DNA','Total. Em 1d4 de dias','—','6']]},
    {id:'protetiva',name:'Potência Protetiva',short:'DEFESA · RESISTÊNCIA',desc:'Define o quanto o personagem pode ignorar ou mitigar de dano externo.',rows:[
      ['1','Pele densa / Armadura natural leve','Soco comum / Impacto de queda leve','—','1'],['2','Bloqueia projéteis de baixo calibre','Pistolas / Facas','—','1'],['3','Absorve impactos de alta energia','Fuzis / Explosões leves','—','2'],['4','Reflete energia cinética básica','Colisão de veículo','—','2'],['5','Campo de força pessoal estável','Granada / Fogo intenso','—','3'],['6','Escudo de área (3 metros)','Bombardeio tático','—','3'],['7','Imunidade a armamento antitanque','Mísseis / Explosões de larga escala','—','4'],['8','Reflete dano energético massivo','Canhão de plasma','—','4'],['9','Campo absoluto (Inércia parcial)','Quase indestrutível','—','5'],['10','Invulnerabilidade Total Temporária','Impacto apocalíptico','—','6']]},
    {id:'cinetica',name:'Potência Cinética',short:'VELOCIDADE · REAÇÃO',desc:'Define a rapidez de movimento e o tempo de resposta sináptica.',rows:[
      ['1','15 m/s (54 km/h)','Reflexos de atleta de elite','—','1'],['2','30 m/s (108 km/h)','Desviar de flechas / facas','—','1'],['3','60 m/s (216 km/h)','Movimento imperceptível','—','2'],['4','100 m/s (360 km/h)','Desviar de tiros de pistola','—','2'],['5','200 m/s (720 km/h)','Reflexos de alta frequência','—','3'],['6','400 m/s (Supersônico)','Atravessa a barreira do som','—','3'],['7','800 m/s (Mach 2.3)','Reage a explosões à queima-roupa','—','4'],['8','1.600 m/s (Mach 4.7)','Cruzar cidades em segundos','—','4'],['9','3.000 m/s (Mach 8.8)','Reação em nanossegundos','—','5'],['10','Quase Instantâneo','Movimento entre quadros da realidade','—','6']]},
    {id:'alteracao',name:'Potência de Alteração',short:'TRANSMUTAÇÃO · FORMA',desc:'Define a capacidade de reordenar a matéria ou a biologia.',rows:[
      ['1','Textura, cor e densidade leve','Camuflagem / Mudança de pele','—','1'],['2','Alteração de estado físico (Sólido/Líquido)','Amolecer metal / Transformar água','—','1'],['3','Criação de estruturas orgânicas simples','Lâminas ósseas / Garras','—','2'],['4','Transmutação de matéria sólida inorgânica','Transformar ferro em vidro','—','2'],['5','Moldagem biológica complexa','Mudar feições / Criar órgãos extras','—','3'],['6','Transmutação de energia em matéria','Luz sólida','—','3'],['7','Criação de matéria viva básica','Formas de vida unicelulares / Plantas','—','4'],['8','Reconfiguração de organismos complexos','Transformar humano em animal','—','4'],['9','Alteração de leis físicas locais','Mudar ponto de ebulição / Gravidade','—','5'],['10','Criação total de vida e realidade','Criar seres do nada','—','6']]},
    {id:'saturacao',name:'Potência de Saturação',short:'ABSORÇÃO · NEUTRALIZAÇÃO',desc:'Define a capacidade do gene de absorver energia para dissipar ou usar depois.',rows:[
      ['1','Faíscas e impactos físicos leves','Ignorar soco de humano comum','—','1'],['2','Energia leve (Calor de chama de vela)','Caminhar em cinzas quentes','—','1'],['3','Descargas elétricas e chamas médias','Absorver eletricidade de tomadas','—','2'],['4','Impactos balísticos e explosões curtas','Dissipar energia de granada','—','2'],['5','Rajadas de energia equivalentes','Absorver tiro de rifle de precisão','—','3'],['6','Dissipar ataques de área múltiplos','Neutralizar chuva de disparos','—','3'],['7','Energia contínua (Incêndios/Raios)','Estar no centro de uma tormenta','—','4'],['8','Neutralizar campos energéticos inteiros','Apagar luzes e calor de um prédio','—','4'],['9','Drenar energia vital e genética','Secar um alvo organicamente','—','5'],['10','Buraco Negro Biológico','Devorar toda energia ao redor','—','6']]},
    {id:'sistemica',name:'Potência Sistêmica',short:'MULTIPLICIDADE DE ALVOS',desc:'Define quantos seres ou pontos o gene pode processar ao mesmo tempo.',rows:[
      ['1','1 Alvo único','Individual','—','1'],['2','Até 2 alvos','Dupla','—','1'],['3','3 a 5 alvos','Pequeno Grupo','—','2'],['4','Até 10 alvos','Esquadrão','—','2'],['5','Até 20 alvos','Grupo Médio','—','3'],['6','Até 50 alvos','Unidade Tática','—','3'],['7','Até 100 alvos','Tropa / Companhia','—','4'],['8','Até 500 alvos','Público em praça','—','4'],['9','Até 1.000 alvos','Bairro / População Local','—','5'],['10','10.000 ou mais','Escala de Exército / Cidade','—','6']]} 
  ];

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isNexo=()=>String(window.currentNature||document.getElementById('char-nature')?.value||'')===NEXO;

  function injectStyle(){
    if(document.getElementById('exodo-nexo-style'))return;
    const s=document.createElement('style');s.id='exodo-nexo-style';s.textContent=`
      .nexo-genome{padding:14px;border:1px solid rgba(70,230,210,.18);border-radius:16px;background:radial-gradient(circle at 50% 0%,rgba(33,130,120,.13),transparent 35%),linear-gradient(180deg,rgba(5,22,24,.97),rgba(5,10,14,.98));box-shadow:inset 0 0 40px rgba(0,255,210,.035)}
      .nexo-kicker{font:700 .63rem Cinzel,serif;letter-spacing:.22em;color:#59e5cf;text-transform:uppercase;text-align:center}.nexo-title{margin:4px 0;text-align:center;color:#eafff9;font:700 1.25rem Cinzel,serif}.nexo-sub{text-align:center;color:#8ba7a4;font-size:.72rem;line-height:1.45;margin:0 auto 14px;max-width:760px}
      .nexo-status{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:12px}.nexo-chip{padding:8px;border:1px solid rgba(70,230,210,.11);border-radius:10px;background:rgba(255,255,255,.02);text-align:center}.nexo-chip b{display:block;color:#d8fff7;font-size:.72rem}.nexo-chip span{display:block;color:#718a87;font-size:.6rem;margin-top:2px}
      .nexo-dna-stage{position:relative;margin:10px auto 16px;max-width:900px;padding:8px 0}.nexo-dna-stage:before,.nexo-dna-stage:after{content:"";position:absolute;top:4px;bottom:4px;width:2px;background:linear-gradient(180deg,transparent,#2fe6d0 7%,#6ef2df 50%,#2fe6d0 93%,transparent);filter:drop-shadow(0 0 7px rgba(47,230,208,.35));animation:nexoPulse 4s ease-in-out infinite}.nexo-dna-stage:before{left:24%}.nexo-dna-stage:after{right:24%;animation-delay:2s}.nexo-dna{position:relative;display:grid;gap:7px}.nexo-gene-row{display:grid;grid-template-columns:1fr 88px 1fr;gap:8px;align-items:center;min-height:58px}.nexo-side{min-height:44px;display:flex;align-items:center}.nexo-side.left{justify-content:flex-end}.nexo-side.right{justify-content:flex-start}.nexo-bridge{height:2px;background:linear-gradient(90deg,rgba(77,242,220,.15),#57ead6,rgba(77,242,220,.15));box-shadow:0 0 9px rgba(63,232,209,.18);position:relative}.nexo-bridge:before,.nexo-bridge:after{content:"";width:12px;height:12px;border-radius:50%;position:absolute;top:50%;transform:translateY(-50%);background:#091517;border:2px solid #57ead6;box-shadow:0 0 9px rgba(87,234,214,.45)}.nexo-bridge:before{left:0}.nexo-bridge:after{right:0}.nexo-strand-card{width:100%;padding:8px 10px;border:1px solid rgba(68,230,211,.12);border-radius:11px;background:rgba(4,20,21,.86);cursor:pointer;transition:.2s transform,.2s border-color,.2s box-shadow}.nexo-strand-card:hover,.nexo-strand-card.active{transform:translateY(-1px);border-color:rgba(88,238,219,.44);box-shadow:0 0 18px rgba(73,231,211,.08)}.nexo-strand-card b{display:block;color:#dffff9;font-size:.72rem}.nexo-strand-card small{display:block;color:#6e8f8b;font-size:.57rem;margin-top:2px}
      .nexo-levels{display:grid;grid-template-columns:repeat(10,minmax(40px,1fr));gap:5px;margin-top:8px}.nexo-level{border:1px solid rgba(70,230,210,.1);border-radius:8px;padding:5px 3px;background:rgba(0,0,0,.17);color:#77918e;font-size:.55rem;text-align:center;cursor:pointer}.nexo-level:hover,.nexo-level.active{color:#dffff9;border-color:#55ead5;background:rgba(50,170,152,.1)}
      .nexo-detail{margin-top:12px;padding:12px;border:1px solid rgba(70,230,210,.17);border-radius:11px;background:rgba(0,0,0,.22);min-height:150px}.nexo-detail h4{margin:0 0 5px;color:#dffff9;font:700 .88rem Cinzel,serif}.nexo-detail p{margin:5px 0;color:#9cb4b0;font-size:.68rem;line-height:1.45}.nexo-table-wrap{overflow:auto;margin-top:10px}.nexo-table{width:100%;border-collapse:collapse;font-size:.62rem}.nexo-table th,.nexo-table td{padding:6px;border-bottom:1px solid rgba(255,255,255,.055);text-align:left;vertical-align:top}.nexo-table th{color:#6fefe0;text-transform:uppercase;font-size:.55rem;position:sticky;top:0;background:#071517}.nexo-table td{color:#a6bab7}.nexo-table tr.active{background:rgba(60,220,200,.055)}
      .nexo-power-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px;padding:10px;border:1px solid rgba(70,230,210,.12);border-radius:11px;background:rgba(0,0,0,.16)}.nexo-power-form .form-group{margin:0}.nexo-power-form label{display:block;color:#7beede;font-size:.58rem;margin-bottom:4px}.nexo-power-form input,.nexo-power-form textarea{width:100%;box-sizing:border-box}.nexo-power-form .form-group:nth-child(3),.nexo-power-form .form-group:nth-child(4){grid-column:1/-1}.nexo-draft-list{margin:4px 0 0;padding-left:18px;color:#a6bab7;font-size:.65rem;min-height:24px}.nexo-note{margin-top:10px;padding:9px;border-left:2px solid #49e3d0;background:rgba(65,224,207,.035);color:#829d98;font-size:.64rem;line-height:1.45}.nexo-gene-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.nexo-gene-actions button{flex:1 1 160px}
      .nexo-hidden-generic{display:none!important}@keyframes nexoPulse{0%,100%{opacity:.42}50%{opacity:.85}}@media(max-width:800px){.nexo-power-form{grid-template-columns:1fr}.nexo-power-form .form-group:nth-child(3),.nexo-power-form .form-group:nth-child(4){grid-column:auto}.nexo-status{grid-template-columns:repeat(2,1fr)}.nexo-gene-row{grid-template-columns:1fr 54px 1fr}.nexo-levels{grid-template-columns:repeat(5,minmax(42px,1fr))}.nexo-dna-stage:before{left:21%}.nexo-dna-stage:after{right:21%}}@media(prefers-reduced-motion:reduce){.nexo-dna-stage:before,.nexo-dna-stage:after{animation:none}}
    `;document.head.appendChild(s);
  }

  function saveGeneric(){
    const panel=document.getElementById('power-selection-panel');
    if(panel && !panel.querySelector('.nexo-genome') && genericHTML===null){genericHTML=panel.innerHTML;genericLabel=panel.querySelector('label')?.textContent||'';}
  }
  function restoreGeneric(){
    const panel=document.getElementById('power-selection-panel');if(!panel||genericHTML===null)return;
    panel.classList.remove('nexo-hidden-generic');panel.innerHTML=genericHTML;
    const list=document.getElementById('powers-list');if(list)list.classList.remove('nexo-genome-list');
  }

  function renderDraftList(){
    const ul=document.getElementById('pb-draft-list');
    if(!ul)return;
    ul.innerHTML='';
    const draft=Array.isArray(window.currentPowerDraft)?window.currentPowerDraft:[];
    draft.forEach((item,idx)=>{
      const li=document.createElement('li');
      li.textContent=`${item.potency} [Cap: ${item.cap}] `;
      const remove=document.createElement('button');
      remove.type='button';
      remove.textContent='(x)';
      remove.style.cssText='background:none;border:none;color:red;cursor:pointer;';
      remove.addEventListener('click',()=>{
        const live=Array.isArray(window.currentPowerDraft)?window.currentPowerDraft:[];
        live.splice(idx,1);
        window.currentPowerDraft=live;
        renderDraftList();
      });
      li.appendChild(remove);
      ul.appendChild(li);
    });
  }
  function registerCurrent(){
    const p=document.getElementById('nexo-power-select')?.value;
    const cap=Number(document.getElementById('nexo-cap-select')?.value||1);
    if(!p)return;
    if(!Array.isArray(window.currentPowerDraft))window.currentPowerDraft=[];
    if(window.currentPowerDraft.length>=3){
      alert('Um poder pode combinar no máximo 3 Potências.');
      return;
    }
    window.currentPowerDraft.push({potency:p,cap:String(cap)});
    renderDraftList();
  }
  function commitCurrent(){
    if(typeof window.commitPower==='function')window.commitPower();
  }

  function render(){
    if(!isNexo())return false;
    injectStyle();saveGeneric();
    const panel=document.getElementById('power-selection-panel');const list=document.getElementById('powers-list');if(!panel||!list)return false;
    const prevName=document.getElementById('pb-name')?.value||'';
    const prevMod=document.getElementById('pb-mod')?.value||'';
    const prevDesc=document.getElementById('pb-desc')?.value||'';
    panel.classList.remove('hide-on-view');panel.classList.add('nexo-hidden-generic');
    panel.innerHTML='';
    panel.classList.remove('nexo-hidden-generic');
    panel.innerHTML=`<div class="nexo-genome"><div class="nexo-kicker">ÊXODO · NEXO PADRÃO · MOTOR GÊNICO</div><h3 class="nexo-title">Laboratório do Genoma</h3><p class="nexo-sub">Você não seleciona uma magia: você reorganiza funções do Gene Êxodo. As 12 Potências Gênicas são os módulos funcionais do gene. Um poder pode combinar até 3 potências; a Capacidade 1–10 define o teto biológico da manifestação e o Estresse é o preço indicado pela tabela oficial.</p><div class="nexo-status"><div class="nexo-chip"><b>12</b><span>Potências Gênicas</span></div><div class="nexo-chip"><b>1–10</b><span>Capacidade</span></div><div class="nexo-chip"><b>Até 3</b><span>Potências por poder</span></div><div class="nexo-chip"><b>Estresse</b><span>Custo biológico</span></div></div><div class="nexo-dna-stage"><div class="nexo-dna" id="nexo-dna"></div></div><div id="nexo-detail" class="nexo-detail"></div><div class="nexo-power-form"><div class="form-group"><label>Nome do Poder Gênico</label><input id="pb-name" type="text" placeholder="Ex.: Reforço Muscular Adaptativo"></div><div class="form-group"><label>Modificador / Observação</label><input id="pb-mod" type="text" placeholder="Opcional"></div><div class="form-group"><label>Descrição do Poder</label><textarea id="pb-desc" rows="3" placeholder="Descreva a manifestação criada pelo genoma..."></textarea></div><div class="form-group"><label>Potências já anexadas</label><ul id="pb-draft-list" class="nexo-draft-list"></ul></div></div><div class="nexo-gene-actions"><button type="button" class="souls-btn small-btn" id="nexo-attach">ANEXAR POTÊNCIA AO PODER</button><button type="button" class="souls-btn small-btn" id="nexo-finalize">FINALIZAR PODER E ANEXAR À FICHA</button></div><div class="nexo-note"><b>Código Biológico:</b> se uma ação estiver dentro do nível de Capacidade disponível, a regra do livro permite a manifestação pagando o Estresse correspondente; acima do nível, o gene simplesmente não alcança aquela escala. Use a descrição visual como referência, sem alterar a mecânica do livro-base.</div></div>`;
    if(prevName) document.getElementById('pb-name').value=prevName;
    if(prevMod) document.getElementById('pb-mod').value=prevMod;
    if(prevDesc) document.getElementById('pb-desc').value=prevDesc;
    renderDraftList();
    list.classList.add('nexo-genome-list');
    const dna=document.getElementById('nexo-dna');
    P.forEach((p,i)=>{
      const row=document.createElement('div');row.className='nexo-gene-row';
      const card=`<button type="button" class="nexo-strand-card ${i===0?'active':''}" data-nexo-p="${esc(p.id)}"><b>${esc(p.name)}</b><small>${esc(p.short)}</small></button>`;
      row.innerHTML=i%2===0?`<div class="nexo-side left">${card}</div><div class="nexo-bridge"></div><div class="nexo-side right"></div>`:`<div class="nexo-side left"></div><div class="nexo-bridge"></div><div class="nexo-side right">${card}</div>`;
      dna.appendChild(row);
    });
    dna.querySelectorAll('.nexo-strand-card').forEach(btn=>btn.addEventListener('click',()=>selectPotency(btn.dataset.nexoP,1)));
    document.getElementById('nexo-attach').onclick=registerCurrent;
    document.getElementById('nexo-finalize').onclick=commitCurrent;
    selectPotency(P[0].id,1);
    return true;
  }

  function selectPotency(id,cap){
    const p=P.find(x=>x.id===id)||P[0];
    document.querySelectorAll('.nexo-strand-card').forEach(b=>b.classList.toggle('active',b.dataset.nexoP===p.id));
    const d=document.getElementById('nexo-detail');if(!d)return;
    d.innerHTML=`<h4>${esc(p.name)} · ${esc(p.short)}</h4><p>${esc(p.desc)}</p><div class="form-group" style="margin:8px 0"><label style="font-size:.62rem;color:#7beede">Nível de Capacidade</label><select id="nexo-power-select"><option value="${esc(p.name)}">${esc(p.name)}</option></select><select id="nexo-cap-select" style="margin-left:6px;width:120px">${p.rows.map(r=>`<option value="${r[0]}" ${Number(r[0])===cap?'selected':''}>Capacidade ${r[0]}</option>`).join('')}</select></div><div class="nexo-levels">${p.rows.map(r=>`<button type="button" class="nexo-level ${Number(r[0])===cap?'active':''}" data-cap="${r[0]}">CAP ${r[0]}<br><span>Est. ${r[4]}</span></button>`).join('')}</div><div class="nexo-table-wrap"><table class="nexo-table"><thead><tr><th>Cap.</th><th>Limite / Intensidade</th><th>Efeito / Escala</th><th>Exemplo / Referência</th><th>Estresse</th></tr></thead><tbody>${p.rows.map(r=>`<tr class="${Number(r[0])===cap?'active':''}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td><td>${esc(r[4])}</td></tr>`).join('')}</tbody></table></div>`;
    d.querySelectorAll('.nexo-level').forEach(b=>b.onclick=()=>selectPotency(p.id,Number(b.dataset.cap)));
  }

  function installHooks(){
    const oldSelect=window.selectNature;
    if(typeof oldSelect==='function' && !oldSelect.__nexoV47){
      const fn=function(nature){
        const next=String(nature||'')===NEXO;
        if(next) saveGeneric();
        if(!next && isNexo()) restoreGeneric();
        const r=oldSelect.apply(this,arguments);
        if(next && document.getElementById('tab-powers')?.classList.contains('active')) render();
        return r;
      };
      fn.__nexoV47=true; window.selectNature=fn;
    }
    const oldLoad=window.loadCharacterToBuilder;
    if(typeof oldLoad==='function' && !oldLoad.__nexoV47){
      const fn=function(){
        saveGeneric();
        const arr=arguments[1]||window.characters||[]; const ch=arr[arguments[0]];
        if(String(ch?.nature||'')!==NEXO && isNexo()) restoreGeneric();
        const r=oldLoad.apply(this,arguments);
        if(String(ch?.nature||'')===NEXO && document.getElementById('tab-powers')?.classList.contains('active')) render();
        return r;
      };
      fn.__nexoV47=true; window.loadCharacterToBuilder=fn;
    }
    const oldOpen=window.openTab;
    if(typeof oldOpen==='function' && !oldOpen.__nexoV47){
      const fn=function(id){
        const r=oldOpen.apply(this,arguments);
        if(id==='tab-powers' && isNexo()) render();
        return r;
      };
      fn.__nexoV47=true; window.openTab=fn;
    }
  }

  window.MundosNexo={NEXO,P,render,restoreGeneric,isNexo,registerCurrent,commitCurrent,selectPotency};
  const bootNexo=()=>{
    const panel=document.getElementById('power-selection-panel');
    if(panel && genericHTML===null){ genericHTML=panel.innerHTML; genericLabel=panel.querySelector('label')?.textContent||''; }
    installHooks();
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootNexo,{once:true});
  else bootNexo();
  installHooks();
})();
