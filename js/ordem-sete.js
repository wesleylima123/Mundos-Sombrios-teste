/* MUNDOS SOMBRIOS v0.44 — ORDEM DOS SETE (EXCLUSIVO)
   Camada exclusiva da expansão "A Ordem dos Sete (Alta Glória)".
   Não altera as janelas/poderes das demais naturezas.
*/
(function(){
  'use strict';
  const ORDER = 'A Ordem dos Sete (Alta Glória)';
  const $ = s => document.querySelector(s);
  const esc = v => typeof window.escHtml === 'function' ? window.escHtml(String(v ?? '')) : String(v ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const isOrder = () => String(window.currentNature || $('#char-nature')?.value || '') === ORDER;

  const REMEM = [
    {range:'0% a 10%', max:'Cap 1–2', simultaneous:1, cd:'Nenhuma', visual:'Aparência humana comum; sonhos confusos com geometria de luz.'},
    {range:'11% a 20%', max:'Cap 3', simultaneous:1, cd:'-1', visual:'Brilhos discretos nos olhos durante o uso do poder divino.'},
    {range:'21% a 30%', max:'Cap 4', simultaneous:2, cd:'-1', visual:'Aura sutil de temperatura ou vibração; reconhecido por outros membros.'},
    {range:'31% a 40%', max:'Cap 5', simultaneous:2, cd:'-2', visual:'A voz recebe um eco quase inaudível, como se falasse em dois lugares.'},
    {range:'41% a 50%', max:'Cap 6', simultaneous:2, cd:'-2', visual:'Fragmentos de luz espiritual e faíscas invisíveis flutuam ao redor.'},
    {range:'51% a 60%', max:'Cap 7', simultaneous:3, cd:'-3', visual:'Sinais e fractais geométricos aparecem no ar quando o discípulo se move ou respira.'},
    {range:'61% a 70%', max:'Cap 8', simultaneous:3, cd:'-3', visual:'A presença do anjo causa silêncio absoluto e paz anestesiante no ambiente.'},
    {range:'71% a 80%', max:'Cap 9', simultaneous:3, cd:'-4', visual:'O corpo torna-se parcialmente etéreo; ferimentos deixam luz ou cinzas.'},
    {range:'81% a 90%', max:'Cap 10', simultaneous:4, cd:'-5', visual:'A gravidade falha ao redor; luz e passagem do tempo são distorcidas.'},
    {range:'91% a 100%', max:'Apogeu Absoluto', simultaneous:4, cd:'Automático*', visual:'Fractais vivos e energia radiante constante; a matéria não consegue mais conter o discípulo.'}
  ];

  const DISC = [
    {id:'azarael', name:'Azarael', epithet:'O Sagrado da Criação', colors:'Dourado e Âmbar', symbol:'Esfera de luz entrelaçada em fios dourados.', gospel:'O Evangelho da Forma Viva (O Livro dos Começos Silenciosos)', philosophy:'A criação é resistência contra o vazio. Seus discípulos erguem muralhas, construtos geométricos e bastiões de luz para confinar o caos.', icon:'✦'},
    {id:'raphael', name:'Raphaël', epithet:'O Sagrado da Cura', colors:'Prateado e Branco Perolado', symbol:'Mão aberta sobre círculo de luz prateada.', gospel:'O Evangelho da Chaga Redimida (O Livro das Mãos que Cuidam)', philosophy:'A dor e a corrupção são mentiras impostas sobre a essência. Curar é lembrar à alma sua perfeição original e reestruturar a matéria através da compaixão.', icon:'✚'},
    {id:'dhelaykaim', name:'Dhelaykaim', epithet:'O Sagrado da Evolução', colors:'Verde Esmeralda Radiante', symbol:'Espiral de luz verde.', gospel:'O Evangelho do Vórtice Interno (O Canto das Mil Transformações)', philosophy:'A estagnação é a verdadeira morte. A mudança contínua é o motor do aprimoramento biocósmico.', icon:'✥'},
    {id:'thagefhanir', name:'Thagefhanir', epithet:'O Sagrado da Sabedoria', colors:'Azul Profundo e Anil', symbol:'Olho envolto em raios azuis ou mandala de sete pontas.', gospel:'O Evangelho do Olho Invertido (As Visões da Fronteira do Real)', philosophy:'A ignorância é uma ferida explorada pelo abismo. O universo é um código; seus monges leem destino, fraquezas e nomes verdadeiros.', icon:'◉'},
    {id:'auriel', name:'Auriel', epithet:'O Sagrado da Luz — O General', colors:'Branco Incandescente e Ouro Fogo', symbol:'Chama cercada por espirais ou disco solar de oito partes.', gospel:'O Evangelho da Lâmina Incandescente (O Livro dos Sete Raios)', philosophy:'Auriel não perdoa; ilumina. A luz é arma militar e punitiva que incendeia a mentira e cega a corrupção.', icon:'☼'},
    {id:'sarethon', name:'Sarethon', epithet:'O Sagrado do Sacrifício', colors:'Púrpura Queimado, Cinza e Prata', symbol:'Lágrima dourada contendo chama, ladeada por mãos abertas.', gospel:'O Evangelho da Última Lamentação (As Confissões do Silêncio)', philosophy:'A dor é combustível de proteção. Seus discípulos usam o próprio corpo como funil para energia letal e sustentam a realidade através do sacrifício.', icon:'◇'},
    {id:'orphanael', name:'Orphanael', epithet:'O Sagrado da Ordem', colors:'Bronze, Aço e Azul Metálico', symbol:'Triângulo dourado ou hexágono perfeito com linhas geométricas.', gospel:'O Evangelho das Linhas Invisíveis (O Tratado da Sincronia Cósmica)', philosophy:'A entropia é uma falha de engenharia. Seus discípulos estabilizam topologia, portais e leis físicas através da matemática sagrada.', icon:'⬡'}
  ];

  const ASC = [
    {
      id:'arkhe', name:'Arkhé', title:'A Verdade da Matéria', icon:'◇', test:'Intelecto + Recordação vs. CD do Material/Efeito',
      desc:'Não cria do zero. Remodela a realidade existente e a força a lembrar de um estado divino ou a obedecer a um novo propósito; abrange transmutação física, regeneração biológica e alteração de estados da matéria e energia.',
      tiers:{
        '1–3':'Controle do estado sólido e formas inorgânicas simples. Massa de cerca de 5 kg até 200 kg; armas improvisadas de 1d6 + Intelecto até 3d8; cura de ferimentos superficiais de até 3d6 PV ou remoção de Condições Leves; fundir portas, abrir concreto e transmutar materiais básicos.',
        '4–6':'Domínio de biologia complexa e engenharia arquitetônica. De cerca de 500 kg até 5 toneladas; remodela campo de batalha; armas de 5d8 até 10d10, ignorando RD não-mística; ergue muralhas, domos e pequenos templos e pode conceder +5 Defesa Passiva em área; regenera membros, remove Condições Moderadas e cria carapaças com RD 10 físico.',
        '7–8':'Quebra da termodinâmica e controle de energia pura. Altera até 50 toneladas; transforma fundações, lagos e substâncias; converte formas intangíveis como fogo, luz e radiação; armas entre 15d10 e 20d12 ignoram até RD 15; pode criar um Ecossistema Divino em raio de 1 km.',
        '9–10':'Apogeu da Matéria. Reescrita biológica absoluta; pode reduzir exércitos de anomalias a cinzas ou reconstruir corpo totalmente desintegrado a partir de uma gota de sangue. Cap. 10 pode causar 30d12 de Letalidade Direta ou Morte Instantânea por Colapso Molecular, além de converter o próprio ar de uma Entidade em plasma sagrado.'
      },
      levels:[
        'Fundir/abrir matéria simples; 5 kg de massa; 1d6 + INT; cura superficial.',
        'A mesma faixa iniciante, com maior controle de forma e volume.',
        'Limite superior da faixa inicial: cerca de 200 kg e até 3d8 de Dano Sagrado.',
        'Entrada no domínio intermediário: cerca de 500 kg, arquitetura e biologia complexas.',
        'Transmutação de campo e construções sagradas tornam-se práticas.',
        'Limite superior intermediário: cerca de 5 toneladas e até 10d10 de dano.',
        'Entrada avançada: até 50 toneladas e transformação de energia/intangíveis.',
        'Grande Santuário e efeitos ambientais de escala quilométrica.',
        'Entrada do Apogeu: reescrita biológica absoluta.',
        'Colapso/Ressurreição de cenário; 30d12 ou morte instantânea por colapso molecular.'
      ]
    },
    {
      id:'exnihilo', name:'Ex-Nihilo', title:'A Verdade da Criação', icon:'✦', test:'Intelecto + Recordação vs. CD Base 15',
      desc:'O vazio é potencial. Ex-Nihilo materializa construtos de pura luz, matéria sagrada e elementos inexistentes a partir do nada.',
      tiers:{
        '1–3':'Cria 1–2 construtos inanimados simultâneos: espadas de luz, escudos e pontes de até 10 m. Construtos com Dureza 5 e 20 PV; armas causam 2d6 de Dano Radiante + Presença. Pode criar chamas que iluminam sem calor e água curativa que causa dano ou Regeneração 2d6.',
        '4–6':'Cria veículos, máquinas, mecanismos e exoesqueletos de luz sólida. Podem transportar até 6 pessoas, voar ou ignorar terreno difícil. Construtos chegam a Dureza 15 e 80 PV; máquinas podem desobedecer à física; armas infligem 4d8 de Dano contínuo.',
        '7–8':'Cria vida artificial, autômatos e golens de luz com atributos iguais aos do discípulo -2, 8d8 de dano físico e 150 PV. Pode sintetizar Novos Elementos e erguer megaestruturas de até 30 m resistentes a Entidades Arconte Classe B.',
        '9–10':'Apogeu da Criação. Forja Cósmica cria um astro com Super-Gravidade em raio de 100 m e chamas de 20d12 contra corrupção. Gênese permite materializar qualquer coisa que sirva a um Propósito Divino, inclusive novo corpo perfeito ou atmosfera inteira.'
      },
      levels:[
        '1–2 construtos; espadas, escudos e pontes curtas; 2d6 Radiante + Presença.',
        'Maior estabilidade da mesma faixa de construção simples.',
        'Limite superior da faixa: construtos simples plenamente ancorados e fenômenos de luz/água.',
        'Entrada intermediária: veículos e mecanismos de luz sólida.',
        'Construtos com Dureza 15 e 80 PV; capacidade de transportar até 6 pessoas.',
        'Máquinas com propósito e Dano Progressivo 4d8/rodada nas armas desta faixa.',
        'Entrada avançada: autômatos, golens e novos elementos.',
        'Megaestruturas de até 30 m e construtos autônomos mais poderosos.',
        'Entrada do Apogeu: Forja Cósmica e criação astral.',
        'Gênese de escala extrema e materialização de qualquer coisa compatível com Propósito Divino.'
      ]
    },
    {
      id:'poesis', name:'Poesis Pleroma', title:'A Verdade da Alma', icon:'✧', test:'Presença + Recordação vs. CD do ser-alvo ou da intenção',
      desc:'A potência da essência: dá vida, consciência e sentido ao que não possui, invoca guardiões de outras Glórias e reescreve a mente.',
      tiers:{
        '1–3':'Senciência básica em objetos, manipulação emocional e Ecos Espirituais menores. Uma arma pode desejar proteger, uma porta pode recusar seres malignos; pânico pode virar fúria focada; ecos equivalentes a ameaças Classe D possuem 30 PV e ataques de 2d6.',
        '4–6':'Artefatos sencientes, montarias e guardiões espirituais. Objetos podem falar telepaticamente, ter personalidade, perícias próprias e conceder conselhos; montarias Classe C chegam a 80 PV, voo/teleporte rápido e ataques de 5d8. Pode reescrever memórias.',
        '7–8':'Reescrita de personalidade completa e Invocação de Heraldos Classe B. Heraldos têm 250 PV, Aura de Decadência Inversa e lançam Transmutações até Cap. 4. Acima de 60% de Recordação, cada 10% acrescenta +20 PV e +1 nos atributos de combate da entidade.',
        '9–10':'Apogeu da Alma. Gênese da Alma cria vida verdadeira, alma imortal e pode reviver mortos. Cap. 10 invoca um Avatar Arcanjo/Conceito Encarnado de Classe A, imune a dano convencional e capaz de impor uma regra de campo; uso contínuo precipita Transcendência.'
      },
      levels:[
        'Senciência básica, emoções simples e Ecos Espirituais menores.',
        'Maior alcance/estabilidade para animação e manipulação emocional iniciais.',
        'Limite superior dos Ecos Classe D e ataques de 2d6.',
        'Entrada intermediária: artefatos sencientes e montarias espirituais.',
        'Objetos sencientes ganham personalidade, perícias e conselhos; montarias se fortalecem.',
        'Montarias/guardiões Classe C; ataques de 5d8 e reescrita de memórias.',
        'Entrada avançada: personalidade completa e Heraldos da Glória.',
        'Heraldos Classe B, Aura de Decadência Inversa e Transmutações até Cap. 4.',
        'Entrada do Apogeu: Gênese da Alma e criação de vida verdadeira.',
        'Avatar Arcanjo/Conceito Encarnado; regra de campo e pressão inevitável sobre a âncora mortal.'
      ]
    }
  ];

  function injectStyle(){
    if($('#ordem-sete-v44-style')) return;
    const st=document.createElement('style'); st.id='ordem-sete-v44-style'; st.textContent=`
      #tab-powers.ordem-divine-powers{--ordem-gold:#e9c56d;--ordem-white:#f5f0df;--ordem-blue:#9bbcff;--ordem-shadow:rgba(233,197,109,.18);position:relative;overflow:hidden;background:radial-gradient(circle at 50% -10%,rgba(255,230,155,.16),transparent 42%),linear-gradient(180deg,rgba(18,16,13,.98),rgba(7,8,12,.99));border:1px solid rgba(233,197,109,.18);border-radius:16px;padding:14px}
      #tab-powers.ordem-divine-powers:before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.018) 50%,transparent 100%);animation:ordemAura 7s ease-in-out infinite}
      @keyframes ordemAura{50%{transform:translateX(4%);opacity:.7}}
      .ordem-power-kicker{font:700 .68rem/1.1 Cinzel,serif;letter-spacing:.16em;text-transform:uppercase;color:#a79d87}
      .ordem-power-title{margin:.18rem 0;color:var(--ordem-white);font:700 1.35rem/1.15 Cinzel,serif}
      .ordem-power-sub{margin:0;color:#b2aca1;max-width:850px;line-height:1.45;font-size:.82rem}
      .ordem-asc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:14px 0}
      .ordem-asc-card{border:1px solid rgba(233,197,109,.12);background:linear-gradient(145deg,rgba(44,37,23,.72),rgba(8,9,12,.93));border-radius:13px;padding:12px;cursor:pointer;transition:.18s ease;box-shadow:inset 0 0 18px rgba(255,216,123,.018)}
      .ordem-asc-card:hover,.ordem-asc-card.active{border-color:rgba(233,197,109,.48);box-shadow:0 0 22px var(--ordem-shadow),inset 0 0 24px rgba(255,216,123,.045);transform:translateY(-1px)}
      .ordem-asc-head{display:flex;gap:10px;align-items:center}.ordem-asc-icon{width:40px;height:40px;display:grid;place-items:center;border:1px solid rgba(233,197,109,.28);border-radius:50%;color:var(--ordem-gold);font-size:1.1rem;background:radial-gradient(circle,rgba(233,197,109,.13),transparent 70%)}
      .ordem-asc-card h4{margin:0;color:#f1e8d4;font:700 .92rem/1.15 Cinzel,serif}.ordem-asc-card small{color:#9c978f}.ordem-asc-card p{margin:8px 0 0;font-size:.73rem;color:#bbb5aa;line-height:1.38}
      .ordem-rulebar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0 12px}.ordem-rulebar div{padding:9px;border:1px solid rgba(233,197,109,.1);border-radius:9px;background:rgba(255,255,255,.018)}.ordem-rulebar b{display:block;color:#ead9ad;font-size:.69rem;text-transform:uppercase}.ordem-rulebar span{display:block;margin-top:3px;color:#9c988f;font-size:.69rem;line-height:1.32}
      .ordem-cap-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:12px}.ordem-cap-btn{border:1px solid rgba(233,197,109,.11);background:rgba(255,255,255,.02);border-radius:9px;padding:8px;cursor:pointer;color:#b8b2a7;text-align:left}.ordem-cap-btn:hover,.ordem-cap-btn.active{border-color:rgba(233,197,109,.52);color:#f2ddb0;background:rgba(233,197,109,.06)}.ordem-cap-btn strong{display:block;color:#e6d4a7;font:700 .78rem Cinzel,serif}.ordem-cap-btn span{display:block;font-size:.66rem;margin-top:2px;line-height:1.25}
      .ordem-cap-detail{margin-top:10px;padding:12px;border:1px solid rgba(233,197,109,.16);border-radius:11px;background:linear-gradient(145deg,rgba(31,27,18,.74),rgba(5,7,10,.96));color:#c4beb2;line-height:1.48;font-size:.76rem}.ordem-cap-detail h5{margin:0 0 5px;color:#f0ddad;font:700 .86rem Cinzel,serif}.ordem-cap-detail p{margin:4px 0}.ordem-power-list{margin-top:12px}.ordem-power-list .list-item{border-color:rgba(233,197,109,.14);background:rgba(255,248,220,.02)}
      .ordem-glory-shell{--gold:#e9c56d;display:grid;gap:12px}.ordem-glory-hero{padding:14px;border:1px solid rgba(233,197,109,.16);border-radius:14px;background:radial-gradient(circle at 80% 20%,rgba(255,241,180,.1),transparent 40%),linear-gradient(145deg,rgba(34,30,20,.78),rgba(6,8,12,.96))}.ordem-glory-hero h3{margin:.15rem 0;color:#f2e8d1;font:700 1.1rem Cinzel,serif}.ordem-glory-hero p{margin:6px 0 0;color:#b3aea4;font-size:.77rem;line-height:1.45}
      .ordem-record-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:10px}.ordem-panel{border:1px solid rgba(233,197,109,.12);border-radius:12px;background:rgba(8,9,12,.8);padding:11px}.ordem-panel h4{margin:0 0 7px;color:#ead9ad;font:700 .82rem Cinzel,serif}.ordem-record-read{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.ordem-record-chip{padding:8px;border:1px solid rgba(233,197,109,.08);border-radius:8px;background:rgba(255,255,255,.018)}.ordem-record-chip b{display:block;color:#e8dab6;font-size:.71rem}.ordem-record-chip span{display:block;margin-top:2px;color:#969188;font-size:.67rem;line-height:1.3}
      .ordem-record-table{width:100%;border-collapse:collapse;font-size:.66rem}.ordem-record-table th,.ordem-record-table td{padding:6px 5px;border-bottom:1px solid rgba(255,255,255,.055);text-align:left;vertical-align:top}.ordem-record-table th{color:#d8c995;text-transform:uppercase;font-size:.6rem}.ordem-record-table td{color:#aaa59b}.ordem-record-table tr.active{background:rgba(233,197,109,.055)}
      .ordem-discip-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ordem-disc-card{border:1px solid rgba(233,197,109,.1);border-radius:11px;padding:10px;background:linear-gradient(145deg,rgba(30,26,18,.72),rgba(7,8,11,.94));cursor:pointer}.ordem-disc-card.active{border-color:rgba(233,197,109,.48);box-shadow:0 0 18px rgba(233,197,109,.08)}.ordem-disc-top{display:flex;gap:9px;align-items:center}.ordem-disc-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;border:1px solid rgba(233,197,109,.28);color:#efd488}.ordem-disc-card b{color:#efe5ce;font:700 .76rem Cinzel,serif}.ordem-disc-card small{display:block;color:#99938b;font-size:.62rem}.ordem-disc-meta{margin-top:7px;display:grid;gap:4px;font-size:.66rem;color:#aaa59c;line-height:1.34}.ordem-disc-meta strong{color:#cfc09a}.ordem-discip-footer{padding:10px;border:1px solid rgba(233,197,109,.12);border-radius:10px;color:#9e998f;font-size:.68rem;line-height:1.4}.ordem-transcend{border-color:rgba(247,213,123,.28);box-shadow:inset 0 0 28px rgba(247,213,123,.035)}
      @media(max-width:900px){.ordem-asc-grid{grid-template-columns:1fr}.ordem-rulebar{grid-template-columns:1fr}.ordem-cap-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ordem-record-grid{grid-template-columns:1fr}.ordem-discip-grid{grid-template-columns:1fr}}
    `; document.head.appendChild(st);
  }

  function currentRec(){return Math.max(0,Math.min(100,Number($('#spec-recordacao')?.value||0)));}
  function recInfo(v=currentRec()){
    const i=Math.min(9,Math.floor(Math.max(0,Math.min(99,v))/10));
    return REMEM[i] || REMEM[9];
  }
  function renderPowers(){
    if(!isOrder()) return;
    injectStyle();
    const tab=$('#tab-powers'); if(!tab)return;
    tab.classList.add('ordem-divine-powers');
    const oldList=tab.querySelector('#powers-list');
    const oldHtml=oldList?.outerHTML || '<div id="powers-list" class="dynamic-list ordem-power-list"></div>';
    tab.innerHTML=`<div class="ordem-power-kicker">ORDEM DOS SETE · ECOS DA ALTA GLÓRIA</div>
      <h3 class="ordem-power-title">As Três Ascensões Sobreviventes</h3>
      <p class="ordem-power-sub">A Ordem não conjura magia: decreta a Verdade através da Energia Paradimensional. A Capacitação 1–10 define a escala do milagre e a Recordação destrava o limite que o discípulo consegue sustentar.</p>
      <div class="ordem-rulebar"><div><b>Manifestação</b><span>Sem TCP. A manifestação sagrada é regida por Capacidade e Recordação.</span></div><div><b>CD de Salvaguarda</b><span>10 + Capacidade + atributo primário (INT ou PRE), quando o alvo tiver resistência.</span></div><div><b>Transcendência</b><span>Recordação a 100% completa a memória divina e retira o anjo da Terceira Glória.</span></div></div>
      <div class="ordem-asc-grid" id="ordem-asc-grid"></div>
      <div id="ordem-capacity-panel"></div>
      ${oldHtml}`;
    const grid=$('#ordem-asc-grid');
    ASC.forEach((a,idx)=>{const c=document.createElement('article');c.className='ordem-asc-card'+(idx===0?' active':'');c.dataset.asc=a.id;c.innerHTML=`<div class="ordem-asc-head"><span class="ordem-asc-icon">${a.icon}</span><div><h4>${esc(a.name)}</h4><small>${esc(a.title)}</small></div></div><p>${esc(a.desc)}</p>`;c.onclick=()=>selectAsc(a.id);grid.appendChild(c);});
    selectAsc(window.__ordemSelectedAsc || 'arkhe');
  }
  function selectAsc(id){
    const a=ASC.find(x=>x.id===id)||ASC[0]; window.__ordemSelectedAsc=a.id;
    document.querySelectorAll('.ordem-asc-card').forEach(c=>c.classList.toggle('active',c.dataset.asc===a.id));
    const panel=$('#ordem-capacity-panel'); if(!panel)return;
    panel.innerHTML=`<div class="ordem-panel"><h4>${esc(a.name)} · ${esc(a.title)}</h4><div class="ordem-cap-grid">${a.levels.map((t,i)=>`<button type="button" class="ordem-cap-btn ${i===0?'active':''}" data-cap="${i+1}"><strong>Cap. ${i+1}</strong><span>${esc(t.slice(0,92))}${t.length>92?'…':''}</span></button>`).join('')}</div><div id="ordem-cap-detail" class="ordem-cap-detail"><h5>Capacidade 1 · ${esc(a.name)}</h5><p>${esc(a.levels[0])}</p><p><b>Faixa canônica:</b> ${i18nTier(1)} · <b>Teste:</b> ${esc(a.test)}</p></div></div><div class="ordem-panel"><h4>Escala Canônica por Faixa</h4>${Object.entries(a.tiers).map(([k,v])=>`<div class="ordem-record-chip"><b>Capacidade ${esc(k)}</b><span>${esc(v)}</span></div>`).join('')}</div>`;
    panel.querySelectorAll('.ordem-cap-btn').forEach(btn=>btn.onclick=()=>showCap(a,Number(btn.dataset.cap)));
  }
  function i18nTier(cap){return cap<=3?'Iniciante (1–3)':cap<=6?'Intermediário (4–6)':cap<=8?'Avançado (7–8)':'Apogeu (9–10)';}
  function showCap(a,cap){
    const d=$('#ordem-cap-detail'); if(!d)return;
    document.querySelectorAll('.ordem-cap-btn').forEach(b=>b.classList.toggle('active',Number(b.dataset.cap)===cap));
    const tier=i18nTier(cap);
    d.innerHTML=`<h5>Capacidade ${cap} · ${esc(a.name)}</h5><p>${esc(a.levels[cap-1])}</p><p><b>Faixa canônica:</b> ${tier} · <b>Teste:</b> ${esc(a.test)}</p><button type="button" class="souls-btn small-btn" id="ordem-add-cap">✦ Registrar este milagre em Poderes</button>`;
    $('#ordem-add-cap').onclick=()=>addPower(a,cap);
  }
  function addPower(a,cap){
    if(!isOrder())return;
    const list=$('#powers-list'); if(!list)return;
    const text=`<div class="list-item-header"><strong>✦ ${esc(a.name)} · Capacidade ${cap}</strong><button type="button" class="hide-on-view" onclick="this.closest('.list-item').remove()">&#10006;</button></div><div>${esc(a.levels[cap-1])}</div><small>${esc(a.test)}</small>`;
    const item=document.createElement('div'); item.className='list-item';
    item.dataset.power=JSON.stringify({id:`ordem-${a.id}-${cap}-${Date.now()}`,name:`${a.name} · Capacidade ${cap}`,modifier:a.test||'',description:a.levels[cap-1]||'',potencies:[{potency:a.name,cap:String(cap)}],progressionRank:1});
    item.innerHTML=text; list.appendChild(item);
  }

  function renderGlory(){
    if(!isOrder())return;
    injectStyle();
    const host=$('#specific-content-container'); if(!host)return;
    const current=host.querySelector('#spec-recordacao')?.value || '';
    host.innerHTML=`<div class="ordem-glory-shell"><section class="ordem-glory-hero"><div class="ordem-power-kicker">LUZ & GLÓRIA · MOTOR DA RECORDAÇÃO</div><h3>O despertar da alma substitui a Decadência</h3><p>A Recordação é o nível de despertar da essência sagrada. Quanto mais alta, maior a capacidade de Transmutação e mais próximo o discípulo chega do arquétipo de seu Arcanjo — ao preço da conexão emocional com o mundo físico.</p><div class="form-group" style="margin-top:10px"><label>Recordação atual (0–100%)</label><input id="spec-recordacao" type="number" min="0" max="100" value="${esc(current||'0')}" style="border-color:#e9c56d;color:#e9c56d"></div><div id="ordem-record-summary" class="ordem-rulebar"></div></section>
      <section class="ordem-record-grid"><div class="ordem-panel"><h4>Escala de Despertar</h4><div style="overflow:auto"><table class="ordem-record-table"><thead><tr><th>Faixa</th><th>Cap.</th><th>Sim.</th><th>CD</th><th>Manifestação</th></tr></thead><tbody>${REMEM.map(r=>`<tr data-range="${esc(r.range)}"><td>${esc(r.range)}</td><td>${esc(r.max)}</td><td>${r.simultaneous}</td><td>${esc(r.cd)}</td><td>${esc(r.visual)}</td></tr>`).join('')}</tbody></table></div></div><div class="ordem-panel"><h4>Ganhar e Perder a Luz</h4><div class="ordem-record-read"><div class="ordem-record-chip"><b>+2% a +5%</b><span>Rituais sagrados do Discipulado.</span></div><div class="ordem-record-chip"><b>+5%</b><span>Derrotar ameaça corruptora, como Elder ou Anomalia de Alta Classe.</span></div><div class="ordem-record-chip"><b>+5% a +10%</b><span>Descobrir e libertar uma Verdade Oculta.</span></div><div class="ordem-record-chip"><b>+10%</b><span>Provação de fé abnegada ou sacrifício extremo.</span></div><div class="ordem-record-chip"><b>+15%</b><span>Receber Fragmento Celestial.</span></div><div class="ordem-record-chip"><b>+20%</b><span>Comunhão: manifestação direta do Arcanjo.</span></div><div class="ordem-record-chip"><b>-5%</b><span>Falhar no Rompimento de Véu e sucumbir ao medo/corrupção.</span></div><div class="ordem-record-chip"><b>-10% a -20%</b><span>Usar Transmutações por vaidade, ganho egoísta ou malícia humana.</span></div></div></div></section>
      <section class="ordem-panel ordem-transcend"><h4>Transcendência</h4><div class="ordem-discip-footer">Em 100%, a carne incapaz de conter a Alma Plena se desfaz em luz, fractais ou cinzas sagradas. O anjo recupera a memória completa e é expulso da Terceira Glória, retornando aos céus e deixando de intervir diretamente neste plano.</div></section>
      <section class="ordem-panel"><h4>Discipulados · A cor e a filosofia que iluminam a alma</h4><div class="ordem-discip-grid" id="ordem-discip-grid"></div><div class="form-group" style="margin-top:10px"><label>Discipulado escolhido</label><select id="spec-discipulado" style="border-color:#e9c56d;color:#f1dfae"><option value="">Selecionar frequência...</option>${DISC.map(d=>`<option value="${d.id}">${esc(d.name)} — ${esc(d.epithet)}</option>`).join('')}</select></div><div class="ordem-discip-footer">O Discipulado define a filosofia e a cor da luz. A Casta define a função e a mecânica do personagem no corpo vivo da Ordem; cada Casta parte de um pacote fechado de 33 Pontos de Poder.</div></section>
      <div class="form-group"><label>Dádivas Forjadas · Arsenal Divino</label><textarea id="spec-dadivas" rows="3" placeholder="Relíquias, chassi, Ascensões, propósito e cargas..."></textarea></div></div>`;
    const dg=$('#ordem-discip-grid');
    DISC.forEach(d=>{const c=document.createElement('article');c.className='ordem-disc-card';c.dataset.disc=d.id;c.innerHTML=`<div class="ordem-disc-top"><span class="ordem-disc-icon">${d.icon}</span><div><b>${esc(d.name)}</b><small>${esc(d.epithet)}</small></div></div><div class="ordem-disc-meta"><span><strong>Espectro:</strong> ${esc(d.colors)}</span><span><strong>Símbolo:</strong> ${esc(d.symbol)}</span><span><strong>Evangelho:</strong> ${esc(d.gospel)}</span><span><strong>Filosofia:</strong> ${esc(d.philosophy)}</span></div>`;c.onclick=()=>selectDisc(d.id);dg.appendChild(c);});
    const inp=$('#spec-recordacao'); if(inp) inp.addEventListener('input',()=>updateRecordSummary());
    updateRecordSummary();
  }
  function selectDisc(id){const s=$('#spec-discipulado');if(s)s.value=id;document.querySelectorAll('.ordem-disc-card').forEach(c=>c.classList.toggle('active',c.dataset.disc===id));}
  function updateRecordSummary(){
    if(!isOrder())return; const v=currentRec(), info=recInfo(v); const maxNum=parseInt((info.max.match(/\d+/)||['0'])[0],10)||0;
    const s=$('#ordem-record-summary'); if(s)s.innerHTML=`<div><b>Capacidade Máxima</b><span>${esc(info.max)}</span></div><div><b>Transmutações Simultâneas</b><span>${info.simultaneous}</span></div><div><b>Redução de CD</b><span>${esc(info.cd)}</span></div>`;
    document.querySelectorAll('.ordem-record-table tbody tr').forEach(tr=>tr.classList.toggle('active',tr.dataset.range===info.range));
    const capSelect=document.getElementById('resource-panel')?.querySelector('.res-val-input[data-type="Capacidade Max"]');if(capSelect)capSelect.value=maxNum||info.max;
    const sim=document.getElementById('resource-panel')?.querySelector('.res-val-input[data-type="Transm. Sim."]');if(sim)sim.value=info.simultaneous;
  }

  function hydrateOrderSpecific(char){
    if(!isOrder())return;
    const s=char?.specificData||{};
    const r=$('#spec-recordacao'); if(r)r.value=s['spec-recordacao'] ?? '0';
    const d=$('#spec-dadivas'); if(d)d.value=s['spec-dadivas'] ?? '';
    const disc=$('#spec-discipulado'); if(disc){disc.value=s['spec-discipulado']||'';selectDisc(disc.value);}
    updateRecordSummary();
  }

  let powersBackup=null;
  function backupGenericPowers(){
    const tab=document.getElementById('tab-powers');
    if(tab && !tab.classList.contains('ordem-divine-powers') && !powersBackup) powersBackup={html:tab.innerHTML,className:tab.className};
  }
  function restoreGenericPowers(){
    const tab=document.getElementById('tab-powers');
    if(!tab || !powersBackup) return;
    tab.innerHTML=powersBackup.html;
    tab.className=powersBackup.className;
    powersBackup=null;
  }
  function leaveOrderPowers(){restoreGenericPowers();}

  function installHooks(){
    injectStyle();
    backupGenericPowers();
    const oldSelectNature=window.selectNature;
    if(typeof oldSelectNature==='function' && !oldSelectNature.__ordemV44){
      const fn=function(nature){
        const next=String(nature||'')===ORDER;
        if(next) backupGenericPowers();
        const r=oldSelectNature.apply(this,arguments);
        if(next){renderGlory();renderPowers();}
        else if(isOrder()===false){leaveOrderPowers();}
        return r;
      };
      fn.__ordemV44=true; window.selectNature=fn;
    }
    const oldLoad=window.loadCharacterToBuilder;
    if(typeof oldLoad==='function' && !oldLoad.__ordemV44){
      const fn=function(){
        backupGenericPowers();
        const r=oldLoad.apply(this,arguments);
        const arr=arguments[1]||window.characters||[];
        const ch=arr[arguments[0]];
        if(String(ch?.nature||'')===ORDER){renderGlory();renderPowers();hydrateOrderSpecific(ch);}
        else if(!isOrder()) leaveOrderPowers();
        return r;
      };
      fn.__ordemV44=true; window.loadCharacterToBuilder=fn;
    }
    const oldOpen=window.openTab;
    if(typeof oldOpen==='function' && !oldOpen.__ordemV44){
      const fn=function(id){
        const r=oldOpen.apply(this,arguments);
        if(isOrder() && id==='tab-specific')renderGlory();
        if(isOrder() && id==='tab-powers')renderPowers();
        if(!isOrder() && id==='tab-powers')leaveOrderPowers();
        return r;
      };
      fn.__ordemV44=true; window.openTab=fn;
    }
    const oldRecalc=window.recalculateStats;
    if(typeof oldRecalc==='function' && !oldRecalc.__ordemV44){
      const fn=function(){const r=oldRecalc.apply(this,arguments); if(isOrder())updateRecordSummary(); return r;};
      fn.__ordemV44=true; window.recalculateStats=fn;
    }
    const bootOrder=()=>{if(isOrder()){backupGenericPowers();renderGlory();renderPowers();}};
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bootOrder,{once:true});
    else bootOrder();
  }

  window.MundosOrdem={ASC,DISC,REMEM};
  installHooks();
})();
