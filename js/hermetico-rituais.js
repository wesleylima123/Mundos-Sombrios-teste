/*
 * MUNDOS SOMBRIOS — CÓDICE DE SIMETRIA
 * Os 33 rituais herméticos numerados no Livro Base de Ocultatun: Ecos.
 *
 * Os sigilos abaixo são arte vetorial original do site, construída a partir de
 * motivos herméticos/alquímicos/planetários de tradição histórica (círculos,
 * cruzes, triângulos, astros, órbitas e glifos planetários). Não reproduzem um
 * selo histórico específico e funcionam como identificadores únicos de interface.
 */
(function(){
  const G = (i) => {
    const glyphs = ['☉','☽','☿','♀','♂','♃','♄','♁','☊','☋','△','▽','✶'];
    const glyph = glyphs[(i-1) % glyphs.length];
    const rot = ((i * 29) % 360);
    const sides = 3 + ((i - 1) % 6);
    const r = 27 + ((i * 3) % 8);
    let spokes = '';
    for(let s=0;s<sides;s++){
      const a=(360/sides)*s-90+((i%3)*7);
      const rad=a*Math.PI/180;
      const x=40+Math.cos(rad)*r;
      const y=40+Math.sin(rad)*r;
      spokes += `<line x1="40" y1="40" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`;
    }
    const inner = i%2===0
      ? `<polygon points="40,13 67,57 13,57"/>`
      : `<polygon points="40,13 67,40 40,67 13,40"/>`;
    const orbit = i%3===0
      ? `<ellipse cx="40" cy="40" rx="31" ry="18" transform="rotate(${rot} 40 40)"/>`
      : `<circle cx="40" cy="40" r="${r}"/>`;
    return `<svg class="ritual-sigil-svg" viewBox="0 0 80 80" aria-hidden="true" focusable="false"><g>${orbit}${inner}<g>${spokes}</g><circle cx="40" cy="40" r="5"/><text x="40" y="46" text-anchor="middle">${glyph}</text></g></svg>`;
  };

  const R = (number,name,cap,material,gesture,verbal,save,effect,time) => ({
    id:`herm-${String(number).padStart(2,'0')}`,
    number,name,cap,epCost:cap*2,material,gesture,verbal,save,effect,time,
    sigil:G(number)
  });

  window.HERMETIC_RITUALS = [
    R(1,'Transe da Postura da Morte',2,'Pó de mirra.','Trace uma linha da testa ao umbigo.','Statim in silentio','Vontade (Anula)','O agente para o próprio coração e torna-se invisível para seres vivos e sensores térmicos; +10 em Furtividade. Ao fim sofre 2 de dano de Vigor.','1 Ação Padrão'),
    R(2,'Alfabeto dos Desejos',1,'Agulha de osso e seda negra.','Costure um sigilo na palma da mão.','Voluntas fiat caro','Nenhuma','Concede +5 em um teste social específico. Ao término, o fio rasga a carne e causa 2 de dano físico.','1 Ação Padrão'),
    R(3,'Espelho de Obsidiana',2,'Vidro vulcânico.','Coloque o vidro sobre o olho esquerdo.','Revela quod latet','Nenhuma','Permite ver através de superfícies sólidas em até 18 m por 1 rodada, como se fossem vidro sujo.','1 Ação de Movimento'),
    R(4,'Sopro de Azoth',2,'Mercúrio destilado.','Sopre sobre metal líquido.','Dissolve et coagula','Fortitude (Anula)','Oxida metais mundanos instantaneamente; pode destruir fechaduras ou reduzir em -2 o dano de uma arma inimiga.','1 Ação Padrão'),
    R(5,'Poda de Marte',2,'Espinho de ferro.','Perfurar o músculo do alvo.','Minor ad maior','Nenhuma','Reduz um atributo físico em -2 para aumentar outro em +2 até o fim da cena.','1 Ação Rápida'),
    R(6,'Peso de Saturno',2,'Pó de chumbo.','Desenhe o símbolo de Saturno no calcanhar.','Gravitas me tenet','Fortitude (Anula)','O agente se torna imóvel e impossível de derrubar, recebendo +10 nos testes aplicáveis; deslocamento reduzido à metade.','1 Ação Padrão'),
    R(7,'Vínculo Simpático',1,'Cabelo do alvo.','Amarre em um nó górdio.','Teneo te, cognosco te','Vontade (Anula)','Enquanto o nó persistir, o agente sabe a localização exata do alvo em até 100 m.','1 Ação Padrão'),
    R(8,'Olho de Argus',2,'Lente trincada.','Faça pequenas fendas nas pontas dos dedos.','Vigilo semper','Nenhuma','Olhos nervosos se abrem ao redor do corpo; +5 em Prontidão e o agente não pode ser flanqueado nem surpreendido.','1 Ação Padrão'),
    R(9,'Voz de Metatron',2,'Mel e cinzas.','Unja a garganta.','Comando de uma palavra (ex.: “Cadite!”)','Vontade (Anula)','O alvo deve obedecer a uma ordem de uma palavra ou fica Abalado (-2) por 1 rodada.','1 Ação Padrão'),
    R(10,'Passo de Ícaro',2,'Penas de ave de rapina.','Quebre as penas.','Levitas ex osse','Nenhuma','Triplica distâncias de salto e ignora dano de queda; voo de 24 m/s. Ossos frágeis fazem o agente sofrer +2 de dano contundente.','1 Ação de Movimento'),
    R(11,'Mandíbula de Moloch',3,'Carne crua.','Esfregue carne sobre a gengiva.','Voretis viscera','Reflexos (CD do ritual)','Surgem dentes adicionais; mordida causa 3d8 de dano e o agente recupera 5 PV ao drenar o alvo.','1 Ação Padrão'),
    R(12,'Labirinto de Hécate',4,'Chave enferrujada.','Gire a chave no ar.','Via deest','Vontade (Anula)','O alvo passa a andar em círculos, convencido de estar preso em um labirinto.','1 Ação Padrão'),
    R(13,'Cadeia de Prometeu',5,'Corrente aquecida.','Enrole a corrente no próprio braço.','Vinciare pro te','Fortitude (CD do ritual)','Paralisa um alvo enquanto o agente mantiver o foco, causando 5 de dano por rodada.','1 Ação Padrão'),
    R(14,'Flecha de Eros',4,'Lágrima do agente.','Sopre a lágrima.','Tuus sum, meus es','Vontade (CD do ritual)','O alvo protege o agente obsessivamente por 1d4 rodadas.','1 Ação Padrão'),
    R(15,'Escudo de Aquiles',4,'Azeite e sal.','Unja o peito.','Reflecte malum','Nenhuma','O próximo ataque físico recebido é refletido, devolvendo metade do dano ao agressor.','1 Ação Padrão'),
    R(16,'Fogo de Prometeu',5,'Gordura corporal.','Acenda o indicador.','Ignis interior','Reflexos (CD do ritual)','Cria aura de 3 m que causa 4d6 de dano; o agente ganha 1 nível de fadiga/exaustão.','1 Ação Padrão'),
    R(17,'Gelo de Cócito',5,'Água gelada.','Derrame a água sobre os próprios pés.','Cor rigescit','Fortitude (Anula)','Cone de 6 m causa 3d8 de dano e impõe Lentidão por 1 rodada.','1 Ação Padrão'),
    R(18,'Sussurro de Cassandra',4,'Sangue de cobra.','Toque os ouvidos.','Fatum audio','Nenhuma','Permite refazer a Defesa Ativa; o agente recebe +2 de Estresse.','1 Ação de Reação'),
    R(19,'Mão de Midas',5,'Pó de ouro.','Cubra a mão direita.','Tactus immobilis','Fortitude (Anula)','Transforma matéria em uma crosta cinzenta; pode imobilizar um membro ou objeto pequeno por 1d4 rodadas.','1 Ação Padrão'),
    R(20,'Pele de Nemeia',5,'Couro curtido.','Vista o couro.','Infrangibilis','Nenhuma','Recebe RD 10 contra dano físico mundano até o fim da cena.','1 Ação Padrão'),
    R(21,'Trombeta de Jericó',5,'Chifre ritual.','Sopre o chifre.','Muri cadunt','Fortitude (1/2)','Cone de 9 m causa 5d8 e derruba estruturas fracas.','1 Ação Padrão'),
    R(22,'Olhar de Medusa',4,'Cabeça de serpente.','Encare o alvo.','Lapis fias','Vontade (CD do ritual)','Paralisa o alvo enquanto o agente sustentar o olhar e não realizar outras ações.','1 Ação Padrão'),
    R(23,'Tecelagem de Átropos',7,'Tesoura de prata.','Corte o ar.','Filum secatur','Vontade (CD do ritual)','Corta o fio da vida; causa 7d10 de dano entrópico ignorando armadura.','1 Ação Padrão'),
    R(24,'Balança de Osíris',7,'Pena de avestruz.','Coloque sangue na balança.','Aequitas sanguinis','Fortitude/Vontade (CD do ritual)','Agente e alvo somam seus PV atuais e dividem o total igualmente.','1 Ação Padrão'),
    R(25,'Carruagem de Faetonte',7,'Roda em chamas.','Gire a roda.','Tempus ardet','Nenhuma','Concede 2 Ações Padrão extras; o agente envelhece 10 anos e adquire um Estigma.','1 Ação Rápida'),
    R(26,'Selo de Abraxas',7,'Moeda de duas faces.','Coloque a moeda na língua.','Duo in uno','Nenhuma','Divide a consciência; permite concentrar-se em dois rituais de Capacidade até 5 simultaneamente por 1d4 rodadas.','1 Ação Padrão'),
    R(27,'Porta de Jano',7,'Faca de dois gumes.','Corte o próprio tórax.','Janua patet','Nenhuma','Abre portal de 10 km para este ou outro plano, permitindo atravessar aliados; o agente perde 10 PV no processo ou falha.','1 Ação Padrão'),
    R(28,'Cálice de Hygieia',7,'Cálice com serpente.','Morda a língua.','Venenum medicamen','Fortitude (Anula)','Cura uma toxina ou inflige Paralisia ao tocar o alvo com o cálice.','1 Ação Padrão'),
    R(29,'Espada de Dâmocles',8,'Cabelo e agulha.','Suspenda a agulha.','Metu reges','Nenhuma','Sete lâminas invisíveis surgem, cada uma causando 1d10. Se o alvo agir hostil e todas forem usadas, sofre 7d10 imediatamente.','1 Ação Padrão'),
    R(30,'Transmutação de Ouro',10,'Pepita de ouro e mercúrio.','Ingira ambos.','Aurum sum','Nenhuma','Todos os atributos tornam-se 6 por 1d4 rodadas; depois o corpo colapsa e sofre -5 em todos os atributos por 24 horas.','1 Ação Padrão'),
    R(31,'Coroa de Kether',10,'Coroa de espinhos.','Coloque a coroa.','Rex nullo','Nenhuma','Nega dano físico ao custo de 10 EP por ataque; o agente ganha +1 Decadência por rodada.','1 Ação Rápida'),
    R(32,'Abismo de Da’at',10,'Espelho quebrado.','Abra o nada com o espelho.','Omnia nihil','Vontade (Anula)','Alvos em até 18 m ficam Catatônicos; o agente fica permanentemente cego.','1 Ação Padrão'),
    R(33,'Alfa e Ômega',10,'Ouroboros de ouro.','Desenhe o Ouroboros no ar.','Quod est supra, fiat infra','Especial','Redefine uma lei física local (por exemplo, “sangue queima”) durante a cena; o agente torna-se Moribundo imediatamente.','1 Ação Padrão')
  ];

  window.hermeticRitualById = function(id){
    return (Array.isArray(window.HERMETIC_RITUALS) ? window.HERMETIC_RITUALS.find(r=>r.id===id) : null)
      || (Array.isArray(window.__hermeticCustoms) ? window.__hermeticCustoms.find(r=>r.id===id) : null)
      || null;
  };
})();
