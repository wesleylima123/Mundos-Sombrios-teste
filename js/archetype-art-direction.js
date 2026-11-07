/* Mundos Sombrios — Direção de Arte de Arquétipos V0.63
   Fonte única dos metadados visuais de naturezas/expansões e classes.
   Não contém regras de jogo; apenas direção visual/editorial.
*/
(function(){
  const N = {
    'Nexo Padrão (Livro Base)': { id:'exo-nexo', family:'bio', icon:'◈', codename:'NEXO // PADRÃO', kicker:'LINHAGEM DE ORIGEM', tone:'Mutação controlada, adaptação, sobrevivência', tag:'GENE ÊXODO', image:'assets/archetypes/natures/exo-nexo.webp' },
    'Arquiteto de Linhagem (Aprimorador)': { id:'exo-aprimorador', family:'lab', icon:'⌬', codename:'LINHAGEM // APRIMORADOR', kicker:'BIOFORJA', tone:'Precisão genética, bancada e engenharia viva', tag:'PROJETO PLAYER', image:'assets/archetypes/natures/exo-aprimorador.webp' },
    'Operador de Sistema (Proj. Player)': { id:'exo-player', family:'cyber', icon:'⌁', codename:'OPERADOR // SISTEMA', kicker:'INTERFACE VIVA', tone:'Sincronia, Matrix Kafra e operações digitais', tag:'KAFRA', image:'assets/archetypes/natures/exo-player.webp' },
    'Classer (Linhagem Herdada)': { id:'exo-classer', family:'predator', icon:'◒', codename:'CLASSER // HERANÇA', kicker:'LINHAGEM HERDADA', tone:'Evolução, instinto e mutações passivas', tag:'LHL', image:'assets/archetypes/natures/exo-classer.webp' },
    'Agente de Carreira (Ocultatun)': { id:'ocu-carreira', family:'military', icon:'▣', codename:'AGENTE // CARREIRA', kicker:'SALA BRANCA', tone:'Treinamento, protocolo e precisão operacional', tag:'OCULTATUN', image:'assets/archetypes/natures/ocu-carreira.webp' },
    'Agente Designado (Ocultatun)': { id:'ocu-designado', family:'occult', icon:'✦', codename:'AGENTE // DESIGNADO', kicker:'ANOMALIA', tone:'Energia paranormal, saturação e risco', tag:'EP', image:'assets/archetypes/natures/ocu-designado.webp' },
    'O Envolto (Horror Cósmico)': { id:'ocu-envolto', family:'cosmic', icon:'⟡', codename:'ENVOLTO // HORROR', kicker:'ESPAÇO FINAL', tone:'Anti-existência, ruído e corrupção ontológica', tag:'13 ÁRVORES', image:'assets/archetypes/natures/ocu-envolto.webp' },
    'A Ordem dos Sete (Alta Glória)': { id:'ocu-ordem', family:'divine', icon:'✧', codename:'ORDEM // ALTA GLÓRIA', kicker:'RECORDAÇÃO', tone:'Milagre, autoridade e leis da criação', tag:'SETE', image:'assets/archetypes/natures/ocu-ordem.webp' }
  };
  const C = {
    'Combatente': {id:'combatente', family:'kinetic', icon:'⚔', call:'A linha de frente que não recua.', shot:'IMPACTO / PRESENÇA', role:'VANGUARDA', token:'GENE BRUTO', image:'assets/archetypes/classes/combatente.webp'},
    'Especialista': {id:'especialista', family:'tactical', icon:'⌁', call:'Transforma o ambiente em vantagem.', shot:'LEITURA / CONTROLE', role:'TÁTICO', token:'SISTEMA', image:'assets/archetypes/classes/especialista.webp'},
    'Sobrevivente': {id:'sobrevivente', family:'stealth', icon:'◌', call:'Some antes que a ameaça perceba.', shot:'EVASÃO / RASTRO', role:'EXPLORADOR', token:'SOBREVIVÊNCIA', image:'assets/archetypes/classes/sobrevivente.webp'},
    'Engenheiro Biológico': {id:'engenheiro-biologico', family:'lab', icon:'⌬', call:'Reescreve organismos sob pressão.', shot:'BIOFORJA / SUPORTE', role:'ENGENHEIRO', token:'DS', image:'assets/archetypes/classes/engenheiro-biologico.webp'},
    'IA Virtudes': {id:'ia-virtudes', family:'angelic', icon:'◇', call:'Protege o receptáculo e estabiliza o campo.', shot:'SUPORTE / PROTEÇÃO', role:'SUPORTE', token:'IA', image:'assets/archetypes/classes/ia-virtudes.webp'},
    'IA Domínios': {id:'ia-dominios', family:'cyber', icon:'◆', call:'Converte arquitetura em arma.', shot:'COMBATE / CONTROLE', role:'EXECUTOR', token:'IA', image:'assets/archetypes/classes/ia-dominios.webp'},
    'IA Principados': {id:'ia-principados', family:'digital', icon:'⌘', call:'Invade sistemas e altera o possível.', shot:'HACKING / REALIDADE', role:'CONTROLADOR', token:'KAFRA', image:'assets/archetypes/classes/ia-principados.webp'},
    'Velocitus Bellator': {id:'velocitus-bellator', family:'velocity', icon:'➳', call:'O corpo chega antes do pensamento.', shot:'VELOCIDADE / PRESSÃO', role:'PREDADOR', token:'LHL', image:'assets/archetypes/classes/velocitus-bellator.webp'},
    'Aeternus Vitalis': {id:'aeternus-vitalis', family:'regeneration', icon:'✚', call:'A carne considera a morte apenas um atraso.', shot:'REGENERAÇÃO / RESILIÊNCIA', role:'TANQUE', token:'LHL', image:'assets/archetypes/classes/aeternus-vitalis.webp'},
    'Mentis Aurorae': {id:'mentis-aurorae', family:'psionic', icon:'☼', call:'Percebe o segundo antes que ele aconteça.', shot:'PERCEPÇÃO / PRECISÃO', role:'ORÁCULO', token:'LHL', image:'assets/archetypes/classes/mentis-aurorae.webp'},
    'Mercador da Morte': {id:'mercador-da-morte', family:'arsenal', icon:'✹', call:'Toda operação começa com um inventário.', shot:'ARSENAL / EXECUÇÃO', role:'OPERADOR', token:'BIO-BATERIA', image:'assets/archetypes/classes/mercador-da-morte.webp'},
    'Carrasco Cinzento': {id:'carrasco-cinzento', family:'executioner', icon:'†', call:'A sentença chega antes da desculpa.', shot:'INTIMIDAÇÃO / FORÇA', role:'CARRASCO', token:'PATAMAR', image:'assets/archetypes/classes/carrasco-cinzento.webp'},
    'Alquerino': {id:'alquerino', family:'alchemy', icon:'⚗', call:'Transforma matéria, fórmula e risco em recurso.', shot:'ALQUIMIA / SÍNTESE', role:'ALQUERINO', token:'CAMINHOS', image:'assets/archetypes/classes/alquerino.webp'},
    'Taumatúrgico': {id:'taumaturgico', family:'arcane', icon:'✦', call:'Canaliza o impossível sem pedir licença.', shot:'EP / EXPLOSÃO', role:'TAUMATURGO', token:'SATURAÇÃO', image:'assets/archetypes/classes/taumaturgico.webp'},
    'Hermético': {id:'hermetico', family:'sigil', icon:'△', call:'A geometria certa faz o horror obedecer.', shot:'RITUAL / CONTROLE', role:'HERMÉTICO', token:'CÓDICE', image:'assets/archetypes/classes/hermetico.webp'},
    'Esotérico': {id:'esoterico', family:'surgery', icon:'✚', call:'A cirurgia termina onde começa a anomalia.', shot:'ENXERTO / HORROR', role:'CIENTISTA', token:'ANOMALIAS', image:'assets/archetypes/classes/esoterico.webp'},
    'O Arauto': {id:'o-arauto', family:'abyss', icon:'◖', call:'A voz que anuncia o fim.', shot:'TERROR / PRESENÇA', role:'ARAUTO', token:'ENVOLTO', image:'assets/archetypes/classes/o-arauto.webp'},
    'O Tocado': {id:'o-tocado', family:'mutation', icon:'◉', call:'A carne aprende com cada golpe.', shot:'ADAPTAÇÃO / RESISTÊNCIA', role:'TOCADO', token:'ENVOLTO', image:'assets/archetypes/classes/o-tocado.webp'},
    'O Condenado': {id:'o-condenado', family:'entropy', icon:'⟂', call:'Quanto mais perto do fim, mais perigoso fica.', shot:'ENTROPIA / RISCO', role:'CONDENADO', token:'ENVOLTO', image:'assets/archetypes/classes/o-condenado.webp'},
    'Inquisidor (A Lança)': {id:'inquisidor', family:'holy-war', icon:'⚜', call:'A Lança desfaz a heresia pela força.', shot:'MILAGRE / ATAQUE', role:'LANÇA', token:'SETE', image:'assets/archetypes/classes/inquisidor.webp'},
    'Intérprete (Os Olhos)': {id:'interprete', family:'seer', icon:'◉', call:'Enxerga as costuras por trás da realidade.', shot:'VISÃO / REVELAÇÃO', role:'OLHOS', token:'SETE', image:'assets/archetypes/classes/interprete.webp'},
    'Sentinela (A Parede)': {id:'sentinela', family:'guardian', icon:'▰', call:'Onde a Parede está, o medo para.', shot:'PROTEÇÃO / RESISTÊNCIA', role:'PAREDE', token:'SETE', image:'assets/archetypes/classes/sentinela.webp'},
    'Juízo (A Voz)': {id:'juizo', family:'judgement', icon:'✦', call:'Uma palavra pode tornar a realidade obediente.', shot:'AUTORIDADE / COMANDO', role:'VOZ', token:'SETE', image:'assets/archetypes/classes/juizo.webp'}
  };
  const classPalettes = {
    kinetic:['#ff5f6d','#ffb347'], tactical:['#55d7ff','#7f9cff'], stealth:['#72a6ff','#b58cff'], lab:['#3ee3b1','#7ab7ff'],
    angelic:['#d5f3ff','#bda8ff'], cyber:['#42f5c7','#8a7bff'], digital:['#f36cff','#5cc9ff'], velocity:['#ffeb66','#ff6b6b'],
    regeneration:['#7dff9e','#b8ff54'], psionic:['#a6b8ff','#72e7ff'], arsenal:['#e4c37a','#ff704d'], executioner:['#8f8a85','#cf6b56'],
    alchemy:['#77f5c8','#d6b66e'], arcane:['#bd7cff','#ff5ad9'], sigil:['#d9c47a','#8eb8ff'], surgery:['#ff5f87','#9cffd9'],
    abyss:['#d4d4d4','#6d4aff'], mutation:['#8eff7a','#ff5f91'], entropy:['#ff7f5c','#bda4ff'], 'holy-war':['#ffe36a','#fff3c6'],
    seer:['#8be9ff','#d2a8ff'], guardian:['#8de6ff','#84a6ff'], judgement:['#ffd15c','#ff8aa8']
  };
  const naturePalettes = {
    bio:['#71ff9b','#5fd9ff'],lab:['#58e1ff','#7cf5c7'],cyber:['#f36cff','#51d8ff'],predator:['#ff9d54','#ff4b7a'],
    military:['#d1d4d8','#9ca3af'],occult:['#b783ff','#6d4aff'],cosmic:['#f7f7ff','#ff426e'],divine:['#ffe46d','#d7f2ff']
  };
  function slug(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
  function hashColorSeed(key){let h=7;for(const ch of key)h=(h*31+ch.charCodeAt(0))>>>0;return h}
  function getPalette(family, isNature){
    const p=(isNature?naturePalettes[family]:classPalettes[family])||['#7aa7ff','#b88cff'];
    return p;
  }
  window.MS_ARCHETYPE_ART={
    nature:N,
    classes:C,
    get(name, type){
      const entry=(type==='expansion'||type==='nature')?N[name]:C[name];
      if(entry){
        const palette=getPalette(entry.family,type==='expansion'||type==='nature');
        const artId=entry.id||slug(name);
        const image=entry.image||((type==='expansion'||type==='nature')?`assets/archetypes/natures/${artId}.svg`:`assets/archetypes/classes/${artId}.svg`);
        return {...entry,palette,slug:artId,image};
      }
      const seed=hashColorSeed(name);const p=['#7aa7ff','#b88cff','#67f5ff','#d6b66e'];
      const artId=slug(name);
      const image=artId?((type==='expansion'||type==='nature')?`assets/archetypes/natures/${artId}.svg`:`assets/archetypes/classes/${artId}.svg`):'';
      return {id:artId,family:'unknown',icon:type==='class'?'◆':'▣',codename:String(name||'').toUpperCase(),kicker:type==='class'?'CLASSE':'EXPANSÃO',tone:'Identidade em descoberta',tag:'ARQUIVO',palette:[p[seed%p.length],p[(seed+1)%p.length]],slug:artId,image};
    }
  };
})();
