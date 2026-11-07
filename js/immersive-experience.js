/* Mundos Sombrios — Experiência Imersiva V2.1
   Camada de UX/direção de arte sobre a Forja, Portal e ficha em jogo.
   Não altera regras canônicas; observa e explica o estado já mantido por script.js.
*/
(function(){
  'use strict';
  const PREF_KEY='ms-immersive-experience-v21';
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
  const state={level:'immersive',audio:false,fast:false,builderMode:'create',world:'neutral',audioCtx:null};
  try{Object.assign(state,JSON.parse(localStorage.getItem(PREF_KEY)||'{}'));}catch(_){ }

  const GUIDES={
    'Nexo Padrão (Livro Base)':{fantasy:'Uma mutação viva tentando continuar humana.',style:'Versátil · poder com custo biológico',complexity:3,good:'Adaptação, potência e escolhas de Estigma.',weak:'Assimilação e Estresse cobram cada excesso.',pair:'Especialista ou suporte que estabilize riscos.',avoid:'Se você quer poderes sem consequências.',example:'Sobrevivente de uma Colheita que esconde a mutação.'},
    'Arquiteto de Linhagem (Aprimorador)':{fantasy:'Um humano que transforma genética em engenharia.',style:'Suporte · preparação · bioforja',complexity:4,good:'Buffs, pesquisa e soluções construídas.',weak:'Depende de DS, preparação e leitura do grupo.',pair:'Combatentes e Nexos agressivos.',avoid:'Se prefere resolver tudo no improviso.',example:'Pesquisador clandestino que reescreve aliados em campo.'},
    'Operador de Sistema (Proj. Player)':{fantasy:'Um corpo conectado a uma inteligência que também joga.',style:'Interface · sincronia · controle digital',complexity:4,good:'HUD, Kafra e ferramentas táticas únicas.',weak:'Sincronia e decisões da IA exigem gestão.',pair:'Equipes que exploram informação e mobilidade.',avoid:'Se não quer administrar subsistemas.',example:'Operador que não sabe onde termina sua vontade e começa a IA.'},
    'Classer (Linhagem Herdada)':{fantasy:'A evolução já aconteceu antes de você nascer.',style:'Progressão permanente · instinto',complexity:3,good:'Árvore de LHL e capacidades passivas duradouras.',weak:'Investimentos são permanentes e definem seu caminho.',pair:'Grupos que precisam de consistência e resistência.',avoid:'Se gosta de reconstruir a ficha toda sessão.',example:'Herdeiro de uma Colheita genética esquecida.'},
    'Agente de Carreira (Ocultatun)':{fantasy:'Você sobrevive ao impossível porque foi treinado para isso.',style:'Disciplina · arsenal · protocolo',complexity:2,good:'Confiabilidade, equipamentos e manobras claras.',weak:'Menos acesso direto ao paranormal.',pair:'Designados que precisam de cobertura humana.',avoid:'Se quer começar dominando rituais e anomalias.',example:'Veterano da Sala Branca que já enterrou equipes demais.'},
    'Agente Designado (Ocultatun)':{fantasy:'A instituição autorizou você a tocar no impossível.',style:'Paranormal · risco · preparação',complexity:4,good:'Rituais, enxertos e manifestações poderosas.',weak:'Saturação, Decadência e custos de uso.',pair:'Agentes de Carreira que seguram a linha.',avoid:'Se prefere um kit simples e previsível.',example:'Especialista marcado por uma anomalia que agora precisa controlá-la.'},
    'O Envolto (Horror Cósmico)':{fantasy:'Você existe apesar de a realidade discordar.',style:'Corrupção · transformação · horror',complexity:5,good:'Poder extremo e árvores ontológicas singulares.',weak:'Corrupção muda a ficha, o corpo e a história.',pair:'Personagens capazes de ancorar ou conter consequências.',avoid:'Se não quer perder controle narrativo sobre a transformação.',example:'Uma pessoa cuja sombra continua andando quando ela para.'},
    'A Ordem dos Sete (Alta Glória)':{fantasy:'Recordar é recuperar uma natureza que o mundo tentou apagar.',style:'Milagre · autoridade · ascensão',complexity:5,good:'Recordação, Ascensões e manifestações simultâneas.',weak:'Exige compreender juramentos, Castas e Verdades.',pair:'Grupos que trabalham com propósito e proteção.',avoid:'Se procura progressão puramente material.',example:'Um desperto que reconhece fragmentos de um nome anterior à humanidade.'},
    'Combatente':{style:'Linha de frente · letalidade',complexity:2,good:'Pressão física e resistência.',weak:'Menos soluções fora do confronto.',pair:'Especialista e Aprimorador.',avoid:'Se prefere vencer sem se expor.',example:'Vigilante urbano alterado pelo Gene.'},
    'Especialista':{style:'Tática · tecnologia · leitura',complexity:3,good:'Resolve obstáculos e cria vantagem.',weak:'Depende de planejamento e posição.',pair:'Combatente ou Sobrevivente.',avoid:'Se quer uma rotina de ataque simples.',example:'Analista que transforma dados de campo em sobrevivência.'},
    'Sobrevivente':{style:'Evasão · exploração · resistência',complexity:2,good:'Mobilidade, furtividade e adaptação.',weak:'Menor explosão ofensiva.',pair:'Qualquer linha de frente.',avoid:'Se seu foco é dano imediato.',example:'Explorador que voltou de uma zona onde ninguém deveria entrar.'},
    'Engenheiro Biológico':{style:'Bioforja · suporte · pesquisa',complexity:4,good:'Modifica aliados e cria respostas biológicas.',weak:'Recursos e preparação limitam o ritmo.',pair:'Nexos e combatentes.',avoid:'Se não gosta de administrar recursos.',example:'Médico de campo que trata DNA como equipamento.'},
    'IA Virtudes':{style:'Proteção · suporte · estabilidade',complexity:3,good:'Mantém o receptáculo e a equipe operacionais.',weak:'Menor foco em execução direta.',pair:'IA Domínios e vanguardas.',avoid:'Se quer protagonismo ofensivo constante.',example:'IA que aprendeu a chamar preservação de compaixão.'},
    'IA Domínios':{style:'Combate · subjugação · controle',complexity:3,good:'Converte sistemas e corpo em armamento.',weak:'Tende a soluções agressivas e exposição.',pair:'Virtudes ou especialistas.',avoid:'Se prefere evitar confronto.',example:'Sistema militar que considera hesitação uma falha de arquitetura.'},
    'IA Principados':{style:'Hacking · Kafra · realidade digital',complexity:5,good:'Controle de sistemas e espaços informacionais.',weak:'Alta dependência de contexto e subsistemas.',pair:'Operadores táticos e infiltradores.',avoid:'Se quer mecânicas lineares.',example:'IA que enxerga portas onde humanos veem paredes.'},
    'Velocitus Bellator':{style:'Velocidade · pressão · perseguição',complexity:3,good:'Reposicionamento e ação predatória.',weak:'Erro de posicionamento custa caro.',pair:'Controladores que abrem rotas.',avoid:'Se prefere resistir parado.',example:'Herdeiro cuja percepção corre antes do próprio corpo.'},
    'Aeternus Vitalis':{style:'Regeneração · tanque · sacrifício',complexity:3,good:'Sobrevive ao que deveria encerrar cenas.',weak:'Ser resistente não impede consequências narrativas.',pair:'Aliados frágeis e suporte.',avoid:'Se quer mobilidade acima de permanência.',example:'Uma linhagem que trata ferimentos fatais como memória recente.'},
    'Mentis Aurorae':{style:'Percepção · precisão · antecipação',complexity:4,good:'Lê padrões e vulnerabilidades.',weak:'Exige decisões táticas e informação.',pair:'Combatentes e atiradores.',avoid:'Se não gosta de preparar a jogada.',example:'Descendente que percebe microsegundos como escolhas completas.'},
    'Mercador da Morte':{style:'Arsenal · preparação · execução',complexity:3,good:'Equipamento, munição e eliminação planejada.',weak:'Preparação ruim reduz muito sua eficiência.',pair:'Agentes investigativos.',avoid:'Se não quer pensar no inventário.',example:'Operador que sabe o peso exato de toda resposta letal.'},
    'Carrasco Cinzento':{style:'Força · intimidação · supressão',complexity:3,good:'Controle pelo medo e confronto direto.',weak:'Abordagem brutal produz consequências sociais.',pair:'Investigadores que precisam de contenção.',avoid:'Se quer diplomacia como primeira ferramenta.',example:'Agente enviado quando a Ocultatun já desistiu de negociar.'},
    'Alquerino':{style:'Alquimia · síntese · improvisação',complexity:5,good:'Converte ingredientes e emoção em solução.',weak:'Pesquisa e preparação são parte do poder.',pair:'Equipes investigativas.',avoid:'Se não quer criar fórmulas e gerenciar reagentes.',example:'Peregrino que fabrica o impossível em frascos rotulados à mão.'},
    'Taumatúrgico':{style:'Explosão · canalização · risco',complexity:4,good:'Poder paranormal direto e intenso.',weak:'Saturação cresce com a ambição.',pair:'Agentes que contenham o campo.',avoid:'Se quer segurança e previsibilidade.',example:'Designado que usa o próprio corpo como condutor de tempestades.'},
    'Hermético':{style:'Ritual · geometria · controle',complexity:5,good:'Selos, banimentos e domínio de área.',weak:'Preparação e linguagem ritual importam.',pair:'Vanguardas que protegem o ritual.',avoid:'Se prefere decisões instantâneas.',example:'Geômetra que desenha jaulas para coisas sem forma.'},
    'Esotérico':{style:'Enxerto · cirurgia · suporte profano',complexity:5,good:'Transforma carne e anomalia em ferramenta.',weak:'Custos físicos e éticos são constantes.',pair:'Equipes que toleram soluções extremas.',avoid:'Se não quer horror corporal na fantasia.',example:'Cirurgião que mantém instrumentos separados entre estéreis e impossíveis.'},
    'O Arauto':{style:'Terror · presença · influência',complexity:4,good:'Quebra moral e projeta o Envolto.',weak:'Exposição acelera consequências ontológicas.',pair:'Tocados e personagens de contenção.',avoid:'Se não quer ser o centro do horror.',example:'Porta-voz que ouve respostas antes de fazer perguntas.'},
    'O Tocado':{style:'Adaptação · resistência · mutação',complexity:4,good:'Aprende com dano e transforma o corpo.',weak:'A adaptação cobra identidade.',pair:'Arautos e controladores.',avoid:'Se quer manter forma e recursos estáveis.',example:'Sobrevivente que nunca cicatriza da mesma maneira duas vezes.'},
    'O Condenado':{style:'Entropia · risco · última chance',complexity:5,good:'Fica mais perigoso quando tudo piora.',weak:'Joga deliberadamente perto do colapso.',pair:'Aliados que saibam quando resgatá-lo.',avoid:'Se evita mecânicas de alto risco.',example:'Alguém que já viu a própria morte e decidiu usá-la como arma.'},
    'Inquisidor (A Lança)':{style:'Ataque · milagre · caça',complexity:3,good:'Pressiona ameaças e rompe corrupção.',weak:'Especialização ofensiva pede propósito claro.',pair:'Sentinela e Intérprete.',avoid:'Se quer observar antes de agir.',example:'Discípulo que considera cada golpe uma declaração de Verdade.'},
    'Intérprete (Os Olhos)':{style:'Revelação · análise · sabedoria',complexity:4,good:'Descobre Verdades e falhas ocultas.',weak:'Conhecimento exige interpretação e decisão.',pair:'Inquisidor e Juízo.',avoid:'Se não gosta de investigação.',example:'Discípulo que lê a realidade como um manuscrito corrigido à margem.'},
    'Sentinela (A Parede)':{style:'Proteção · resistência · ancoragem',complexity:3,good:'Defende aliados e estabiliza o campo.',weak:'Menor alcance quando o grupo se dispersa.',pair:'Qualquer atacante frágil.',avoid:'Se quer perseguir o inimigo sozinho.',example:'Discípulo cuja presença transforma recuo em opção desnecessária.'},
    'Juízo (A Voz)':{style:'Comando · mediação · autoridade',complexity:5,good:'Altera conflitos pela palavra e pela Verdade.',weak:'Exige leitura social e responsabilidade narrativa.',pair:'Intérprete e Sentinela.',avoid:'Se prefere resolver tudo com dano.',example:'Discípulo que fala pouco porque o mundo escuta demais.'}
  };

  const TAB_BRIEFS={
    exodo:{
      'tab-identity':['PROTOCOLO DE IDENTIDADE','Antes de medir o Gene, defina a pessoa que terá de sobreviver a ele.'],
      'tab-stats':['LEITURA BIOMÉTRICA','Cada número é uma capacidade do corpo; toque no símbolo de informação para ver de onde ele veio.'],
      'tab-skills':['MEMÓRIA MUSCULAR','Competência é aquilo que o personagem consegue repetir quando o mundo deixa de cooperar.'],
      'tab-evolution':['REGISTRO DE ADAPTAÇÃO','A evolução deve carregar a memória da sessão que a tornou possível.'],
      'tab-powers':['ENGENHARIA DO IMPOSSÍVEL','Defina efeito, alcance, custo e consequência antes da aparência do poder.'],
      'tab-equipment':['INVENTÁRIO OPERACIONAL','Equipamento revela preparação: registre função antes de ornamentação.']
    },
    ocultatun:{
      'tab-identity':['ABERTURA DE DOSSIÊ','A Ocultatun não recruta uma ficha; recruta um histórico, uma dívida e um motivo para continuar.'],
      'tab-stats':['AVALIAÇÃO DE CAMPO','Os números indicam o que ainda funciona quando o protocolo falha.'],
      'tab-skills':['QUALIFICAÇÕES DO AGENTE','Toda perícia é uma justificativa para estar vivo depois do primeiro contato.'],
      'tab-evolution':['RELATÓRIO PÓS-OPERAÇÃO','Registre o que foi praticado, reconhecido e autorizado — inclusive o preço.'],
      'tab-powers':['PROTOCOLO ANÔMALO','O impossível precisa de custo, teste e consequência antes de receber um nome bonito.'],
      'tab-equipment':['CADEIA DE CUSTÓDIA','Armas, relíquias e dispositivos contam de onde vieram e por que ainda não foram destruídos.']
    },
    envolto:{
      'tab-identity':['REGISTRO INCOMPLETO','Algumas informações parecem faltar porque talvez nunca tenham existido.'],
      'tab-stats':['ANCO...RAGEM','Valores estáveis são uma hipótese útil. Observe o que a Corrupção altera.'],
      'tab-skills':['HÁBITOS DE UMA PESSOA','Competências são provas de que ainda existe alguém por trás da anomalia.'],
      'tab-evolution':['MEMÓRIA SOB EROSÃO','O que você aprendeu pode ser a última coisa que permanecerá reconhecível.'],
      'tab-powers':['FALHA ONTOLÓGICA','Todo poder do Envolto também é uma pergunta feita à existência.'],
      'tab-equipment':['OBJETOS ANCORADOS','Algumas coisas continuam reais porque alguém insiste em carregá-las.']
    },
    ordem:{
      'tab-identity':['PRIMEIRA RECORDAÇÃO','A ficha começa mortal; cada escolha pergunta o que existia antes da Queda.'],
      'tab-stats':['MEDIDA DA FORMA MORTAL','Atributos descrevem a carne. Recordação descreve aquilo que tenta atravessá-la.'],
      'tab-skills':['DISCIPLINA DA GLÓRIA','Treino e memória divina devem coexistir até deixarem de ser distinguíveis.'],
      'tab-evolution':['CRÔNICA DA ASCENSÃO','Não marque apenas progresso: registre a Verdade que tornou a mudança inevitável.'],
      'tab-powers':['MANIFESTAÇÃO','Um milagre não é um truque; é a realidade aceitando temporariamente outra lei.'],
      'tab-equipment':['DÁDIVAS','Uma ferramenta sagrada deve declarar propósito, não apenas bônus.']
    }
  };

  function savePrefs(){try{localStorage.setItem(PREF_KEY,JSON.stringify({level:state.level,audio:state.audio,fast:state.fast,builderMode:state.builderMode}));}catch(_){}}
  function currentModeValue(){return $('#char-mode')?.value || window.__mundosSelectedMode || 'exodo';}
  function currentNatureValue(){return $('#char-nature')?.value || '';}
  function currentClassValue(){return $('#char-class')?.value || '';}
  function worldFrom(mode,nature){if(String(nature).includes('Envolto'))return 'envolto';if(String(nature).includes('Ordem'))return 'ordem';return mode==='ocultatun'?'ocultatun':mode==='exodo'?'exodo':'neutral';}
  function setWorld(mode=currentModeValue(),nature=currentNatureValue()){
    state.world=worldFrom(mode,nature);document.body.dataset.msWorld=state.world;const b=$('#screen-builder');if(b)b.dataset.msWorld=state.world;
    updateNarrativeBrief();
  }
  function applyPrefs(){
    document.body.dataset.msExperience=state.level;document.body.dataset.msAudio=state.audio?'on':'off';document.body.dataset.msBuilderSpeed=state.fast?'fast':'guided';
    $$('.ms-exp-level').forEach(b=>b.classList.toggle('active',b.dataset.level===state.level));
    const audio=$('#ms-audio-toggle');if(audio){audio.classList.toggle('active',state.audio);audio.textContent=state.audio?'SOM ON':'SOM OFF';}
    const fast=$('#ms-fast-toggle');if(fast){fast.classList.toggle('active',state.fast);fast.textContent=state.fast?'MODO RÁPIDO':'MODO GUIADO';}
  }
  function installExperienceDock(){
    if($('#ms-experience-dock'))return;
    const d=document.createElement('aside');d.id='ms-experience-dock';d.className='ms-experience-dock hide-on-pdf';d.setAttribute('aria-label','Intensidade da experiência');
    d.innerHTML='<button class="ms-exp-knob" type="button" aria-expanded="false" title="Experiência visual">◈</button><div class="ms-exp-panel"><span>EXPERIÊNCIA</span><div><button class="ms-exp-level" data-level="functional">FUNCIONAL</button><button class="ms-exp-level" data-level="immersive">IMERSIVO</button><button class="ms-exp-level" data-level="cinematic">CINEMÁTICO</button></div><button id="ms-audio-toggle" type="button">SOM OFF</button></div>';
    document.body.appendChild(d);
    $('.ms-exp-knob',d).addEventListener('click',e=>{const p=$('.ms-exp-panel',d);const open=p.classList.toggle('open');e.currentTarget.setAttribute('aria-expanded',String(open));});
    $$('.ms-exp-level',d).forEach(b=>b.addEventListener('click',()=>{state.level=b.dataset.level;savePrefs();applyPrefs();playTone('confirm');}));
    $('#ms-audio-toggle',d).addEventListener('click',()=>{state.audio=!state.audio;savePrefs();applyPrefs();if(state.audio)playTone('wake');});
  }
  function playTone(kind='confirm'){
    if(!state.audio)return;try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;state.audioCtx=state.audioCtx||new C();const ctx=state.audioCtx;if(ctx.state==='suspended')ctx.resume();
      const osc=ctx.createOscillator(),gain=ctx.createGain();const now=ctx.currentTime;const map={exodo:164,ocultatun:116,envolto:73,ordem:246,neutral:150};let f=map[state.world]||150;if(kind==='wake')f*=1.5;if(kind==='danger')f*=.75;
      osc.type=state.world==='ocultatun'?'triangle':state.world==='envolto'?'sawtooth':'sine';osc.frequency.setValueAtTime(f,now);osc.frequency.exponentialRampToValueAtTime(f*(kind==='confirm'?1.4:1.15),now+.12);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.018);gain.gain.exponentialRampToValueAtTime(.0001,now+.18);osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+.2);
    }catch(_){ }
  }
  function transition(label=''){
    if(state.level==='functional'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    document.body.classList.remove('ms-world-transition');void document.body.offsetWidth;document.body.classList.add('ms-world-transition');
    let veil=$('#ms-transition-veil');if(!veil){veil=document.createElement('div');veil.id='ms-transition-veil';veil.className='ms-transition-veil';veil.innerHTML='<span></span>';document.body.appendChild(veil);} $('span',veil).textContent=label;setTimeout(()=>document.body.classList.remove('ms-world-transition'),520);
  }
  function confirmation(kind,name){
    if(state.fast||state.level==='functional')return;
    let o=$('#ms-confirmation-moment');if(!o){o=document.createElement('div');o.id='ms-confirmation-moment';o.className='ms-confirmation-moment';document.body.appendChild(o);}
    const messages={nature:{exodo:'O sistema reconheceu uma origem.',ocultatun:'O arquivo foi liberado.',envolto:'A realidade registrou uma inconsistência.',ordem:'Uma memória respondeu.'},class:{exodo:'Perfil operacional confirmado.',ocultatun:'Designação de campo confirmada.',envolto:'Uma forma de ruína foi escolhida.',ordem:'A função foi recordada.'}};
    o.innerHTML=`<span>${kind==='nature'?'ORIGEM CONFIRMADA':'CLASSE CONFIRMADA'}</span><strong>${esc(name)}</strong><p>${esc(messages[kind]?.[state.world]||'Escolha registrada.')}</p>`;o.classList.remove('show');void o.offsetWidth;o.classList.add('show');playTone('confirm');setTimeout(()=>o.classList.remove('show'),1200);
  }

  function installBuilderWorkbench(){
    const layout=$('#pdf-content'),form=$('#char-form');if(!layout||!form||layout.dataset.immersiveInstalled)return;layout.dataset.immersiveInstalled='true';
    const tabs=$('#dynamic-tabs');const work=document.createElement('div');work.className='ms-builder-workbench';const main=document.createElement('div');main.className='ms-builder-main';const aside=document.createElement('aside');aside.id='ms-character-live-preview';aside.className='ms-character-live-preview hide-on-pdf';aside.innerHTML='<div class="ms-live-portrait"><img alt="Retrato vivo"><span class="ms-live-sigil">◈</span></div><span class="ms-live-kicker">RETRATO VIVO</span><h3 data-live-name>Alma sem nome</h3><p data-live-archetype>Origem ainda não definida.</p><div class="ms-live-chips"></div><div class="ms-live-resources"></div><div class="ms-live-completion"><div><span>Construção</span><b>0%</b></div><i><em></em></i></div><div class="ms-state-readout"></div><button type="button" class="ms-live-next">CONTINUAR CONSTRUÇÃO</button>';
    layout.insertBefore(work,form);work.append(main,aside);main.appendChild(form);
    const journey=document.createElement('nav');journey.id='ms-builder-journey';journey.className='ms-builder-journey hide-on-pdf';journey.setAttribute('aria-label','Jornada de criação');
    journey.innerHTML='<div class="ms-journey-head"><div><span>JORNADA DE DESPERTAR</span><strong>Construa a pessoa antes da potência.</strong></div><button type="button" id="ms-fast-toggle">MODO GUIADO</button></div><div class="ms-journey-steps">'+[
      ['concept','01','Conceito'],['nature','02','Origem'],['class','03','Classe'],['stats','04','Atributos'],['skills','05','Competências'],['powers','06','Poderes'],['equipment','07','Equipamento'],['review','08','Revisão']
    ].map(([id,n,l])=>`<button type="button" data-journey="${id}"><i>${n}</i><span>${l}</span><b>○</b></button>`).join('')+'</div>';
    form.insertBefore(journey,form.firstChild);
    $('#ms-fast-toggle').addEventListener('click',()=>{openCreationWindow(state.fast?'guided':'direct');});
    $$('.ms-journey-steps button',journey).forEach(b=>b.addEventListener('click',()=>goJourney(b.dataset.journey)));
    $('.ms-live-next',aside).addEventListener('click',()=>goJourney(nextIncompleteStep()));
    installBuilderModes();installPlayHUD();installArchivist();work.prepend(journey);openCreationWindow('choice');updateAll();
  }
  function installBuilderModes(){
    const tools=$('.builder-tools');if(!tools||$('#ms-builder-modes'))return;
    const g=document.createElement('div');g.id='ms-builder-modes';g.className='ms-builder-modes';g.innerHTML='<button type="button" data-builder-mode="create">CRIAR</button><button type="button" data-builder-mode="evolve">EVOLUIR</button><button type="button" data-builder-mode="play">JOGAR</button>';
    tools.prepend(g);$$('button',g).forEach(b=>b.addEventListener('click',()=>setBuilderMode(b.dataset.builderMode)));setBuilderMode(state.builderMode||'create',false);
  }
  function installPlayHUD(){
    const layout=$('#pdf-content');if(!layout||$('#ms-play-hud'))return;const p=document.createElement('section');p.id='ms-play-hud';p.className='ms-play-hud hide-on-pdf';layout.insertBefore(p,$('.ms-builder-workbench'));renderPlayHUD();
  }
  function setBuilderMode(mode,act=true){
    if(!['create','evolve','play'].includes(mode))mode='create';state.builderMode=mode;savePrefs();const s=$('#screen-builder');if(s)s.dataset.builderMode=mode;$$('#ms-builder-modes button').forEach(b=>b.classList.toggle('active',b.dataset.builderMode===mode));
    if(act&&mode==='evolve'&&typeof window.openTab==='function')window.openTab('tab-evolution');if(act&&mode==='create'&&typeof window.openTab==='function')window.openTab('tab-identity');if(mode==='play')renderPlayHUD();updateLivePreview();
  }
  function goJourney(step){
    const map={concept:['tab-identity','.ms-concept-panel'],nature:['tab-identity','#nature-grid'],class:['tab-identity','#class-container'],stats:['tab-stats','#theme-stats-container'],skills:['tab-skills','#skills-list'],powers:['tab-powers','#power-selection-panel'],equipment:['tab-equipment','#tab-equipment'],review:[null,null]};
    state.journeyStep=step;if(step!=='review')$('#ms-journey-review')?.remove();updateArchivist();if(step==='review'){showJourneyReview();return;}setBuilderMode(step==='evolution'?'evolve':'create',false);const [tab,target]=map[step]||map.concept;if(tab&&typeof window.openTab==='function')window.openTab(tab);setTimeout(()=>$(target)?.scrollIntoView({behavior:state.level==='functional'?'auto':'smooth',block:'center'}),30);
  }
  const ARCHIVIST={
    concept:['Quem você quer interpretar?','Comece com uma ideia e um nome provisório. Origem, vínculos e motivação podem ser aprofundados depois.','Experimente: uma pessoa que precisa proteger alguém, descobrir uma verdade ou reparar uma escolha. Isso é uma inspiração narrativa, não um bônus.'],
    nature:['De onde vem sua singularidade?','Leia a categoria fundamental e as origens disponíveis. Compare o estilo, os benefícios e os custos antes de escolher.','As opções disponíveis seguem seu mundo e seus acessos. A ficha ao lado mostra a escolha confirmada e identifica quando você apenas consulta uma prévia.'],
    class:['Como você age no mundo?','Compare as classes e suas capacidades. A escolha pode preencher atributos e perícias iniciais.','Use os detalhes dos cards: pontos fortes, limitações e exemplo de personagem. Se voltar para outra origem, revise as escolhas dependentes.'],
    stats:['O que você consegue fazer?','Confira os atributos e recursos derivados. Use os símbolos de informação para entender a origem dos valores.','Observe o saldo de pontos e as regras da opção escolhida. O guia não distribui pontos nem autoriza evolução.'],
    skills:['O que você aprendeu?','Registre as competências adequadas ao conceito e confira os benefícios da categoria.','Pense em uma cena: investigar um local, ajudar um aliado ou enfrentar uma ameaça. Consulte a regra antes de escolher o grau.'],
    powers:['Como o extraordinário se manifesta?','Confira efeito, custo, teste e alcance. Só acrescente o que as regras da sua ficha permitem.','O exemplo narrativo ajuda a imaginar a ação; custo e funcionamento permanecem nos campos da ficha. Você pode revisar esta etapa sem acrescentar poderes.'],
    equipment:['O que você leva consigo?','Selecione recursos iniciais autorizados e registre a função de cada equipamento.','Considere a campanha e as regras de acesso. O tutorial não concede itens, moeda ou permissões.'],
    review:['Sua história está tomando forma','Confira as pendências e a prévia antes de salvar. Você pode voltar a qualquer etapa.','Salvar usa a validação e a persistência existentes. Uma revisão sem avisos não substitui as regras específicas da campanha.']
  };
  function openCreationWindow(kind){
    const screen=$('#screen-builder'),work=$('.ms-builder-workbench');if(!screen||!work)return;
    if(!$('#ms-creation-choice')){const choice=document.createElement('section');choice.id='ms-creation-choice';choice.className='hide-on-pdf';choice.innerHTML='<h2>Como deseja criar sua ficha?</h2><p>Escolha uma janela. Você pode mudar depois sem perder as escolhas.</p><button type="button" data-creation="guided">Criação acompanhada · O Arquivista</button><button type="button" data-creation="direct">Criação direta · Todas as ferramentas</button>';screen.querySelector('.builder-header').after(choice);choice.querySelectorAll('[data-creation]').forEach(b=>b.onclick=()=>openCreationWindow(b.dataset.creation));for(const mode of ['guided','direct']){const win=document.createElement('section');win.id='ms-creation-'+mode;win.className='ms-creation-window';win.setAttribute('aria-label',mode==='guided'?'Criação acompanhada':'Criação direta');const back=document.createElement('button');back.type='button';back.textContent='Trocar forma de criação';back.onclick=()=>openCreationWindow('choice');win.appendChild(back);screen.appendChild(win);}}
    const mode=['guided','direct'].includes(kind)?kind:'choice';screen.dataset.creationWindow=mode;$('#ms-creation-choice').hidden=mode!=='choice';for(const key of ['guided','direct'])$('#ms-creation-'+key).hidden=mode!==key;
    if(mode!=='choice'){const win=$('#ms-creation-'+mode);win.appendChild($('#pdf-content'));state.fast=mode==='direct';setBuilderMode('create',false);applyPrefs();updateArchivist();}else $('#pdf-content').hidden=true;
    if(mode!=='choice')$('#pdf-content').hidden=false;
  }
  function installArchivist(){
    const journey=$('#ms-builder-journey');if(!journey||$('#ms-archivist'))return;
    const welcome=document.createElement('section');welcome.className='ms-journey-welcome hide-on-pdf';welcome.innerHTML='<span>UM NOME. UMA ESCOLHA. UMA HISTÓRIA.</span><h2>Jornada de Despertar</h2><p>Construa sua alma, uma decisão por vez. Seu mundo já está selecionado; as opções abaixo acompanham suas regras.</p><div><button type="button" data-guide-start> Criar com orientação </button><button type="button" data-guide-direct>Criar diretamente</button><button type="button" data-guide-preview>Ver minha ficha</button></div><small>Rascunho automático neste navegador. Ao retornar, use “Continuar de onde parei” quando disponível.</small>';
    journey.before(welcome);welcome.querySelector('[data-guide-start]').onclick=()=>{openCreationWindow('guided');goJourney('concept');};welcome.querySelector('[data-guide-direct]').onclick=()=>{openCreationWindow('direct');};welcome.querySelector('[data-guide-preview]').onclick=()=>window.openCharacterPreview?.();
    const guide=document.createElement('section');guide.id='ms-archivist';guide.className='hide-on-pdf';guide.innerHTML='<div class="ms-archivist-seal" aria-hidden="true">◈</div><div><small>O ARQUIVISTA · ORIENTAÇÃO OPCIONAL</small><h3 tabindex="-1"></h3><p data-guide-copy></p><details><summary>Explicar melhor</summary><p data-guide-more></p></details><div class="ms-guide-actions"><button type="button" data-guide-back>Anterior</button><button type="button" data-guide-next>Continuar</button><button type="button" data-guide-skip>Pular orientação</button></div></div>';
    journey.after(guide);guide.querySelector('[data-guide-skip]').onclick=()=>{openCreationWindow('direct');};for(const [sel,delta] of [['back',-1],['next',1]])guide.querySelector('[data-guide-'+sel+']').onclick=()=>{const keys=Object.keys(ARCHIVIST),index=keys.indexOf(state.journeyStep||'concept');goJourney(keys[Math.max(0,Math.min(keys.length-1,index+delta))]);guide.querySelector('h3').focus({preventScroll:true});};updateArchivist();
  }
  function updateArchivist(){const screen=$('#screen-builder');if(screen){screen.dataset.journeyStep=state.journeyStep||'concept';screen.dataset.journeyGuided=String(!state.fast);}const root=$('#ms-archivist');if(!root)return;const key=state.journeyStep||'concept',copy=ARCHIVIST[key]||ARCHIVIST.concept;root.hidden=!!state.fast;const set=(selector,text)=>{const el=$(selector,root);if(el.textContent!==text)el.textContent=text;};set('h3',copy[0]);set('[data-guide-copy]',copy[1]);set('[data-guide-more]',copy[2]);$('[data-guide-back]',root).disabled=key==='concept';$('[data-guide-next]',root).disabled=key==='review';$$('[data-journey]').forEach(b=>{if(b.dataset.journey===key)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
  function showJourneyReview(){
    setBuilderMode('create',false);window.openTab?.('tab-identity');let root=$('#ms-journey-review');if(!root){root=document.createElement('section');root.id='ms-journey-review';root.className='hide-on-pdf';$('#ms-archivist').after(root);}
    const result=window.validateCurrentCharacterDraft?.()||{errors:[],warnings:[]};const errors=result.errors||[],warnings=result.warnings||[];
    root.innerHTML='<span>REVISÃO DO DESPERTAR</span><h3>'+esc($('#char-name')?.value||'Uma alma por nomear')+'</h3><p>'+esc([currentModeValue(),currentNatureValue(),currentClassValue()].filter(Boolean).join(' · '))+'</p><p>'+ (errors.length?'Resolva as pendências indicadas antes de salvar.':'Revise suas escolhas. A validação final também será executada ao salvar.')+'</p><ul>'+[...errors,...warnings].map(e=>'<li>'+esc(typeof e==='string'?e:e.message||JSON.stringify(e))+'</li>').join('')+'</ul><div><button type="button" data-review-edit>Revisar identidade</button><button type="button" data-review-preview>Ver ficha completa</button><button type="button" data-review-save>Concluir e salvar ficha</button></div>';
    $('[data-review-edit]',root).onclick=()=>{root.remove();goJourney('concept');};$('[data-review-preview]',root).onclick=()=>window.openCharacterPreview?.();$('[data-review-save]',root).onclick=()=>{const form=$('#char-form');if(form)form.requestSubmit();};root.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function journeyStatus(){
    const name=$('#char-name')?.value.trim(),mot=$('#char-motivation')?.value.trim(),nature=currentNatureValue(),cls=currentClassValue();
    const cat=String(window.currentCategory||$('#char-category')?.value||'').trim(); return {concept:!!name,category:!!cat,nature:!!nature,class:!!cls,stats:!!cls,skills:$$('#skills-list .list-item').length>0,powers:$$('#powers-list .list-item').length>0,equipment:$$('#equipment-list .list-item, #equipment-sheet-list .list-item, [data-equipment-id]').length>0,review:!!(name&&cat&&nature&&cls)};
  }
  function nextIncompleteStep(){const s=journeyStatus();return ['concept','nature','class','stats','skills','powers','equipment','review'].find(k=>!s[k])||'review';}
  function updateJourney(){
    const s=journeyStatus();let done=0,total=0;$$('[data-journey]').forEach(b=>{const k=b.dataset.journey;total++;if(s[k])done++;b.classList.toggle('done',!!s[k]);$('b',b).textContent=s[k]?'✓':'○';});return Math.round(done/Math.max(1,total)*100);
  }
  function updateLivePreview(){
    const a=$('#ms-character-live-preview');if(!a)return;const name=$('#char-name')?.value.trim()||'Alma sem nome',nature=currentNatureValue(),cls=currentClassValue();
    const visibleClass=$('#class-grid .archetype-card h4')?.textContent?.trim()||'';const previewing=!!(visibleClass&&visibleClass!==cls);const visualClass=previewing?visibleClass:cls;
    const art=window.MS_ARCHETYPE_ART?.get(visualClass||nature,visualClass?'class':'nature');const avatar=!previewing?$('#avatar-preview-container img')?.src:'';const img=$('.ms-live-portrait img',a);const nextSrc=avatar||art?.image||'';if(img){if(nextSrc&&img.src!==new URL(nextSrc,document.baseURI).href)img.src=nextSrc;img.style.display=nextSrc?'block':'none';}
    $('[data-live-name]',a).textContent=previewing?`Prévia · ${visibleClass}`:name;$('[data-live-archetype]',a).textContent=previewing?`${nature||'Origem pendente'} · escolha ainda não confirmada`:[nature,cls].filter(Boolean).join(' · ')||'Origem ainda não definida.';
    const guide=GUIDES[visualClass]||GUIDES[nature]||{};$('.ms-live-chips',a).innerHTML=`${previewing?'<span>NÃO CONFIRMADO</span>':''}${guide.style?`<span>${esc(guide.style)}</span>`:''}${guide.complexity?`<span>Complexidade ${'◆'.repeat(guide.complexity)}</span>`:''}`;
    const ghostAttrs=previewing?$$('#class-grid .archetype-attr-strip span').map(x=>({name:$('b',x)?.textContent||'',value:x.textContent.replace($('b',x)?.textContent||'','').trim()})):[];
    const rs=ghostAttrs.length?ghostAttrs.slice(0,4):$$('.res-box').map(box=>({name:$('h4',box)?.textContent||'',value:$('.res-val-input',box)?.value||$('.res-val-input',box)?.placeholder?.replace('Base: ','')||'—'})).slice(0,4);$('.ms-live-resources',a).innerHTML=rs.map(r=>`<div><span>${esc(r.name)}</span><b>${esc(r.value)}</b></div>`).join('')||'<small>Os recursos aparecerão após a escolha da origem.</small>';
    const pc=updateJourney();$('.ms-live-completion b',a).textContent=pc+'%';$('.ms-live-completion em',a).style.width=pc+'%';$('.ms-live-next',a).textContent=pc>=100?'REVISAR E CONCLUIR':'PRÓXIMO · '+($(`[data-journey="${nextIncompleteStep()}"] span`)?.textContent||'Continuar').toUpperCase();
    updateConsequences();if(state.builderMode==='play')renderPlayHUD();
  }

  function renderPlayHUD(){
    const p=$('#ms-play-hud');if(!p)return;const name=$('#char-name')?.value.trim()||'Personagem',nature=currentNatureValue(),cls=currentClassValue();const art=window.MS_ARCHETYPE_ART?.get(cls||nature,cls?'class':'nature');const avatar=$('#avatar-preview-container img')?.src||art?.image||'';
    const resources=$$('.res-box').map(b=>({n:$('h4',b)?.textContent||'',v:$('.res-val-input',b)?.value||$('.res-val-input',b)?.placeholder?.replace('Base: ','')||'—'}));
    const powers=$$('#powers-list .list-item').map((el,i)=>{let o={};try{o=JSON.parse(el.dataset.power||'{}');}catch(_){ }return {...o,_i:i};}).sort((a,b)=>Number(!!b.favorite)-Number(!!a.favorite)).slice(0,6);
    p.innerHTML=`<div class="ms-play-identity">${avatar?`<img src="${esc(avatar)}" alt="">`:''}<div><span>FICHA EM JOGO</span><h3>${esc(name)}</h3><p>${esc([nature,cls].filter(Boolean).join(' · '))}</p></div></div><div class="ms-play-resources">${resources.map(r=>`<button type="button" data-rule-resource="${esc(r.n)}"><span>${esc(r.n)}</span><b>${esc(r.v)}</b></button>`).join('')}</div><div class="ms-play-actions"><div class="ms-play-section-head"><span>AÇÕES / PODERES</span><small>★ favoritos primeiro</small></div>${powers.length?powers.map(x=>`<article><button type="button" class="ms-power-favorite ${x.favorite?'active':''}" data-power-index="${x._i}" aria-label="Favoritar">★</button><strong>${esc(x.name||'Poder')}</strong><p>${esc(x.effect||x.description||'Sem efeito resumido.')}</p><div>${[x.cost&&`Custo: ${x.cost}`,x.test&&`Teste: ${x.test}`,x.range&&`Alcance: ${x.range}`].filter(Boolean).map(v=>`<span>${esc(v)}</span>`).join('')}</div></article>`).join(''):'<p class="empty-state">Nenhum poder registrado. Volte ao modo Criar para anexar ações.</p>'}</div>`;
    $$('[data-rule-resource]',p).forEach(b=>b.addEventListener('click',()=>showResourceRule(b.dataset.ruleResource)));
    $$('.ms-power-favorite',p).forEach(b=>b.addEventListener('click',()=>togglePowerFavorite(Number(b.dataset.powerIndex))));
  }
  function togglePowerFavorite(index){const el=$$('#powers-list .list-item')[index];if(!el)return;let p={};try{p=JSON.parse(el.dataset.power||'{}');}catch(_){return;}p.favorite=!p.favorite;el.dataset.power=JSON.stringify(p);enhancePowerFavorites();renderPlayHUD();window.MS_ONLINE_UI?.saveBuilderDraft?.();}
  function enhancePowerFavorites(){
    $$('#powers-list .list-item').forEach((el,i)=>{let p={};try{p=JSON.parse(el.dataset.power||'{}');}catch(_){ }let b=$('.ms-power-favorite',el);if(!b){b=document.createElement('button');b.type='button';b.className='ms-power-favorite';b.setAttribute('aria-label','Favoritar poder para a ficha em jogo');b.textContent='★';el.insertBefore(b,el.firstChild);}b.dataset.powerIndex=String(i);if(b.classList.contains('active')!==!!p.favorite)b.classList.toggle('active',!!p.favorite);});
  }

  function guideFor(name){return GUIDES[name]||{style:'Especialização autoral',complexity:3,good:'Use os recursos centrais da opção para criar vantagem.',weak:'Observe custos, pré-requisitos e consequências.',pair:'Combine com funções complementares.',avoid:'Evite escolher apenas pela estética.',example:'Defina uma história que explique por que esta opção existe na vida do personagem.'};}
  function enhanceArchetypeCards(root=document){
    $$('.archetype-card',root).forEach(card=>{if($('.ms-archetype-decision',card))return;const name=$('h4',card)?.textContent?.trim();if(!name)return;const g=guideFor(name);const node=document.createElement('div');node.className='ms-archetype-decision';node.innerHTML=`<div class="ms-decision-grid"><span><b>COMO JOGA</b>${esc(g.style)}</span><span><b>COMPLEXIDADE</b>${'◆'.repeat(g.complexity||3)}${'◇'.repeat(5-(g.complexity||3))}</span></div><details><summary>Comparar fantasia e função</summary><div class="ms-decision-details">${g.fantasy?`<p><b>Fantasia:</b> ${esc(g.fantasy)}</p>`:''}<p><b>Você será bom em:</b> ${esc(g.good)}</p><p><b>Você terá dificuldade com:</b> ${esc(g.weak)}</p><p><b>Combina bem com:</b> ${esc(g.pair)}</p><p><b>Evite se:</b> ${esc(g.avoid)}</p><p><b>Exemplo:</b> ${esc(g.example)}</p></div></details>`;const mech=$('.archetype-mechanics',card);mech?mech.before(node):$('.archetype-select-row',card)?.before(node);
      if(state.level==='cinematic'){const portrait=$('.archetype-portrait',card);card.addEventListener('pointermove',e=>{if(!portrait)return;const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;portrait.style.transform=`scale(1.055) translate(${x*-9}px,${y*-7}px)`;});card.addEventListener('pointerleave',()=>{if(portrait)portrait.style.transform='';});}
    });
  }

  function installRuleTransparency(){
    $$('#theme-stats-container .attr-grid>div').forEach(box=>{if($('.ms-rule-info',box))return;const b=document.createElement('button');b.type='button';b.className='ms-rule-info hide-on-pdf';b.textContent='?';b.title='Ver composição do atributo';box.appendChild(b);b.addEventListener('click',e=>{e.stopPropagation();showAttributeRule(box);});});
    $$('.res-box').forEach(box=>{if($('.ms-rule-info',box))return;const b=document.createElement('button');b.type='button';b.className='ms-rule-info hide-on-pdf';b.textContent='?';b.title='Ver composição do recurso';box.appendChild(b);b.addEventListener('click',e=>{e.stopPropagation();showResourceRule($('h4',box)?.textContent||'Recurso');});});
  }
  function baseAttrFor(id){try{const n=currentNatureValue(),c=currentClassValue(),key=id.replace('attr-','');return ruleset?.[currentModeValue()]?.natures?.[n]?.classes?.[c]?.attr?.[key];}catch(_){return undefined;}}
  function showAttributeRule(box){const input=$('input',box),label=$('label',box)?.textContent||'Atributo',current=Number(input?.value||0),base=baseAttrFor(input?.id||''),adjust=Number.isFinite(Number(base))?current-Number(base):null;showRuleModal(label,`<p class="ms-rule-total">Valor atual <b>${current}</b></p>${base!==undefined?`<div class="ms-rule-line"><span>Base da classe</span><b>${base}</b></div><div class="ms-rule-line"><span>Ajuste de criação/evolução</span><b>${adjust>=0?'+':''}${adjust}</b></div>`:'<p>Este valor não possui uma base de classe registrada no construtor.</p>'}<small>Fonte: classe selecionada + alterações registradas na ficha.</small>`);}
  function resourceFormula(type){
    const vig=Number($('#attr-vig')?.value||0),intel=Number($('#attr-int')?.value||0),pre=Number($('#attr-pre')?.value||0),cls=currentClassValue(),nature=currentNatureValue();const t=String(type||'');
    if(t==='PV')return cls==='Carrasco Cinzento'?`VIG (${vig}) × 10 + 15` : cls==='Esotérico'?`VIG (${vig}) × 10 + 12`:`máx. 5 entre VIG (${vig}) × 10 + 10`;
    if(t.includes('EP')||t.includes('Energia')||t.includes('EE')){if(cls==='Hermético')return '0 — o Hermético usa sua estrutura ritual específica';if(cls==='Esotérico')return `INT (${intel}) × 5 + 15`;if(nature.includes('Designado')||nature.includes('Envolto')||nature.includes('Taumatúrgico'))return `máx(INT ${intel}, PRE ${pre}) × 5 + 15`;return '0 — não é um reservatório base desta origem';}
    if(t.includes('EB')||t.includes('Estamina'))return nature.includes('Carreira')||cls.includes('Mercador')?`6 + VIG (${vig})`:`VIG (${vig}) × 3 + 5`;
    if(t.includes('Ameaça'))return `VIG (${vig}) + 3`;if(t.includes('DS')||t.includes('ES')||t.includes('Síntese'))return `8 + INT (${intel}) + PRE (${pre}) + 1`;
    if(t.includes('CO')||t.includes('Decadência')||t.includes('Assimilação'))return 'Começa em 0 e muda por consequências de jogo.';if(t.includes('LHL'))return 'Reserva base: 75. Investimentos permanentes reduzem o disponível.';return 'A base é definida pela natureza/classe ou pelo módulo especializado.';
  }
  function showResourceRule(type){const box=$$('.res-box').find(b=>$('h4',b)?.textContent===type),value=$('.res-val-input',box)?.value||$('.res-val-input',box)?.placeholder?.replace('Base: ','')||'—';showRuleModal(type,`<p class="ms-rule-total">Valor atual <b>${esc(value)}</b></p><div class="ms-rule-formula"><span>COMPOSIÇÃO BASE</span><strong>${esc(resourceFormula(type))}</strong></div><small>Valores podem ser alterados por classe, natureza, evolução, equipamento e regras da mesa.</small>`);}
  function showRuleModal(title,html){let m=$('#ms-rule-modal');if(!m){m=document.createElement('div');m.id='ms-rule-modal';m.className='ms-rule-modal';m.innerHTML='<div><button type="button" class="ms-rule-close">×</button><span>ORIGEM DA REGRA</span><h3></h3><section></section></div>';document.body.appendChild(m);$('.ms-rule-close',m).onclick=()=>m.classList.remove('open');m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');});} $('h3',m).textContent=title;$('section',m).innerHTML=html;m.classList.add('open');}

  function updateConsequences(){
    const vals={assimilation:0,stress:0,corruption:0,recordation:0};$$('.res-val-input').forEach(i=>{const n=(i.dataset.type||'').toLowerCase(),v=Number(String(i.value||'0').replace(',','.'))||0;if(n.includes('assimil'))vals.assimilation=Math.max(vals.assimilation,v);if(n.includes('estresse'))vals.stress=Math.max(vals.stress,v);if(n.includes('corrup')||n.includes('estágio co'))vals.corruption=Math.max(vals.corruption,v);if(n.includes('recorda'))vals.recordation=Math.max(vals.recordation,v);});
    const s=$('#screen-builder');if(!s)return;s.dataset.assimilation=vals.assimilation>=75?'critical':vals.assimilation>=40?'warning':'stable';s.dataset.stress=vals.stress>=75?'critical':vals.stress>=40?'warning':'stable';s.dataset.corruption=vals.corruption>=50||vals.corruption>=3&&currentNatureValue().includes('Envolto')?'critical':vals.corruption>=20||vals.corruption>=1&&currentNatureValue().includes('Envolto')?'warning':'stable';s.dataset.recordation=vals.recordation>=90?'transcendent':vals.recordation>=60?'awake':'dormant';
    const read=$('.ms-state-readout');if(read){const messages=[];if(s.dataset.assimilation!=='stable')messages.push(`<span class="danger">Assimilação ${s.dataset.assimilation==='critical'?'crítica':'em avanço'}</span>`);if(s.dataset.corruption!=='stable')messages.push(`<span class="danger">Ancoragem ontológica ${s.dataset.corruption==='critical'?'instável':'sob pressão'}</span>`);if(s.dataset.recordation==='awake'||s.dataset.recordation==='transcendent')messages.push(`<span class="light">Recordação ${s.dataset.recordation==='transcendent'?'próxima da Transcendência':'desperta'}</span>`);read.innerHTML=messages.join('')||'<span>Estado estável · nenhuma transformação dominante.</span>';}
  }

  function enhanceEvolution(){
    const list=$('#evolution-list');if(!list)return;$$('.ms-evolution-entry',list).forEach(entry=>{if($('.ms-evolution-progress',entry))return;const meta=$('.ms-evolution-meta',entry)?.textContent||'',m=meta.match(/(\d+)\s+sucessos/),n=Number(m?.[1]||0),pct=Math.min(100,n/5*100),authorized=entry.textContent.includes('autorizado');const p=document.createElement('div');p.className='ms-evolution-progress';p.innerHTML=`<span><i style="width:${pct}%"></i></span><b>${authorized?'AVANÇO RECONHECIDO':`${n}/5 PRÁTICAS DE REFERÊNCIA`}</b>`;entry.querySelector('div')?.appendChild(p);});
    const panel=$('.ms-evolution-panel');if(panel){let sum=$('.ms-evolution-summary',panel);if(!sum){sum=document.createElement('div');sum.className='ms-evolution-summary';panel.insertBefore(sum,list);}const entries=$$('.ms-evolution-entry',list),authorized=entries.filter(x=>x.textContent.includes('autorizado')).length;sum.innerHTML=`<span>${entries.length} memórias de prática</span><span>${authorized} avanços reconhecidos</span><span>Histórico preservado por sessão</span>`;}
  }
  function updateNarrativeBrief(){
    const active=$('#screen-builder .tab-content.active');if(!active)return;const id=active.id,world=state.world==='envolto'||state.world==='ordem'?state.world:currentModeValue(),copy=TAB_BRIEFS[world]?.[id]||TAB_BRIEFS[currentModeValue()]?.[id];if(!copy)return;let b=$('.ms-narrative-brief',active);if(!b){b=document.createElement('aside');b.className='ms-narrative-brief hide-on-pdf';active.insertBefore(b,active.firstChild);}b.innerHTML=`<span>${esc(copy[0])}</span><p>${esc(copy[1])}</p>`;
  }

  let updatePending=false;
  function scheduleUpdate(){if(updatePending)return;updatePending=true;requestAnimationFrame(()=>{updatePending=false;if($('#screen-builder')?.classList.contains('active')||$('#screen-builder')?.classList.contains('overlay'))updateAll();});}
  function updateAll(){updateArchivist();setWorld();updateLivePreview();installRuleTransparency();enhanceArchetypeCards();enhancePowerFavorites();enhanceEvolution();updateNarrativeBrief();}
  function wrapGlobals(){
    const wrap=(name,after)=>{const original=window[name];if(typeof original!=='function'||original.__msImmersiveWrapped)return;const fn=function(...args){const out=original.apply(this,args);try{after?.(...args);}catch(e){console.warn('[Imersão]',name,e);}return out;};fn.__msImmersiveWrapped=true;window[name]=fn;};
    wrap('startBuilder',mode=>{setBuilderMode('create',false);state.journeyStep='concept';openCreationWindow('choice');$('#ms-journey-review')?.remove();setWorld(mode,'');setTimeout(()=>{installBuilderWorkbench();updateAll();},0);transition(mode==='exodo'?'ABRINDO DIAGNÓSTICO GENÉTICO':'ABRINDO DOSSIÊ DE RECRUTAMENTO');});
    wrap('selectNature',name=>{setWorld(currentModeValue(),name);scheduleUpdate();let hydrating=false;try{hydrating=typeof isHydratingCharacter!=='undefined'&&isHydratingCharacter;}catch(_){ }if(!hydrating)confirmation('nature',name);});
    wrap('selectClass',(name,skipAutofill)=>{scheduleUpdate();if(!skipAutofill)confirmation('class',name);});
    wrap('openTab',()=>setTimeout(()=>{updateNarrativeBrief();updateLivePreview();},0));
    wrap('recalculateStats',()=>scheduleUpdate());
    wrap('renderEvolutionEntries',()=>setTimeout(enhanceEvolution,0));
    wrap('loadCharacterToBuilder',()=>{openCreationWindow('direct');setTimeout(updateAll,20);});
  }

  function bindGlobal(){
    window.addEventListener('mode:changing',e=>{setWorld(e.detail?.mode||'neutral','');transition(e.detail?.mode==='exodo'?'ÊXODO // ASSIMILAÇÃO':'OCULTATUN // ECOS');});
    window.addEventListener('screen:changing',()=>{if(state.level!=='functional'){document.body.classList.add('ms-screen-changing');setTimeout(()=>document.body.classList.remove('ms-screen-changing'),260);}});
    document.addEventListener('input',e=>{if(e.target.closest?.('#screen-builder'))scheduleUpdate();});document.addEventListener('change',e=>{if(e.target.closest?.('#screen-builder'))scheduleUpdate();});
    document.addEventListener('click',e=>{const f=e.target.closest?.('.ms-power-favorite');if(f&&f.closest('#powers-list')){e.preventDefault();const item=f.closest('.list-item'),index=$$('#powers-list .list-item').indexOf(item);if(index>=0)togglePowerFavorite(index);}});
    const mo=new MutationObserver(muts=>{let relevant=false;for(const m of muts){const t=m.target?.nodeType===1?m.target:m.target?.parentElement;if(!t)continue;if(t.closest?.('#nature-grid,#class-grid,#powers-list,#evolution-list,#avatar-preview-container,#resource-panel')){relevant=true;break;}}if(relevant)scheduleUpdate();});const b=$('#screen-builder');if(b)mo.observe(b,{subtree:true,childList:true,attributes:true,attributeFilter:['class','src']});
  }
  function init(){installExperienceDock();applyPrefs();wrapGlobals();installBuilderWorkbench();bindGlobal();setWorld();updateAll();window.MS_IMMERSION={state,guideFor,setBuilderMode,update:updateAll,playTone};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
