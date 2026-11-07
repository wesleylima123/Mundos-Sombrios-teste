// =====================================================================
// V0.39 — ALQUERINO · LABORATÓRIO DE SÍNTESE / INGREDIENTES / 9 CAMINHOS OFICIAIS
// Conteúdo canônico baseado no Livro Base — Ocultaton: Ecos 1.5.
// =====================================================================
(function(){
    const ALCHEMY_INGREDIENTS = [
      ['água de chuva coletada durante um fenômeno anômalo','R2'],['olho de criatura precognitiva','R3'],['página escrita antes do evento que descreve','R3'],
      ['cristal de memória temporal','R3'],['pena de ave que nunca pousou','R3'],['sangue de alguém que teve déjà-vu anômalo','R2'],
      ['relógio parado em uma morte','R4'],['olho de vidente','R4'],['tinta feita de memória futura','R4'],
      ['fragmento de objeto anômalo destruído','R4'],['sangue de testemunha morta','R4'],['cinza de documento apagado da história','R5'],
      ['segundo ponteiro de relógio que marcou um instante inexistente','R5'],['memória de uma pessoa apagada','R5'],['lágrima de alguém que ainda não morreu','R6'],
      ['fragmento de linha temporal colapsada','R6'],['sangue de viajante temporal','R6'],['fotografia de acontecimento que nunca aconteceu','R6'],
      ['primeiro instante de uma linha temporal','R7'],['último instante de uma linha temporal','R7'],['conhecimento de uma entidade temporal','R7'],
      ['sangue de penitente','R2'],['erva cultivada em local de sofrimento','R2'],['água benta ou equivalente ritual','R2'],
      ['lágrima de pessoa que perdoou seu maior inimigo','R3'],['cinza de confissão','R3'],['flor que cresce sobre sepultura','R2'],
      ['tecido regenerativo anômalo','R4'],['sangue de criatura regenerativa','R4'],['cicatriz voluntariamente reaberta','R3'],
      ['lágrima de criatura sobrenatural','R4'],['coração de animal empático','R4'],['confissão escrita por alguém condenado','R5'],
      ['coração de mártir','R5'],['sangue de três espécies diferentes','R5'],['relíquia de alguém que morreu por outra pessoa','R6'],
      ['tecido de entidade regenerativa Classe B','R6'],['essência vital preservada','R6'],['relíquia de um santo, mártir ou equivalente','R6'],
      ['fragmento de vida primordial','R7'],['sofrimento condenado','R7'],['conceito de perdão','R7'],
      ['pena de entidade celeste','R3'],['cinza de fogo sobrenatural','R2'],['sangue de criatura voadora','R2'],
      ['pena celestial','R3'],['carvão de incêndio anômalo','R3'],['óleo solar','R3'],
      ['osso de entidade alada','R4'],['chama de fenômeno paranormal','R4'],['metal que não projeta sombra','R3'],
      ['sangue de entidade celestial','R5'],['pena de arcanjo','R5'],['fogo de estrela anômala','R5'],
      ['seis penas celestiais diferentes','R6'],['fragmento de estrela','R6'],['lágrima de entidade divina','R6'],
      ['coração de entidade celeste','R6'],['cinza de anjo','R6'],['fragmento de espaço sagrado','R6'],
      ['essência de divindade','R7'],['chama primordial','R7'],['nome verdadeiro de uma entidade celeste','R7'],
      ['corda de execução','R2'],['sangue de alguém condenado injustamente','R3'],['carta do Enforcado','R3'],
      ['objeto de alguém que sacrificou a própria vida','R3'],['sangue de mártir','R3'],['fio de destino','R4'],
      ['poeira de nexo','EX'],['arrependimento','EX'],['mercúrio','EX']
    ].map(([name,rarity],i)=>({id:`ing-${i+1}`,name,rarity}));

    const P = (path,seq,name,cap,cd,effect,ingredients,cost='') => ({id:`${path.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${seq}`,source:'official',path,seq,name,cap,cd,effect,cost,ingredients});
    const OFFICIAL_PATHS = {
      "Profeta": {
        "philosophy": "O futuro não é destino. É uma consequência que ainda não aconteceu.\" O Profeta aprende a perceber o antes e o depois dos acontecimentos, tendo a consciência causal como sua divindade.  * I - O Ouvinte (Cap. 2 / CD 13): Recebe Pré-Cognição menor. Uma vez por cena, pode perguntar ao Mestre: \"Qual é o maior perigo imediato desta situação?\" e receber uma resposta honesta. Ingredientes: Água de chuva anômala (R2); olho de criatura precognitiva (R3); página escrita antes do evento (R3).  * II - O Vidente (Cap. 3 / CD 16): Uma vez por cena: +5 Defesa Passiva contra o primeiro ataque. Pode declarar \"Eu já vi isso\" para repetir um teste de Percepção/Prontidão recém-falhado. Ingredientes: Cristal de memória temporal (R3); pena de ave que nunca pousou (R3); sangue de alguém com déjà-vu anômalo (R2).  * III - O Profeta (Cap. 4 / CD 19): Recebe Pré-Cognição de Combate e +2 em Iniciativa. No início do combate, pode perguntar ao Mestre: quem atacará primeiro, qual inimigo tem maior intenção hostil ou a ação provável de um inimigo. Ingredientes: Relógio parado em uma morte (R4); olho de vidente (R4); tinta de memória futura (R4).  * IV - O Oráculo (Cap. 5 / CD 22): Recebe Pós-Cognição. Gastando 2 ES, pode tocar objeto/local e observar eventos de até 7 dias atrás, podendo fazer uma pergunta sobre a visão. Ingredientes: Fragmento de objeto anômalo destruído (R4); sangue de testemunha morta (R4); cinza de documento apagado (R5).  * V - O Testemunho (Cap. 7 / CD 25): Uma vez por cena, antes de uma ação de um aliado, pode declarar \"Eu sei que isso vai funcionar",
        "nodes": [
          {
            "id": "official-1-1",
            "source": "official",
            "path": "Profeta",
            "seq": 1,
            "name": "O Ouvinte",
            "cap": 2,
            "cd": 13,
            "effect": "Recebe Pré-Cognição menor. Uma vez por cena, pode perguntar ao Mestre: \"Qual é o maior perigo imediato desta situação?\" e receber uma resposta honesta.",
            "cost": "",
            "ingredients": [
              "Água de chuva anômala (R2)",
              "olho de criatura precognitiva (R3)",
              "página escrita antes do evento (R3)"
            ]
          },
          {
            "id": "official-1-2",
            "source": "official",
            "path": "Profeta",
            "seq": 2,
            "name": "O Vidente",
            "cap": 3,
            "cd": 16,
            "effect": "Uma vez por cena: +5 Defesa Passiva contra o primeiro ataque. Pode declarar \"Eu já vi isso\" para repetir um teste de Percepção/Prontidão recém-falhado.",
            "cost": "",
            "ingredients": [
              "Cristal de memória temporal (R3)",
              "pena de ave que nunca pousou (R3)",
              "sangue de alguém com déjà-vu anômalo (R2)"
            ]
          },
          {
            "id": "official-1-3",
            "source": "official",
            "path": "Profeta",
            "seq": 3,
            "name": "O Profeta",
            "cap": 4,
            "cd": 19,
            "effect": "Recebe Pré-Cognição de Combate e +2 em Iniciativa. No início do combate, pode perguntar ao Mestre: quem atacará primeiro, qual inimigo tem maior intenção hostil ou a ação provável de um inimigo.",
            "cost": "",
            "ingredients": [
              "Relógio parado em uma morte (R4)",
              "olho de vidente (R4)",
              "tinta de memória futura (R4)"
            ]
          },
          {
            "id": "official-1-4",
            "source": "official",
            "path": "Profeta",
            "seq": 4,
            "name": "O Oráculo",
            "cap": 5,
            "cd": 22,
            "effect": "Recebe Pós-Cognição. Gastando 2 ES, pode tocar objeto/local e observar eventos de até 7 dias atrás, podendo fazer uma pergunta sobre a visão.",
            "cost": "",
            "ingredients": [
              "Fragmento de objeto anômalo destruído (R4)",
              "sangue de testemunha morta (R4)",
              "cinza de documento apagado (R5)"
            ]
          },
          {
            "id": "official-1-5",
            "source": "official",
            "path": "Profeta",
            "seq": 5,
            "name": "O Testemunho",
            "cap": 7,
            "cd": 25,
            "effect": "Uma vez por cena, antes de uma ação de um aliado, pode declarar \"Eu sei que isso vai funcionar\". Se o aliado falhar, permite uma segunda rolagem.",
            "cost": "",
            "ingredients": [
              "Segundo ponteiro de relógio de instante inexistente (R5)",
              "memória de pessoa apagada (R5)",
              "lágrima de alguém que não morreu (R6)"
            ]
          },
          {
            "id": "official-1-6",
            "source": "official",
            "path": "Profeta",
            "seq": 6,
            "name": "O Visionário",
            "cap": 8,
            "cd": 28,
            "effect": "Pode observar 1 minuto do futuro e alterar uma decisão pessoal. Uma vez por descanso longo (Reescrever Instante): ao ser atingido, retorna sua posição e estado para o início da rodada.",
            "cost": "",
            "ingredients": [
              "Fragmento de linha temporal colapsada (R6)",
              "sangue de viajante temporal (R6)",
              "fotografia de evento inexistente (R6)"
            ]
          },
          {
            "id": "official-1-7",
            "source": "official",
            "path": "Profeta",
            "seq": 7,
            "name": "O Profeta Eterno",
            "cap": 10,
            "cd": 31,
            "effect": "Observa passado, presente e futuros possíveis. Uma vez por sessão, pode perguntar \"Qual acontecimento precisa ocorrer para que X seja possível?\" e receber uma resposta verdadeira.",
            "cost": "",
            "ingredients": [
              "Primeiro instante de uma linha temporal (R7)",
              "último instante de uma linha temporal (R7)",
              "conhecimento de entidade temporal (R7)"
            ]
          }
        ]
      },
      "Penitente": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-2-1",
            "source": "official",
            "path": "Penitente",
            "seq": 1,
            "name": "O Arrependido",
            "cap": 2,
            "cd": 13,
            "effect": "Resistência Emocional +3. Pode reduzir uma condição mental Leve para nenhuma uma vez por cena.",
            "cost": "",
            "ingredients": [
              "Sangue de penitente (R2)",
              "erva de local de sofrimento (R2)",
              "água benta ou equivalente (R2)"
            ]
          },
          {
            "id": "official-2-2",
            "source": "official",
            "path": "Penitente",
            "seq": 2,
            "name": "O Disciplinado",
            "cap": 3,
            "cd": 16,
            "effect": "Imunidade a medo comum e intimidação mundana. Gasta 1 ES para remover condição emocional Leve.",
            "cost": "",
            "ingredients": [
              "Lágrima de pessoa que perdoou inimigo (R3)",
              "cinza de confissão (R3)",
              "flor sobre sepultura (R2)"
            ]
          },
          {
            "id": "official-2-3",
            "source": "official",
            "path": "Penitente",
            "seq": 3,
            "name": "O Flagelado",
            "cap": 4,
            "cd": 19,
            "effect": "Regeneração 2 PV/rodada (não funciona a 0 PV). Pode converter 5 PV perdidos em +2 num teste de Vontade.",
            "cost": "",
            "ingredients": [
              "Tecido regenerativo anômalo (R4)",
              "sangue de criatura regenerativa (R4)",
              "cicatriz reaberta voluntariamente (R3)"
            ]
          },
          {
            "id": "official-2-4",
            "source": "official",
            "path": "Penitente",
            "seq": 4,
            "name": "O Confessor",
            "cap": 5,
            "cd": 22,
            "effect": "Controla emoções (Ação Padrão + 3 ES). Alvo faz Vontade (CD 10 + PRE + 5); falha permite remover medo, acalmar pânico, induzir tristeza ou impedir reação emocional.",
            "cost": "",
            "ingredients": [
              "Lágrima de criatura sobrenatural (R4)",
              "coração de animal empático (R4)",
              "confissão de condenado (R5)"
            ]
          },
          {
            "id": "official-2-5",
            "source": "official",
            "path": "Penitente",
            "seq": 5,
            "name": "O Mártir",
            "cap": 7,
            "cd": 25,
            "effect": "Regeneração 5 PV/rodada. Como Reação + 2 ES (1x/rodada), transfere até 10 PV de dano de um aliado a até 9m para si.",
            "cost": "",
            "ingredients": [
              "Coração de mártir (R5)",
              "sangue de 3 espécies diferentes (R5)",
              "relíquia de sacrifício (R6)"
            ]
          },
          {
            "id": "official-2-6",
            "source": "official",
            "path": "Penitente",
            "seq": 6,
            "name": "O Santo",
            "cap": 8,
            "cd": 28,
            "effect": "Regeneração 10 PV/rodada. Pode restaurar ossos, órgãos e membros. Uma vez por descanso longo (Ressurreição Parcial): traz de volta cadáver morto há até 24h com 1 PV.",
            "cost": "",
            "ingredients": [
              "Tecido regenerativo Classe B (R6)",
              "essência vital preservada (R6)",
              "relíquia de santo/mártir (R6)"
            ]
          },
          {
            "id": "official-2-7",
            "source": "official",
            "path": "Penitente",
            "seq": 7,
            "name": "O Penitente Divino",
            "cap": 10,
            "cd": 31,
            "effect": "O usuário representa a Redenção através do sofrimento. Regenera aliados, restaura corpos e divide o sofrimento (mas não remove o sofrimento sem assumir consequência equivalente).",
            "cost": "",
            "ingredients": [
              "Fragmento de vida primordial (R7)",
              "sofrimento condensado (R7)",
              "conceito de perdão (R7)"
            ]
          }
        ]
      },
      "Arcanjo": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-3-1",
            "source": "official",
            "path": "Arcanjo",
            "seq": 1,
            "name": "A Asas",
            "cap": 2,
            "cd": 13,
            "effect": "Recebe +2 AGI e manifesta asas temporárias (Voo: 12 metros).",
            "cost": "",
            "ingredients": [
              "Pena de entidade celeste (R3)",
              "cinza de fogo sobrenatural (R2)",
              "sangue de criatura voadora (R2)"
            ]
          },
          {
            "id": "official-3-2",
            "source": "official",
            "path": "Arcanjo",
            "seq": 2,
            "name": "O Serafim Menor",
            "cap": 3,
            "cd": 16,
            "effect": "Resistência a fogo 5. Produz fogo angelical (1d6 de dano energético).",
            "cost": "",
            "ingredients": [
              "Pena celestial (R3)",
              "carvão de incêndio anômalo (R3)",
              "óleo solar (R3)"
            ]
          },
          {
            "id": "official-3-3",
            "source": "official",
            "path": "Arcanjo",
            "seq": 3,
            "name": "O Guardião",
            "cap": 4,
            "cd": 19,
            "effect": "Voo: 25 metros. Recebe +3 Defesa Passiva e Fogo angelical causa 2d6.",
            "cost": "",
            "ingredients": [
              "Osso de entidade alada (R4)",
              "chama paranormal (R4)",
              "metal sem sombra (R3)"
            ]
          },
          {
            "id": "official-3-4",
            "source": "official",
            "path": "Arcanjo",
            "seq": 4,
            "name": "O Anjo",
            "cap": 5,
            "cd": 22,
            "effect": "Transformação Angelical (Ação Rápida + 3 ES). Durante a cena: asas, olhos luminosos, RD físico 5, voo 30m e Fogo angelical 3d6.",
            "cost": "",
            "ingredients": [
              "Sangue de entidade celestial (R5)",
              "pena de arcanjo (R5)",
              "fogo de estrela anômala (R5)"
            ]
          },
          {
            "id": "official-3-5",
            "source": "official",
            "path": "Arcanjo",
            "seq": 5,
            "name": "O Serafim",
            "cap": 7,
            "cd": 25,
            "effect": "Transformação completa. Recebe +4 AGI, RD 10 e Fogo Angelical 5d6 (pode emitir rajada de 6m).",
            "cost": "",
            "ingredients": [
              "Seis penas celestiais diferentes (R6)",
              "fragmento de estrela (R6)",
              "lágrima de divindade (R6)"
            ]
          },
          {
            "id": "official-3-6",
            "source": "official",
            "path": "Arcanjo",
            "seq": 6,
            "name": "O Arcanjo",
            "cap": 8,
            "cd": 28,
            "effect": "Velocidade sobrenatural. Uma vez por rodada, realiza Ação de Movimento extra. Fogo angelical 8d6. Pode teleportar-se 18m como Ação Rápida.",
            "cost": "",
            "ingredients": [
              "Coração de entidade celeste (R6)",
              "cinza de anjo (R6)",
              "fragmento de espaço sagrado (R6)"
            ]
          },
          {
            "id": "official-3-7",
            "source": "official",
            "path": "Arcanjo",
            "seq": 7,
            "name": "O Arcanjo Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Torna-se entidade angelológica com aura sagrada. Cria fogo celestial sem reagentes e impõe autoridade conceitual.",
            "cost": "",
            "ingredients": [
              "Essência de divindade (R7)",
              "chama primordial (R7)",
              "nome verdadeiro de entidade celeste (R7)"
            ]
          }
        ]
      },
      "O Enforcado": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-4-1",
            "source": "official",
            "path": "O Enforcado",
            "seq": 1,
            "name": "O Pendurado",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Pode suspender-se em superfícies. Recebe +2 em AGI e vantagem para escapar de contenção.",
            "cost": "",
            "ingredients": [
              "Corda de execução (R2)",
              "sangue de alguém condenado injustamente (R3)",
              "carta do Enforcado (R3)"
            ]
          },
          {
            "id": "official-4-2",
            "source": "official",
            "path": "O Enforcado",
            "seq": 2,
            "name": "O Sacrifício",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Pode transferir 5 PV próprios para conceder +5 em qualquer teste próprio ou de aliado. Utilizável uma vez por cena.",
            "cost": "",
            "ingredients": [
              "Objeto de alguém que sacrificou a própria vida (R3)",
              "sangue de mártir (R3)",
              "fio de destino (R4)"
            ]
          },
          {
            "id": "official-4-3",
            "source": "official",
            "path": "O Enforcado",
            "seq": 3,
            "name": "A Inversão",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Gastando 2 ES, pode inverter uma polaridade durante 1d4 rodadas: cima/baixo (gravidade local para um alvo), atração/repulsão ou direção de movimento. O alvo deve passar em um teste de Reflexos para não perder a ação.",
            "cost": "",
            "ingredients": [
              "Prisma anômalo que não refrata luz (R4)",
              "poeira de nexo magnético (R4)",
              "sangue de criatura Cisma (R3)"
            ]
          },
          {
            "id": "official-4-4",
            "source": "official",
            "path": "O Enforcado",
            "seq": 4,
            "name": "O Espelho",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: O sacrifício reflete o mal. Como Reação, ao ser atingido por um ataque, o Alquerino gasta 3 ES e perde 5 PV adicionais voluntariamente para espelhar o dano total recebido de volta ao agressor.",
            "cost": "",
            "ingredients": [
              "Fragmento de espelho que refletiu uma morte violenta (R4)",
              "corda manchada de sangue (R4)",
              "lágrima de um carrasco (R5)"
            ]
          },
          {
            "id": "official-4-5",
            "source": "official",
            "path": "O Enforcado",
            "seq": 5,
            "name": "O Mártir Invertido",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: Ao cair a 0 PV ou entrar na Condição Grave, pode gastar 5 ES para \"inverter\" a condição com um inimigo a até 9m. O inimigo faz um teste de Fortitude; se falhar, sofre dano equivalente à vida que o Agente recuperou (até o limite de 25% dos PV do Alquerino).",
            "cost": "",
            "ingredients": [
              "Osso de alguém executado de cabeça para baixo (R5)",
              "madeira de forca anômala (R5)",
              "essência de transmutação (R6)"
            ]
          },
          {
            "id": "official-4-6",
            "source": "official",
            "path": "O Enforcado",
            "seq": 6,
            "name": "A Gravidade Morta",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Como Ação Padrão, o Alquerino inverte as regras físicas de uma área (círculo de 18m). Inimigos \"caem\" para o teto, coberturas viram armadilhas. Custo de 5 ES. Duração de uma cena.",
            "cost": "",
            "ingredients": [
              "Cristal de nexo de Cisma (R6)",
              "corda tecida com cabelo de morto-vivo (R6)",
              "lágrima de quem perdeu toda a esperança (R6)"
            ]
          },
          {
            "id": "official-4-7",
            "source": "official",
            "path": "O Enforcado",
            "seq": 7,
            "name": "O Enforcado Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: O Alquerino se torna o princípio da Perspectiva Absoluta. Pode inverter permanentemente uma lei física local ou transformar a maior Vantagem/Imunidade de uma Entidade de Classe A em sua principal Vulnerabilidade.",
            "cost": "",
            "ingredients": [
              "Fio do destino rompido (R7)",
              "o último suspiro de um deus (R7)",
              "conceito de sacrifício absoluto (R7)"
            ]
          }
        ]
      },
      "O Diabo": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-5-1",
            "source": "official",
            "path": "O Diabo",
            "seq": 1,
            "name": "O Tentador",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Ao analisar um alvo por uma rodada, descobre seu maior desejo mundano ou fraqueza psicológica (Vontade anula). Recebe +5 em testes de Diplomacia ou Intimidação contra ele pelo resto da missão.",
            "cost": "",
            "ingredients": [
              "Moeda de ouro roubada de um túmulo (R2)",
              "saliva de um mentiroso compulsivo (R2)",
              "enxofre de fenômeno anômalo (R3)"
            ]
          },
          {
            "id": "official-5-2",
            "source": "official",
            "path": "O Diabo",
            "seq": 2,
            "name": "O Acordo",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Pode selar um \"pacto menor\" gastando 1 ES. Um aliado ganha +1d6 em seu próximo teste, mas o Alquerino ou o aliado sofre 1d6 de dano de Estresse ou Entrópico como pagamento imediato.",
            "cost": "",
            "ingredients": [
              "Contrato rabiscado com sangue (R3)",
              "cinza de documento queimado (R3)",
              "unha de criatura Instintiva (R3)"
            ]
          },
          {
            "id": "official-5-3",
            "source": "official",
            "path": "O Diabo",
            "seq": 3,
            "name": "As Correntes",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Manifesta correntes espirituais invisíveis (Ação Padrão, 3 ES). Um alvo a até 9m deve vencer um teste de Fortitude ou ficar Paralisado por 1d4 rodadas, tomando 2d6 de dano paranormal se tentar forçar a quebra.",
            "cost": "",
            "ingredients": [
              "Elo de corrente de um prisioneiro morto (R4)",
              "chifre de Entidade (R4)",
              "prata derretida em sangue (R3)"
            ]
          },
          {
            "id": "official-5-4",
            "source": "official",
            "path": "O Diabo",
            "seq": 4,
            "name": "O Marionetista",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: Dominação Mental para comandos complexos (Ação Padrão + 3 ES). O alvo deve passar em Vontade (CD 10 + PRE + 5 do Alquerino) ou cumprirá ordens destrutivas por 1 minuto.",
            "cost": "",
            "ingredients": [
              "Cérebro de criatura dominadora (R4)",
              "corda de marionete usada em crime (R4)",
              "lágrima de quem vendeu a alma (R5)"
            ]
          },
          {
            "id": "official-5-5",
            "source": "official",
            "path": "O Diabo",
            "seq": 5,
            "name": "O Desejo Distorcido",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: O Alquerino \"concede um desejo\" a um aliado ou inimigo. O efeito imita qualquer Potência de Capacidade 5, mas sempre carrega uma Maldição equivalente (Ex: cura total do alvo, mas inflige 2 pontos de Decadência ou Dano massivo a quem estiver adjacente).",
            "cost": "",
            "ingredients": [
              "Coração de Entidade de Classe C (R5)",
              "fruto colhido dentro de um Nexo (R5)",
              "gota do sangue do próprio Alquerino (R6)"
            ]
          },
          {
            "id": "official-5-6",
            "source": "official",
            "path": "O Diabo",
            "seq": 6,
            "name": "O Soberano",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Autoridade pactual absurda. O Alquerino pode escravizar temporariamente (1 cena) uma Entidade Consciente (Classe C) ou comandar uma Entidade Regional (Classe B) caso ela falhe em um teste de Vontade.",
            "cost": "",
            "ingredients": [
              "Coroa de rei ou governante esquecido (R6)",
              "cinzas de um pacto quebrado (R6)",
              "sangue de Entidade Regional (R6)"
            ]
          },
          {
            "id": "official-5-7",
            "source": "official",
            "path": "O Diabo",
            "seq": 7,
            "name": "O Diabo Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: Torna-se a própria encarnação do Pacto Abissal. Seus acordos reescrevem a causalidade. O Alquerino pode dominar a Vontade Divina de ameaças globais (Classe A) ou extrair poderes permanentes assinando contratos na própria alma.",
            "cost": "",
            "ingredients": [
              "Conceito de submissão pura (R7)",
              "contrato firmado nos alicerces do Abismo (R7)",
              "essência do primeiro traidor (R7)"
            ]
          }
        ]
      },
      "A Roda da Fortuna": {
        "philosophy": "O acaso é apenas uma matemática caprichosa que os tolos não conseguem calcular. A partir de hoje, sou eu quem gira a roda.\"  * I - O Sortudo (Cap. 2 / CD 13):    * Efeito: Distorção de probabilidade micro. Uma vez por cena, gastando 1 ES, o Alquerino pode rolar novamente qualquer teste seu ou de um aliado próximo e ficar com o melhor resultado.    * Ingredientes: Dado viciado de um apostador assassinado (R2); trevo que cresceu sobre sangue (R3); cinza de bilhete de aposta premiado (R2).  * II - O Azarão (Cap. 3 / CD 16):    * Efeito: Como uma Carga de Reação (1 ES), força um inimigo que acaba de declarar um ataque a rolar 2d20 e ficar com o pior resultado.    * Ingredientes: Objeto considerado amaldiçoado (R3); pelo de animal de mau agouro morto (R3); moeda gasta com ferrugem anômala (R3).  * III - O Ciclo (Cap. 4 / CD 19):    * Efeito: Pode alterar a Potência de Fluxo da realidade. Gastando 2 ES, o Alquerino prolonga a duração de um efeito, Condição (buff ou debuff) por 1d4 rodadas adicionais, ou encurta o efeito inimigo pela mesma quantia.    * Ingredientes: Relógio sem ponteiros (R4); areia de uma ampulheta anômala (R3); sangue de alguém que sobreviveu a múltiplos acidentes mortais (R4).  * IV - A Manipulação (Cap. 5 / CD 22):    * Efeito: \"Ancorar a Sorte",
        "nodes": [
          {
            "id": "official-6-1",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 1,
            "name": "O Sortudo",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Distorção de probabilidade micro. Uma vez por cena, gastando 1 ES, o Alquerino pode rolar novamente qualquer teste seu ou de um aliado próximo e ficar com o melhor resultado.",
            "cost": "",
            "ingredients": [
              "Dado viciado de um apostador assassinado (R2)",
              "trevo que cresceu sobre sangue (R3)",
              "cinza de bilhete de aposta premiado (R2)"
            ]
          },
          {
            "id": "official-6-2",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 2,
            "name": "O Azarão",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Como uma Carga de Reação (1 ES), força um inimigo que acaba de declarar um ataque a rolar 2d20 e ficar com o pior resultado.",
            "cost": "",
            "ingredients": [
              "Objeto considerado amaldiçoado (R3)",
              "pelo de animal de mau agouro morto (R3)",
              "moeda gasta com ferrugem anômala (R3)"
            ]
          },
          {
            "id": "official-6-3",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 3,
            "name": "O Ciclo",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Pode alterar a Potência de Fluxo da realidade. Gastando 2 ES, o Alquerino prolonga a duração de um efeito, Condição (buff ou debuff) por 1d4 rodadas adicionais, ou encurta o efeito inimigo pela mesma quantia.",
            "cost": "",
            "ingredients": [
              "Relógio sem ponteiros (R4)",
              "areia de uma ampulheta anômala (R3)",
              "sangue de alguém que sobreviveu a múltiplos acidentes mortais (R4)"
            ]
          },
          {
            "id": "official-6-4",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 4,
            "name": "A Manipulação",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: \"Ancorar a Sorte\". Por 1 cena inteira (Custo 4 ES), você anula totalmente a margem de Acerto Crítico (20 natural) de qualquer inimigo em um raio de 9 metros. Acertos críticos contra sua equipe tornam-se acertos normais.",
            "cost": "",
            "ingredients": [
              "Roda de máquina que causou um acidente fatal (R4)",
              "sangue de Entidade focada em Cisma (R5)",
              "ficha de cassino feita de osso humano (R4)"
            ]
          },
          {
            "id": "official-6-5",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 5,
            "name": "O Paradoxo",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: Gastando 5 ES como Reação, você transforma instantaneamente um Sucesso Crítico (20) de um inimigo em uma Falha Crítica (1), sofrendo 1 ponto de Estresse pelo choque de dobrar a causalidade local.",
            "cost": "",
            "ingredients": [
              "Fragmento material de um paradoxo local (R5)",
              "lágrima de quem escapou do destino final (R5)",
              "olho de Entidade da Loucura (R6)"
            ]
          },
          {
            "id": "official-6-6",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 6,
            "name": "A Causalidade Fatal",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Você declara um evento banal e improvável (ex: \"A estrutura vai ceder em cima dele\"). O inimigo rola Vontade; se falhar, a Roda da Fortuna ajusta o ambiente para que o evento absurdo e letal ocorra imediatamente, causando dano extremo (Equivalente a Potência Destrutiva Cap 8).",
            "cost": "",
            "ingredients": [
              "Fragmento de um destino não cumprido (R6)",
              "poeira de espaço temporal colapsado (R6)",
              "moeda que consegue cair nas duas faces simultaneamente (R6)"
            ]
          },
          {
            "id": "official-6-7",
            "source": "official",
            "path": "A Roda da Fortuna",
            "seq": 7,
            "name": "A Fortuna Divina",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: O Alquerino se torna o mestre da probabilidade. Ele dita os dados. Pode decretar a probabilidade absoluta de um acontecimento na cena (fazendo algo ser 100% chance de sucesso ou 0% chance de ocorrer), imune ao acaso e à própria entropia.",
            "cost": "",
            "ingredients": [
              "Causalidade engarrafada (R7)",
              "fragmento da primeira roda já inventada (R7)",
              "conceito materializado de \"probabilidade\" (R7)"
            ]
          }
        ]
      },
      "Senhor das Bestas": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-7-1",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 1,
            "name": "O Instinto",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: O Olfato e a intuição animal substituem a razão. O Alquerino recebe +2 permanente em testes de Prontidão e Atletismo, além de faro anômalo para rastrear ferimentos frescos (sangramento) a até 1km.",
            "cost": "",
            "ingredients": [
              "Sangue de predador alfa anômalo (R2)",
              "osso de animal carnívoro triturado (R2)",
              "pelo de criatura de Instinto (R3)"
            ]
          },
          {
            "id": "official-7-2",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 2,
            "name": "A Mutação Menor",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Gastando 1 ES (Ação Rápida), transmuta os próprios braços em patas rasgadoras ou manifesta garras osso-metálicas. Ganha um ataque corpo a corpo (2d6 dano cortante + sangramento que reduz PV no início do turno inimigo).",
            "cost": "",
            "ingredients": [
              "Garra de fera paranormal extraída viva (R3)",
              "dente incisivo de criatura carniceira (R3)",
              "bile ácida (R3)"
            ]
          },
          {
            "id": "official-7-3",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 3,
            "name": "O Predador",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Adquire locomoção aberrante. Ignora terreno difícil e aumenta o salto de forma desumana. Uma vez por rodada, se o Alquerino reduzir um inimigo a 0 PV (ou condição Grave), ele pode gastar 2 ES para realizar um movimento completo e um ataque extra imediatamente.",
            "cost": "",
            "ingredients": [
              "Coração de fera Cisma (R4)",
              "glândula de adrenalina preservada (R3)",
              "carne crua de Entidade (R4)"
            ]
          },
          {
            "id": "official-7-4",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 4,
            "name": "A Casca Aberrante",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: O metabolismo colapsa e se reconstrói. A pele é recoberta por escamas orgânicas invisíveis ou carapaças biológicas sob a derme. Concede RD 5 permanente contra danos físicos e imita Resistência (Fortitude) a venenos.",
            "cost": "",
            "ingredients": [
              "Escama de entidade regional (R4)",
              "carapaça de criatura blindada do abismo (R4)",
              "sangue negro peçonhento (R5)"
            ]
          },
          {
            "id": "official-7-5",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 5,
            "name": "A Quimera",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: Transmutação Orgânica Absoluta (Ação Padrão + 3 ES). O Alquerino vira um monstro por uma cena. Seus atributos Físicos (FOR, AGI) sobem para 6, seus ataques causam 3d8 de dano entrópico/dilacerante, e ele causa Medo Paranormal automático a humanos normais.",
            "cost": "",
            "ingredients": [
              "Essência mista de três linhagens anômalas (R5)",
              "um segundo coração orgânico (R5)",
              "toxina letal purificada (R6)"
            ]
          },
          {
            "id": "official-7-6",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 6,
            "name": "A Cadeia Alimentar",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: O ápice biológico. Recebe Regeneração Brutal (Cura 10 PV por turno). Fica completamente imune a doenças, toxinas ou mutações forçadas. Ataques biológicos contra o Alquerino o curam em vez de causar dano.",
            "cost": "",
            "ingredients": [
              "Tecido tumoral orgânico imortal (R6)",
              "lágrima de fera caçada à beira da extinção (R6)",
              "sangue da primeira aberração registrada (R6)"
            ]
          },
          {
            "id": "official-7-7",
            "source": "official",
            "path": "Senhor das Bestas",
            "seq": 7,
            "name": "O Apex Divino",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: Torna-se a Fera Suprema, o último elo da evolução. O Alquerino sofre \"Adaptação Instantânea\": se for ferido por um tipo de ataque ou energia, torna-se permanentemente imune a ele pelo resto do combate. Pode devorar a Carga Residual de Entidades (Classe B ou A) para assimilar e usar os poderes delas.",
            "cost": "",
            "ingredients": [
              "Fragmento genético primordial não-humano (R7)",
              "conceito puro de \"Evolução\" (R7)",
              "o coração de um Leviatã/Singularidade (R7)"
            ]
          }
        ]
      },
      "Abismo": {
        "philosophy": "",
        "nodes": [
          {
            "id": "official-8-1",
            "source": "official",
            "path": "Abismo",
            "seq": 1,
            "name": "O Vazio Mental",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: A mente do Alquerino se torna estática fria. Ele recebe +2 Permanente em Vontade (PRE) e torna-se imune à leitura de mentes. Qualquer criatura que tente ler seus pensamentos sofre 1d6 de dano de Estresse.",
            "cost": "",
            "ingredients": [
              "Água de um mar sem luz e sem fundo (R2)",
              "pó de osso humano triturado em silêncio (R2)",
              "espelho quebrado na mais absoluta escuridão (R3)"
            ]
          },
          {
            "id": "official-8-2",
            "source": "official",
            "path": "Abismo",
            "seq": 2,
            "name": "A Gravidade Morta",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Manipulação cinética leve. Gastando 1 ES, pode levitar a poucos centímetros do chão, ignorando rastros, fios de armadilha ou placas de pressão. Pode mover objetos a distância de até 5kg.",
            "cost": "",
            "ingredients": [
              "Pedra do epicentro de um nexo (R3)",
              "pena que flutua independentemente do vento (R3)",
              "olho de uma criatura abissal cega (R3)"
            ]
          },
          {
            "id": "official-8-3",
            "source": "official",
            "path": "Abismo",
            "seq": 3,
            "name": "O Tentáculo",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Transfiguração existencial. Manifesta apêndices de pura sombra ou matéria escura do próprio corpo (Ação Rápida, 2 ES). Aumenta o alcance de ataques corpo a corpo e interações físicas em 9 metros. Pode enforcar, arremessar ou empurrar alvos.",
            "cost": "",
            "ingredients": [
              "Ventosa orgânica de monstro inanição (R4)",
              "frasco de vácuo pressurizado (R4)",
              "tinta de kraken ou aberração marinha (R3)"
            ]
          },
          {
            "id": "official-8-4",
            "source": "official",
            "path": "Abismo",
            "seq": 4,
            "name": "A Pressão Cósmica",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: Telecinese destrutiva maciça (Ação Padrão + 3 ES). Seleciona um alvo a 18m; o Alquerino dita que a física local está tentando esmagá-lo. Causa 4d8 de Dano Contundente/Entrópico e o alvo deve passar em Fortitude para não ter ossos/armadura triturados (Condição Moderada).",
            "cost": "",
            "ingredients": [
              "Fragmento de meteorito anômalo (R4)",
              "núcleo denso de Entidade Regional (R4)",
              "silêncio absoluto engarrafado (R5)"
            ]
          },
          {
            "id": "official-8-5",
            "source": "official",
            "path": "Abismo",
            "seq": 5,
            "name": "O Olhar de Lá",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: O Alquerino revela o que existe por trás do Véu (Ação Padrão, 4 ES). Abre os próprios olhos ou o próprio peito para liberar luz de espaço-tempo colapsado. Inimigos em um cone de 9m entram em Catatonia Imediata ou Fuga (Vontade vs CD do Alquerino). Ignora imunidades baseadas em forma.",
            "cost": "",
            "ingredients": [
              "Globo ocular de um Grande Ancião menor (R5)",
              "telescópio anômalo que gravou a entropia final (R5)",
              "fragmento físico de espaço-tempo (R6)"
            ]
          },
          {
            "id": "official-8-6",
            "source": "official",
            "path": "Abismo",
            "seq": 6,
            "name": "O Evento de Horizonte",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Colapso físico localizado. Gastando 6 ES, pode criar um vórtex destrutivo em uma área de 18m de raio. A área tem oxigênio removido, a luz é sugada (Cegueira absoluta) e a gravidade arrasta inimigos para o centro (Velocidade 0), causando dano por cada rodada que permaneçam no buraco negro em miniatura.",
            "cost": "",
            "ingredients": [
              "Luz estagnada extraída do vazio (R6)",
              "sombra viva autônoma (R6)",
              "eco cristalizado do início da existência (R6)"
            ]
          },
          {
            "id": "official-8-7",
            "source": "official",
            "path": "Abismo",
            "seq": 7,
            "name": "A Singularidade Divina",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: Torna-se a Entropia Viva. O corpo físico do Alquerino é apenas uma sugestão. Ele pode, através do toque, apagar conceitos da realidade (ex: apagar uma porta, apagar a gravidade ao redor de um prédio, apagar a memória de que uma Entidade existe, forçando-a a desaparecer).",
            "cost": "",
            "ingredients": [
              "Uma pequena singularidade negra estabilizada (R7)",
              "a escuridão que existia antes da luz (R7)",
              "o conceito manifesto de \"Inexistência\" (R7)"
            ]
          }
        ]
      },
      "Olimpo": {
        "philosophy": "A humanidade nasceu implorando de joelhos por governantes de carne indestrutível e vontade inquestionável. Eu não serei uma aberração. Eu apenas preencherei a vaga de Deus.\"  * I - O Semideus (Cap. 2 / CD 13):    * Efeito: Presença e Herança. O Alquerino recebe +2 Permanente em PRE e VIG. O personagem passa a possuir uma \"Voz do Trovão\", audível e clara através de qualquer barreira sonora, dispensando a necessidade de rolar dados para intimidar humanos de nível civil.    * Ingredientes: Ouro verdadeiro derretido em chamas não-oxidantes (R2); vinho sagrado preservado há séculos (R3); folha de louro intocada pela decadência (R2).  * II - A Perfeição Esculpida (Cap. 3 / CD 16):    * Efeito: Gastando 1 ES (Ação Rápida), assume o traço da Divindade Física. Por 1 cena, sua aparência ofusca a visão de humanos comuns. Recebe +1d6 bônus extra em todas as perícias sociais, e imunidade a aflições de Decadência leve (doenças, lentidão, fraqueza).    * Ingredientes: Sangue puro de um monarca destronado (R3); mármore de estátua anômala (R3); reflexo de espelho perfeitamente límpido (R3).   * III - O Domínio (Cap. 4 / CD 19):    * Efeito: Manipulação conceitual sobre o clima e a matéria. O Alquerino aprende a dominar um elemento clássico. Pode lançar relâmpagos diretos (3d8 Dano de Choque), abrir fendas sísmicas para derrubar inimigos, ou congelar barreiras e áreas (Ação Padrão, 2 ES).    * Ingredientes: Eletricidade capturada dentro de quartzo (R4); terra da base de uma montanha sagrada (R4); água não congelável do fundo do oceano (R3).  * IV - A Égide (Cap. 5 / CD 22):    * Efeito: A aura do Panteão o protege. Ativar a Égide (Ação Padrão, 3 ES) cria um campo de força de luz física (Raio 3m). Todos os aliados adjacentes ao Alquerino ganham RD 10 total (contra dano material e energia) e imunidade a qualquer efeito de Manipulação Mental por 1d4 rodadas.    * Ingredientes: Metal desconhecido (orichalcum) forjado no abismo (R4); sangue dourado ou icor de Entidade Maior (R5); escudo mundano que sobreviveu a cem guerras (R4).  * V - A Ira (Cap. 7 / CD 25):    * Efeito: O comando da Herança absoluta: \"Ajoelhe-se!",
        "nodes": [
          {
            "id": "official-9-1",
            "source": "official",
            "path": "Olimpo",
            "seq": 1,
            "name": "O Semideus",
            "cap": 2,
            "cd": 13,
            "effect": "Efeito: Presença e Herança. O Alquerino recebe +2 Permanente em PRE e VIG. O personagem passa a possuir uma \"Voz do Trovão\", audível e clara através de qualquer barreira sonora, dispensando a necessidade de rolar dados para intimidar humanos de nível civil.",
            "cost": "",
            "ingredients": [
              "Ouro verdadeiro derretido em chamas não-oxidantes (R2)",
              "vinho sagrado preservado há séculos (R3)",
              "folha de louro intocada pela decadência (R2)"
            ]
          },
          {
            "id": "official-9-2",
            "source": "official",
            "path": "Olimpo",
            "seq": 2,
            "name": "A Perfeição Esculpida",
            "cap": 3,
            "cd": 16,
            "effect": "Efeito: Gastando 1 ES (Ação Rápida), assume o traço da Divindade Física. Por 1 cena, sua aparência ofusca a visão de humanos comuns. Recebe +1d6 bônus extra em todas as perícias sociais, e imunidade a aflições de Decadência leve (doenças, lentidão, fraqueza).",
            "cost": "",
            "ingredients": [
              "Sangue puro de um monarca destronado (R3)",
              "mármore de estátua anômala (R3)",
              "reflexo de espelho perfeitamente límpido (R3)"
            ]
          },
          {
            "id": "official-9-3",
            "source": "official",
            "path": "Olimpo",
            "seq": 3,
            "name": "O Domínio",
            "cap": 4,
            "cd": 19,
            "effect": "Efeito: Manipulação conceitual sobre o clima e a matéria. O Alquerino aprende a dominar um elemento clássico. Pode lançar relâmpagos diretos (3d8 Dano de Choque), abrir fendas sísmicas para derrubar inimigos, ou congelar barreiras e áreas (Ação Padrão, 2 ES).",
            "cost": "",
            "ingredients": [
              "Eletricidade capturada dentro de quartzo (R4)",
              "terra da base de uma montanha sagrada (R4)",
              "água não congelável do fundo do oceano (R3)"
            ]
          },
          {
            "id": "official-9-4",
            "source": "official",
            "path": "Olimpo",
            "seq": 4,
            "name": "A Égide",
            "cap": 5,
            "cd": 22,
            "effect": "Efeito: A aura do Panteão o protege. Ativar a Égide (Ação Padrão, 3 ES) cria um campo de força de luz física (Raio 3m). Todos os aliados adjacentes ao Alquerino ganham RD 10 total (contra dano material e energia) e imunidade a qualquer efeito de Manipulação Mental por 1d4 rodadas.",
            "cost": "",
            "ingredients": [
              "Metal desconhecido (orichalcum) forjado no abismo (R4)",
              "sangue dourado ou icor de Entidade Maior (R5)",
              "escudo mundano que sobreviveu a cem guerras (R4)"
            ]
          },
          {
            "id": "official-9-5",
            "source": "official",
            "path": "Olimpo",
            "seq": 5,
            "name": "A Ira",
            "cap": 7,
            "cd": 25,
            "effect": "Efeito: O comando da Herança absoluta: \"Ajoelhe-se!\". Se o Alquerino der uma ordem de dominação a uma Entidade Regional (Classe B) ou Humano, o alvo deve fazer teste de Vontade; se falhar, sua própria biologia o pune pela desobediência, causando Dano Entrópico igual à Potência Destrutiva Cap 7 e forçando-o a se submeter por 1 rodada completa.",
            "cost": "",
            "ingredients": [
              "Fogo mítico original que nunca se apaga (R5)",
              "coração de gigante ou Colosso Abissal (R5)",
              "decreto escrito por um império caído (R6)"
            ]
          },
          {
            "id": "official-9-6",
            "source": "official",
            "path": "Olimpo",
            "seq": 6,
            "name": "O Mito Vivo",
            "cap": 8,
            "cd": 28,
            "effect": "Efeito: Torna-se um conceito mitológico impossível de matar. Uma vez por missão, o Alquerino ganha Imortalidade Causal por 1 cena. Mesmo se reduzido a 0 PV (ou decapitado, esmagado), ele não entra em Estado Moribundo e continua lutando ignorando a Letalidade e a Espiral de Condições. Ao final da cena, ele estabiliza em 1 PV.",
            "cost": "",
            "ingredients": [
              "Icor cristalizado de uma divindade esquecida (R6)",
              "página de um mito transformada em matéria real (R6)",
              "coroa de louros que transforma tudo que toca em perfeição (R6)"
            ]
          },
          {
            "id": "official-9-7",
            "source": "official",
            "path": "Olimpo",
            "seq": 7,
            "name": "O Rei do Panteão",
            "cap": 10,
            "cd": 31,
            "effect": "Efeito: O Alquerino ocupa o trono conceitual. Ele reescreve a realidade para ser o seu \"Reino Divino\" em um raio de quilômetros. Dentro desse reino, ele dita absolutos: \"A Morte não é permitida aqui\", \"Toda ferida cura-se em segundos\" ou \"Fogo não queima\". Suas ordens tornam-se novas Leis Físicas Permanentes enquanto ele dominar o território.",
            "cost": "",
            "ingredients": [
              "Lasca do Trono Conceitual original (R7)",
              "ambrosia ou néctar formador da criação (R7)",
              "a materialização inquestionável da \"Supremacia\" (R7)"
            ]
          }
        ]
      }
    };
        const HIDDEN_PATHS = [];

    const SEQUENCES = [
      ['I','Despertar'],['II','Assimilação'],['III','Transfiguração'],['IV','Ascensão'],['V','Conceito'],['VI','Arquétipo'],['VII','Apoteose']
    ];

    // Canonicaliza os ingredientes usados pelas fórmulas oficiais. Algumas fórmulas
    // históricas carregam a raridade no próprio texto ("Nome (R3)"), enquanto a
    // bancada usa um catálogo com nome + raridade separados. O módulo Alquerino é o
    // proprietário desse contrato e deve aceitar ambas as representações.
    function cleanFormulaIngredientName(value){
      return String(value??'').replace(/\s*\((?:R[1-7]|EX)\)\s*$/i,'').trim();
    }
    function ingredientKey(value){
      return cleanFormulaIngredientName(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    }
    const canonicalIngredientKeys = new Set(ALCHEMY_INGREDIENTS.map(i=>ingredientKey(i.name)));
    const allFormulaIngredientEntries = [...Object.values(OFFICIAL_PATHS).flatMap(x=>x.nodes||[]), ...HIDDEN_PATHS.flatMap(x=>x.nodes||[])];
    allFormulaIngredientEntries.flatMap(n=>n.ingredients||[]).forEach(raw=>{
      const clean = cleanFormulaIngredientName(raw);
      const key = ingredientKey(clean);
      if(!key || canonicalIngredientKeys.has(key)) return;
      const rarity = (String(raw).match(/\((R[1-7]|EX)\)\s*$/i)||[])[1] || 'EX';
      ALCHEMY_INGREDIENTS.push({id:`formula-ing-${ALCHEMY_INGREDIENTS.length+1}`,name:clean,rarity:rarity.toUpperCase()});
      canonicalIngredientKeys.add(key);
    });

    function resolveIngredient(value){
      const raw = cleanFormulaIngredientName(value);
      const key = ingredientKey(raw);
      return ALCHEMY_INGREDIENTS.find(x=>ingredientKey(x.name)===key);
    }

    const state = {
      selectedIngredients: [],
      inventory: {},
      unlocked: [],
      customFormulas: [],
      customPaths: [],
      preparations: []
    };
    ALCHEMY_INGREDIENTS.forEach(i=>state.inventory[i.id]=0);

    function isAlq(){ return currentMode==='ocultatun' && currentNature==='Agente de Carreira (Ocultatun)' && currentClass==='Alquerino'; }
    function esc(v){ return typeof escHtml==='function'?escHtml(String(v??'')):String(v??''); }
    function allNodes(){ return [...Object.values(OFFICIAL_PATHS).flatMap(x=>x.nodes), ...HIDDEN_PATHS.flatMap(x=>x.nodes)]; }
    function ingredientByName(name){ return resolveIngredient(name); }
    function rarityLabel(r){ return ({R1:'Comum',R2:'Incomum',R3:'Anômalo',R4:'Raro',R5:'Singular',R6:'Conceitual',R7:'Divino',EX:'Mencionado'})[r]||r; }
    function selectedIds(){ return state.selectedIngredients.slice(); }
    function selectedNames(){ return selectedIds().map(id=>ALCHEMY_INGREDIENTS.find(x=>x.id===id)?.name).filter(Boolean); }
    function normalizedSet(a){ return a.slice().sort((x,y)=>x.localeCompare(y,'pt-BR')); }
    function exactMatch(node){ const formulaIds=(node.ingredients||[]).map(ingredientByName).filter(Boolean).map(x=>x.id); return normalizedSet(formulaIds).join('|')===normalizedSet(selectedIds()).join('|'); }

    window.switchAlchemyPanel=function(panel){
      document.querySelectorAll('.alchemy-nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.alchemyPanel===panel));
      document.querySelectorAll('.alchemy-panel').forEach(p=>p.classList.toggle('active',p.id===`alchemy-panel-${panel}`));
      if(panel==='paths') renderOfficialPaths();
      if(panel==='formulas') renderAlchemyFormulaLibrary();
      if(panel==='ingredients') renderAlchemyIngredientLibrary();
      if(panel==='forge') renderCustomPathBuilder();
    };

    window.renderAlchemyIngredients=function(){
      const grid=document.getElementById('alchemy-ingredient-grid'); if(!grid)return;
      const q=(document.getElementById('alchemy-ingredient-search')?.value||'').toLowerCase().trim();
      const rf=document.getElementById('alchemy-rarity-filter')?.value||'all';
      grid.innerHTML=ALCHEMY_INGREDIENTS.filter(i=>(rf==='all'||i.rarity===rf)&&(!q||i.name.toLowerCase().includes(q))).map(i=>{
        const qty=Number(state.inventory[i.id]||0), sel=state.selectedIngredients.includes(i.id);
        return `<button type="button" class="ingredient-chip ${sel?'selected':''}" onclick="toggleAlchemyIngredient('${i.id}')"><span class="ingredient-rarity ${i.rarity}">${i.rarity}</span><strong>${esc(i.name)}</strong><small>${rarityLabel(i.rarity)} · posse ${qty}</small></button>`;
      }).join('') || '<div class="alchemy-empty">Nenhum reagente encontrado.</div>';
    };

    window.renderAlchemyIngredientLibrary=function(){
      const grid=document.getElementById('alchemy-ingredient-library'); if(!grid)return;
      const q=(document.getElementById('alchemy-ingredient-library-search')?.value||'').toLowerCase().trim();
      const rf=document.getElementById('alchemy-ingredient-library-filter')?.value||'all';
      grid.innerHTML=ALCHEMY_INGREDIENTS.filter(i=>(rf==='all'||i.rarity===rf)&&(!q||i.name.toLowerCase().includes(q))).map(i=>`<div class="ingredient-library-card"><div><span class="ingredient-rarity ${i.rarity}">${i.rarity}</span><b>${esc(i.name)}</b><small>${rarityLabel(i.rarity)}</small></div><label>Qtd<input type="number" min="0" value="${Number(state.inventory[i.id]||0)}" onchange="setAlchemyIngredientQty('${i.id}',this.value)"></label></div>`).join('') || '<div class="alchemy-empty">Nenhum reagente.</div>';
    };
    window.setAlchemyIngredientQty=function(id,value){ state.inventory[id]=Math.max(0,Number(value)||0); renderAlchemyIngredients(); renderAlchemyIngredientLibrary(); renderCombinationVessel(); };
    window.__ALCHEMY_INGREDIENT_IDS=ALCHEMY_INGREDIENTS.map(i=>i.id);
    window.__setAlchemyBulkQty=function(op,n){ const q=Math.max(0,Number(n)||0); ALCHEMY_INGREDIENTS.forEach(i=>{ const cur=Math.max(0,Number(state.inventory[i.id]||0)); state.inventory[i.id]=op==='add'?cur+q:op==='sub'?Math.max(0,cur-q):q; }); renderAlchemyIngredients(); renderAlchemyIngredientLibrary(); renderCombinationVessel(); };
    window.toggleAlchemyIngredient=function(id){
      const idx=state.selectedIngredients.indexOf(id);
      if(idx>=0) state.selectedIngredients.splice(idx,1);
      else if(state.selectedIngredients.length<3) state.selectedIngredients.push(id);
      else return alert('A câmara de combinação comporta exatamente três reagentes.');
      renderAlchemyIngredients(); renderCombinationVessel(); renderCustomPathBuilder();
    };
    window.clearAlchemyCombination=function(){ state.selectedIngredients=[]; renderAlchemyIngredients(); renderCombinationVessel(); renderCustomPathBuilder(); };
    function renderCombinationVessel(){
      document.querySelectorAll('#alchemy-panel-bench .reagent-flask').forEach((f,i)=>{const id=state.selectedIngredients[i];const ing=id&&ALCHEMY_INGREDIENTS.find(x=>x.id===id);f.classList.toggle('filled',!!ing);f.querySelector('.flask-bulb b').textContent=ing?ing.rarity:'+';f.querySelector('.flask-bulb small').textContent=ing?ing.name:'vazio';});
      const c=document.getElementById('alchemy-free-reagent-count'); if(c)c.textContent=`${state.selectedIngredients.length}/3`;
      const cap=Number(document.getElementById('alchemy-free-cap')?.value||1), comp=Number(document.getElementById('alchemy-free-complexity')?.value||0); const cd=document.getElementById('alchemy-free-cd'); if(cd)cd.textContent=String(10+cap+comp);
    }
    function canPrepare(){ const int=Number(document.getElementById('attr-int')?.value||0), grau=Number(document.getElementById('spec-alquerino-ocultismo-grau')?.value||0); return state.preparations.length < (int+grau); }
    window.combineAlchemyIngredients=function(){
      if(state.selectedIngredients.length!==3) return alert('Selecione três ingredientes para a síntese.');
      const names=selectedNames(); const matches=allNodes().filter(exactMatch); const consume=document.getElementById('alchemy-consume-reagents')?.checked; const insufficient=state.selectedIngredients.filter(id=>(Number(state.inventory[id]||0)<1)); if(consume&&insufficient.length) return alert('A bancada não possui uma unidade de cada reagente selecionado. Ajuste o almoxarifado antes de consumir a mistura.');
      const box=document.getElementById('alchemy-unlocked-formula');
      if(!canPrepare()) return alert('O Alquerino já atingiu o limite de preparos deste descanso longo.');
      if(matches.length){ const m=matches[0]; if(!state.unlocked.includes(m.id))state.unlocked.push(m.id); if(consume)state.selectedIngredients.forEach(id=>state.inventory[id]=Math.max(0,Number(state.inventory[id]||0)-1)); state.preparations.push({id:`prep-${Date.now()}`,type:'Caminho',name:`${m.path} · ${m.name}`,cap:m.cap,insumo:names.join(' + '),note:`Etapa ${m.seq} desbloqueada · CD ${m.cd}`}); box.innerHTML=`<div class="formula-match success"><b>FÓRMULA RECONHECIDA</b><strong>${esc(m.path)} · ${esc(m.name)}</strong><span>Cap. ${m.cap} · CD ${m.cd}${m.cost?' · Custo '+esc(m.cost):''}</span><small>${esc(m.effect)}</small><button type="button" class="souls-btn mini-btn" onclick="switchAlchemyPanel('formulas')">ABRIR FÓRMULA</button></div>`; }
      else { if(consume)state.selectedIngredients.forEach(id=>state.inventory[id]=Math.max(0,Number(state.inventory[id]||0)-1)); box.innerHTML=`<div class="formula-match neutral"><b>SÍNTESE NÃO CATALOGADA</b><strong>Os três reagentes formam um composto livre.</strong><small>${esc(names.join(' + '))}</small><span>Use a Fórmula Livre para registrar o efeito, forma e estabilidade da mistura.</span></div>`; }
      window.currentAlquerinoPreparations=state.preparations; renderAlchemyIngredients(); renderAlchemyIngredientLibrary(); renderCombinationVessel(); renderAlquerinoLab();
    };

    window.renderOfficialPaths=function(){
      const wrap=document.getElementById('alquerino-official-paths'); if(!wrap)return;
      wrap.innerHTML=Object.values(OFFICIAL_PATHS).map(path=>`<article class="official-path-card"><header><div><span class="path-index">✦</span><b>Caminho ${esc(path.nodes[0].path)}</b><small>${esc(path.philosophy)}</small></div><span class="path-count">${path.nodes.filter(n=>state.unlocked.includes(n.id)).length}/7 DESBLOQUEADAS</span></header><div class="path-node-list">${path.nodes.map(n=>`<div class="path-node-card ${state.unlocked.includes(n.id)?'unlocked':''}"><div class="path-node-top"><span>Seq. ${n.seq}</span><b>${esc(n.name)}</b><em>CAP ${n.cap} · CD ${n.cd}</em></div><p>${esc(n.effect)}</p><div class="formula-ingredients">${n.ingredients.map(x=>`<span>${esc(x)}</span>`).join('')}</div><button type="button" class="path-use-btn" onclick="loadFormulaIngredients('${n.id}')">${state.unlocked.includes(n.id)?'FÓRMULA DESBLOQUEADA':'CARREGAR NA CÂMARA'}</button></div>`).join('')}</div></article>`).join('');
      const hidden=document.getElementById('alquerino-hidden-paths'); if(hidden)hidden.innerHTML=HIDDEN_PATHS.map(path=>`<article class="hidden-path-list"><h5>Caminho ${esc(path.path)}</h5><small>${esc(path.note)}</small>${path.nodes.map(n=>`<div class="hidden-node"><div><b>${esc(n.name)}</b><span>Cap. ${n.cap} · CD ${n.cd}</span></div><p>${esc(n.effect)}</p><div class="formula-ingredients">${n.ingredients.map(x=>`<span>${esc(x)}</span>`).join('')}</div><button type="button" class="path-use-btn" onclick="loadFormulaIngredients('${n.id}')">CARREGAR</button></div>`).join('')}</article>`).join('');
    };
    window.loadFormulaIngredients=function(nodeId){ const custom=[...state.customFormulas,...state.customPaths.flatMap(p=>p.nodes||[])]; const n=[...allNodes(),...custom].find(x=>x.id===nodeId); if(!n)return; state.selectedIngredients=(n.ingredients||[]).map(ingredientByName).filter(Boolean).map(x=>x.id); switchAlchemyPanel('bench'); setTimeout(()=>{renderAlchemyIngredients();renderCombinationVessel();},0); };

    window.renderAlchemyFormulaLibrary=function(){
      const grid=document.getElementById('alchemy-formula-library'); if(!grid)return;
      const q=(document.getElementById('alchemy-formula-search')?.value||'').toLowerCase().trim(); const f=document.getElementById('alchemy-formula-filter')?.value||'all';
      const formulas=[...allNodes(),...state.customFormulas,...state.customPaths.flatMap(p=>p.nodes||[])];
      grid.innerHTML=formulas.filter(x=>(f==='all'||(f==='official'&&x.source==='official')||(f==='hidden'&&x.source==='hidden')||(f==='custom'&&x.source==='custom'))&&(!q||`${x.path} ${x.name} ${x.effect} ${x.ingredients.join(' ')}`.toLowerCase().includes(q))).map(x=>`<article class="formula-library-card ${x.source}"><div class="formula-library-head"><span>${x.source==='custom'?'LIVRE':x.source==='hidden'?'OCULTA':'OFICIAL'}</span><b>${esc(x.path)} · ${esc(x.name)}</b><em>CAP ${x.cap} · CD ${x.cd}</em></div><p>${esc(x.effect)}</p><div class="formula-ingredients">${x.ingredients.map(i=>`<button type="button" onclick="loadIngredientByName('${encodeURIComponent(i)}')">${esc(i)}</button>`).join('')}</div><button type="button" class="path-use-btn" onclick="loadFormulaIngredients('${esc(x.id)}')">CARREGAR FÓRMULA</button></article>`).join('') || '<div class="alchemy-empty">Nenhuma fórmula encontrada.</div>';
    };
    window.loadIngredientByName=function(encoded){ const name=decodeURIComponent(encoded); const ing=ingredientByName(name); if(!ing)return; if(state.selectedIngredients.length<3&&!state.selectedIngredients.includes(ing.id)) state.selectedIngredients.push(ing.id); renderAlchemyIngredients(); renderCombinationVessel(); switchAlchemyPanel('bench'); };

    window.saveFreeAlchemyFormula=function(){
      if(!canPrepare())return alert('O limite de preparos deste descanso longo já foi alcançado.');
      if(state.selectedIngredients.length!==3)return alert('Combine três ingredientes antes de gravar uma fórmula livre.'); const consume=document.getElementById('alchemy-consume-reagents')?.checked; const insufficient=state.selectedIngredients.filter(id=>(Number(state.inventory[id]||0)<1)); if(consume&&insufficient.length)return alert('Faltam reagentes no almoxarifado para este preparo.');
      const name=(document.getElementById('alchemy-free-name')?.value||'Fórmula Livre').trim(); const type=document.getElementById('alchemy-free-type')?.value||'Poção'; const form=document.getElementById('alchemy-free-form')?.value||'Líquido'; const cap=Number(document.getElementById('alchemy-free-cap')?.value||1); const complexity=Number(document.getElementById('alchemy-free-complexity')?.value||0); const fn=(document.getElementById('alchemy-free-function')?.value||'').trim(); const stability=(document.getElementById('alchemy-free-stability')?.value||'').trim();
      const f={id:`free-${Date.now()}`,source:'custom',path:'Preparo Livre',seq:'—',name,effect:`${type} em forma de ${form}. Função: ${fn||'a definir'}. Estabilidade: ${stability||'a definir'}. CD ${10+cap+complexity}.`,cap,cd:10+cap+complexity,ingredients:selectedNames(),cost:'ES conforme Potências usadas'}; if(consume)state.selectedIngredients.forEach(id=>state.inventory[id]=Math.max(0,Number(state.inventory[id]||0)-1)); state.customFormulas.push(f); state.unlocked.push(f.id); state.preparations.push({id:f.id,type,name,cap,insumo:selectedNames().join(' + '),note:`Fórmula Livre · ${form} · CD ${f.cd}`}); window.currentAlquerinoPreparations=state.preparations; alert(`Fórmula “${name}” gravada na biblioteca.`); renderAlchemyFormulaLibrary(); renderAlquerinoLab(); };

    window.saveNewAlchemyPathNode=function(){
      if(state.selectedIngredients.length!==3)return alert('Uma nova etapa de Caminho precisa de três ingredientes selecionados na câmara.');
      const path=(document.getElementById('alchemy-new-path-name')?.value||'Caminho Novo').trim(); const philosophy=(document.getElementById('alchemy-new-path-philosophy')?.value||'').trim(); const seq=Number(document.getElementById('alchemy-new-path-seq')?.value||1); const cap=Number(document.getElementById('alchemy-new-path-cap')?.value||1); const cd=Number(document.getElementById('alchemy-new-path-cd')?.value||10+cap); const name=(document.getElementById('alchemy-new-path-ability')?.value||`Etapa ${seq}`).trim(); const effect=(document.getElementById('alchemy-new-path-effect')?.value||'').trim();
      let item=state.customPaths.find(x=>x.path===path); if(!item){item={path,philosophy,nodes:[],source:'custom'};state.customPaths.push(item);} item.nodes.push({id:`custom-path-${Date.now()}`,source:'custom',path,seq,name,cap,cd,effect,ingredients:selectedNames()}); item.nodes.sort((a,b)=>a.seq-b.seq); state.unlocked.push(item.nodes[item.nodes.length-1].id); renderCustomPathBuilder(); renderAlchemyFormulaLibrary(); alert(`Etapa ${seq} gravada em ${path}.`);
    };
    window.renderCustomPathBuilder=function(){
      const box=document.getElementById('alchemy-new-path-reagents'); if(box)box.innerHTML=selectedNames().map((n,i)=>`<div class="selected-reagent-line"><span>${String.fromCharCode(65+i)}</span><b>${esc(n)}</b><small>${ingredientByName(n)?.rarity||''}</small></div>`).join('')||'<div class="alchemy-empty">Selecione três ingredientes na Câmara de Combinação.</div>';
      const list=document.getElementById('alchemy-custom-path-list'); if(list)list.innerHTML=state.customPaths.map(p=>`<article class="custom-path-card"><header><b>${esc(p.path)}</b><small>${esc(p.philosophy||'')}</small></header>${p.nodes.map(n=>`<div><span>${n.seq} · ${esc(SEQUENCES[n.seq-1]?.[1]||'')}</span><b>${esc(n.name)}</b><p>${esc(n.effect)}</p></div>`).join('')}</article>`).join('')||'<div class="alchemy-empty">Nenhum Caminho novo gravado.</div>';
    };

    function getStats(){ const int=Number(document.getElementById('attr-int')?.value||0), pre=Number(document.getElementById('attr-pre')?.value||0), pat=Number(document.getElementById('spec-alquerino-patamar')?.value||1), grau=Number(document.getElementById('spec-alquerino-ocultismo-grau')?.value||0); return {int,pre,pat,grau,prepMax:int+grau,esMax:8+int+pre+pat}; }
    window.renderAlquerinoLab=function(){
      const tab=document.getElementById('tab-alquerino'), btn=document.getElementById('btn-tab-alquerino'); if(!tab||!btn)return; btn.style.display=isAlq()?'':'none'; tab.style.display=isAlq()?'':'none'; if(!isAlq())return;
      const s=getStats(); document.getElementById('alquerino-prep-capacity').textContent=String(s.prepMax); document.getElementById('alquerino-es-total').textContent=String(s.esMax); document.getElementById('alquerino-fadiga-total').textContent=String(state.fadiga||0);
      renderAlchemyIngredients(); renderAlchemyFormulaLibrary(); renderAlchemyIngredientLibrary(); renderOfficialPaths(); renderCombinationVessel(); renderCustomPathBuilder();
      const list=document.getElementById('alquerino-preparos-list'); if(list)list.innerHTML=state.preparations.length?state.preparations.map((p,i)=>`<article class="prepared-vial"><div class="prepared-vial-icon">⚗</div><div><b>${esc(p.name||p.type||'Preparo')}</b><small>${esc(p.cap?'Cap. '+p.cap:'')}${p.insumo?' · '+esc(p.insumo):''}</small><span>${esc(p.note||'')}</span></div><button type="button" class="hide-on-view" onclick="removeAlquerinoPreparation(${i})">×</button></article>`).join(''):'<div class="alchemy-empty">Nenhuma mistura pronta. Use a Câmara de Combinação e grave uma fórmula.</div>';
    };
    window.removeAlquerinoPreparation=function(i){ if(!isEditMode)return; state.preparations.splice(i,1); window.currentAlquerinoPreparations=state.preparations; renderAlquerinoLab(); };

    const oldPayload=window.buildCharacterPayloadFromBuilder;
    if(typeof oldPayload==='function') window.buildCharacterPayloadFromBuilder=function(){ const payload=oldPayload.apply(this,arguments); payload.alquerino={...(payload.alquerino||{}),patamar:document.getElementById('spec-alquerino-patamar')?.value||'1',ocultismoGrau:Number(document.getElementById('spec-alquerino-ocultismo-grau')?.value||0),inventory:msClone(state.inventory),unlocked:msClone(state.unlocked),customFormulas:msClone(state.customFormulas),customPaths:msClone(state.customPaths),preparacoes:msClone(state.preparations)}; return payload; };

    const oldSelectNature=window.selectNature; if(typeof oldSelectNature==='function') window.selectNature=function(){ const r=oldSelectNature.apply(this,arguments); resetState(); renderAlquerinoLab(); return r; };
    const oldSelectClass=window.selectClass; if(typeof oldSelectClass==='function') window.selectClass=function(){ const r=oldSelectClass.apply(this,arguments); renderAlquerinoLab(); return r; };
    const oldLoad=window.loadCharacterToBuilder;
    if(typeof oldLoad==='function') window.loadCharacterToBuilder=function(){ const r=oldLoad.apply(this,arguments); const sourceArray=arguments[1]||characters, idx=arguments[0], ch=sourceArray[idx], a=ch?.alquerino||{}; resetState(); Object.assign(state.inventory,a.inventory||{}); state.unlocked=Array.isArray(a.unlocked)?msClone(a.unlocked):[]; state.customFormulas=Array.isArray(a.customFormulas)?msClone(a.customFormulas):[]; state.customPaths=Array.isArray(a.customPaths)?msClone(a.customPaths):[]; state.preparations=Array.isArray(a.preparacoes)?msClone(a.preparacoes):[]; const pat=document.getElementById('spec-alquerino-patamar'); const og=document.getElementById('spec-alquerino-ocultismo-grau'); if(pat)pat.value=a.patamar||a.nivel||'1'; if(og)og.value=a.ocultismoGrau??'0'; window.currentAlquerinoPreparations=state.preparations; renderAlquerinoLab(); return r; };
    function resetState(){ state.selectedIngredients=[]; ALCHEMY_INGREDIENTS.forEach(i=>state.inventory[i.id]=0); state.unlocked=[]; state.customFormulas=[]; state.customPaths=[]; state.preparations=[]; window.currentAlquerinoPreparations=state.preparations; }
    const oldToggle=window.toggleEditUI; if(typeof oldToggle==='function')window.toggleEditUI=function(){const r=oldToggle.apply(this,arguments);document.querySelectorAll('#tab-alquerino input,#tab-alquerino select,#tab-alquerino textarea,#tab-alquerino button').forEach(el=>{if(el.classList.contains('alchemy-nav-btn'))return;el.disabled=!isEditMode;});renderAlquerinoLab();return r;};

    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(renderAlquerinoLab,80),{once:true});
    else setTimeout(renderAlquerinoLab,0);
})();

