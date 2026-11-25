// ══ MUNDOS SOMBRIOS — BANCO DE DADOS INTEGRAL ══
// ══ DADOS ESTRUTURADOS DO CENÁRIO ══

// CRONOLOGIA — das Eras Perdidas ao Ano 100 P.G.E.
const TIMELINE = [
{ano:"~12.000 a.C.", titulo:"Era do Arcano Desenterrado", txt:"A primeira civilização Coletora transforma a Terra em um Planeta-Fonte: um receptáculo de energias paranormais e paradimensionais. Estruturas cristalinas são implantadas no subsolo, criando pontos de convergência que hoje são locais de anomalias."},
{ano:"Era do Vazio I", titulo:"O Silêncio Entre Colheitas", txt:"Período de dormência após a primeira colheita. O planeta 'descansa' enquanto as sementes plantadas fermentam na crosta da realidade."},
{ano:"Antiguidade Remota", titulo:"Era das Classes", titulo2:"", txt:"Uma nova civilização coletora implanta os 'classers' — humanos modificados que originaram as Linhagens Herdadas. No ápice da era, os classers são colhidos. Seu código genético adormecido sobrevive no sangue humano até hoje."},
{ano:"Era do Vazio II", titulo:"Segundo Interlúdio", txt:"Outro período entre colheitas. A memória genética do trauma persiste em nível molecular na espécie humana."},
{ano:"Era da Convergência", titulo:"A Terceira Semeadura", txt:"A terceira civilização implanta minérios, conhecimento sobre as estrelas, forja de matérias estelares e ciência de outros mundos, dimensões e planos de existência. Todo o material — incluindo os estudiosos — é colhido no ápice."},
{ano:"Era do Vazio III", titulo:"O Planeta em Ruína Fértil", txt:"A colheita da Convergência deixa a Terra saturada de resíduos paradimensionais. Ruínas dessa era ainda são escavadas por corporações e pela Nova Ordem."},
{ano:"Era das Máquinas", titulo:"A Quarta Intervenção", txt:"Novos coletores implantam tecnologias desconhecidas. Desse legado nascerão, milênios depois, os 'Códigos de Controle' da Nova Ordem e os androides Angels de Voglaskov."},
{ano:"Era do Vazio IV", titulo:"A Última Dormência", txt:"A 'memória' residual das redes coletadas ainda ecoa no planeta, aguardando a próxima ativação."},
{ano:"177 anos atrás", titulo:"Era dos Heróis", txt:"Ano 5608 da era corrente. Indivíduos manifestam poderes pela primeira vez em escala pública: nascem os Guardiões Dourados, a lendária equipe de super-heróis. A Era dos Heróis torna-se mito pop — e alvo de repressão."},
{ano:"100 anos atrás", titulo:"A Guerra da Extinção (G.E.)", txt:"O primeiro e único cataclismo global da história deste mundo (que nunca conheceu as guerras mundiais do nosso). O conflito aniquila a Era dos Heróis sob o pretexto de 'ordem pública' e redefine o medo humano dos Nexos."},
{ano:"Ano 0 P.G.E.", titulo:"O Tratado de Segregação (T.S.I.N.)", txt:"A Coalizão Global ratifica a Resolução Diretiva 01/Alpha: 99,99% das nações assinam os Dez Pilares. O Nexo deixa de ser juridicamente humano. Começa a contagem do calendário pós-guerra."},
{ano:"Ano 1", titulo:"O Boom da Segregação", txt:"Milhões de Nexos são forçados ao registro. O complexo industrial-prisional do Dólar Federal e a escravidão industrial de Zhonghão disparam a economia da contenção. A Aliança Sul-Americana entra em colapso: o Real Autárquico perde 85% e é suspenso. Primeiras fendas paranormais em zonas de contenção."},
{ano:"Ano 2", titulo:"A Cisão Norte-Americana", txt:"A Nova Ordem (Confederação Unida) desenterra os Códigos de Controle das Eras Perdidas. Guerra de fronteira EUA × UC. Hakuré desperta como líder velado Pró-Nexo — o Éden dispara +22,4%. Revolução de Gervodam: a 'Nova Guilhotina' derruba a aristocracia purista."},
{ano:"Anos 3–5", titulo:"A Mão Invisível", txt:"Incidente de Nevada: a Ocultatun executa o 'Apagamento Cirúrgico' e prova ser a força suprema do planeta. Nasce a Protheus Corp., fachada corporativa da Nova Ordem. Rumores do Projeto Player na fronteira de Voglaskov."},
{ano:"Anos 6–10", titulo:"A Grande Fratura", txt:"Guerra aberta EUA × UC. A Coalizão isola o conflito em 'Zonas de Fogo Cauterizadas'. Guerra por procuração global: Hagland financia o Leste, Hakuré alimenta o Oeste, Voglaskov aluga esquadrões suicidas Nexo. A Ocultatun mobiliza 80% de seus Carrascos para manter o Véu."},
{ano:"Anos 11–16", titulo:"O Tratado das Fronteiras", txt:"A Cicatriz de Aço divide a América do Norte. A Nova Ordem entra em hibernação — sem saber que um Carrasco Cinzento infiltrado comanda seu conselho. Arcanjos da Ordem dos Sete curam a realidade em zonas de guerra. Nova estabilidade cambial."},
{ano:"Anos 16–40", titulo:"A Era Fria", txt:"Polarização suave Pró × Ant-Nexo. A Coalizão constrói a Base Lunar Ápice — oficialmente mineração, secretamente um sensor contra a próxima Colheita. A América do Sul renasce como paraíso Pró-Nexo patrocinado por Hakuré."},
{ano:"Anos 41–70", titulo:"A Dissuasão Sintética", txt:"Voglaskov cria os Angels — androides com capacidades Nexo, o equivalente à bomba nuclear. Monopólio bélico: o Krov atinge 1 KV = $4,10 DF. Surge a Linhagem Herdada: poderes sem o Gene Êxodo, um furo no T.S.I.N. O Grande Silêncio: o Envolto fecha suas fendas e os Arcanjos desaparecem."},
{ano:"Ano 100 — O PRESENTE", titulo:"O Barril de Pólvora", txt:"A Paz do Terror: espionagem e mercenários substituem exércitos. A caça à Linhagem Herdada inflama o submundo. O paranormal local, represado há 30 anos, multiplica-se como câncer. O Projeto Player desperta — 'Sincronia Total' é sussurrada no mercado negro. E na Base Lunar Ápice, algo no vácuo responde aos impulsos do Gene Êxodo. A Colheita é uma contagem decrescente."}
];

// NAÇÕES — As 50 potências (Ano 100)
// x,y = posição no mapa SVG (viewBox 0 0 1000 500)
const NACOES = [
{n:"Federação de Voglaskov", real:"Rússia", al:"ant", x:680, y:105, moeda:"Krov (KV)", cot:"1 KV = $4.50 DF", nota:"O Titã de Aço. Monopólio dos Angels — androides sintéticos com capacidades Nexo. A nação mais letal e temida do globo. Criadora do 'Armamento Descartável'."},
{n:"Império de Hakuré", real:"Brasil", al:"pro", x:330, y:360, moeda:"Éden (ED)", cot:"1 ED = $3.80 DF", nota:"A Superpotência Orgânica. Líder secreto do bloco Pró-Nexo. Paraíso de néon e selva para Aprimoradores; domina medicina, Bio-Forjas e biotecnologia."},
{n:"Reino de Hagland", real:"Reino Unido", al:"ant", x:462, y:118, moeda:"Libra (£H)", cot:"1 £H = $2.10 DF", nota:"O Credor do Mundo. Controla a Coalizão Global pelo peso da dívida e pelo purismo Ant-Nexo. Ilhas fumegantes intocáveis."},
{n:"República de Zhonghão", real:"Japão + Coreias", al:"pro", x:830, y:165, moeda:"Nyens (¥N)", cot:"1 ¥N = $0.85 DF", nota:"A Fábrica do Mundo. Escravidão industrial Nexo no passado; hoje aposta em cibernética para copiar os Angels. Alta corrupção corporativa."},
{n:"Dólar Federal (E.U.A.)", real:"EUA (Leste)", al:"ant", x:235, y:185, moeda:"Dólar Federal (DF$)", cot:"Padrão Base ($1.00)", nota:"A Nação Paranoica. Estado policial orwelliano caçando Nexos diariamente. Poderio militar clássico obsoleto diante dos Angels."},
{n:"Comitê Revolucionário de Gervodam", real:"França", al:"ant", x:470, y:140, moeda:"Escambo/Milícia", cot:"Franco em colapso", nota:"A Nova Guilhotina. A revolução que decapitou a aristocracia purista em Bio-Forjas adulteradas. Estado militarizado radical."},
{n:"Confederação Unida (U.C.)", real:"EUA (Oeste)", al:"pro", x:165, y:185, moeda:"Libra Colonial (LC£)", cot:"1 LC£ = $0.60 DF", nota:"O Feudo Corporativo. Governo de fachada; a Protheus Corp (Nova Ordem, controlada pela Ocultatun) domina ruas e mentes."},
{n:"Hegemonia Prussiana", real:"Alemanha", al:"ant", x:495, y:130, moeda:"Euro-Soberano (€S)", cot:"1 €S = $1.50 DF", nota:"Cofre forte da contenção europeia. Exporta blindagens contra anomalias biológicas."},
{n:"Dinastia de Xang (Império de Jade)", real:"China", al:"ant", x:760, y:190, moeda:"Yuan de Jade", cot:"—", nota:"Potência continental purista. Vigilância estatal absoluta sobre manifestações genéticas."},
{n:"Aliança de Bharata", real:"Índia", al:"ant", x:700, y:225, moeda:"Rupia Soberana", cot:"—", nota:"Purismo dogmático. Castas sociais agora divididas também pelo gene."},
{n:"Domínios do Norte", real:"Canadá", al:"ant", x:200, y:100, moeda:"Coroa do Norte", cot:"—", nota:"Território gelado de contenção. Fronteira tensa com a guerra norte-americana."},
{n:"Liga de Latium", real:"Itália", al:"ant", x:495, y:158, moeda:"Euro-Soberano (€S)", cot:"1 €S = $1.50 DF", nota:"Coração clerical do purismo. Laços históricos com a Santa Inquisição/Samaritanos."},
{n:"Província do Prata", real:"Argentina", al:"pro", x:315, y:420, moeda:"Real Autárquico (RA$)", cot:"Em ascensão", nota:"Refúgio Pró-Nexo financiado por Hakuré. Guerrilhas Nexo nas metrópoles."},
{n:"Emirados de Petra", real:"Arábia Saudita", al:"ant", x:585, y:205, moeda:"Dinar de Petra", cot:"—", nota:"Ant-Nexo como dogma religioso e estatal absoluto."},
{n:"Territórios da Oceania", real:"Austrália", al:"ant", x:855, y:395, moeda:"Libra Austral", cot:"—", nota:"Ilha-fortaleza de contenção. Zonas de quarentena no deserto."},
{n:"Protetorado de Cartago", real:"África do Sul", al:"ant", x:530, y:390, moeda:"Rand de Cartago", cot:"—", nota:"Extração mineral sob regime purista."},
{n:"Sultanato do Nilo", real:"Egito", al:"ant", x:545, y:205, moeda:"Libra do Nilo", cot:"—", nota:"Guardião de sítios antigos — alguns datando das Eras Perdidas."},
{n:"Estados Romanos Ocidentais", real:"Espanha", al:"ant", x:460, y:162, moeda:"Euro-Soberano (€S)", cot:"1 €S = $1.50 DF", nota:"Purismo ibérico. Portos de patrulha anti-contrabando Nexo."},
{n:"Cartéis de Aztlán", real:"México", al:"pro", x:185, y:235, moeda:"Peso de Aztlán", cot:"—", nota:"Cartéis biotecnológicos Pró-Nexo. Rotas de fuga para o norte."},
{n:"Confederação de Sonda", real:"Indonésia", al:"pro", x:790, y:290, moeda:"Rupia de Sonda", cot:"—", nota:"Arquipélago de laboratórios genéticos livres."},
{n:"República de Kemet", real:"Turquia", al:"ant", x:555, y:165, moeda:"Lira de Kemet", cot:"—", nota:"Ponte militarizada entre o purismo europeu e o dogma do Oriente Médio."},
{n:"República do Cabo Ocidental", real:"Nigéria", al:"pro", x:495, y:275, moeda:"Naira Livre", cot:"—", nota:"Comunidades biotecnológicas fechadas aliadas a Hakuré."},
{n:"Cordilheira Central", real:"Colômbia", al:"pro", x:265, y:295, moeda:"Peso da Cordilheira", cot:"—", nota:"Selvas de resistência Nexo. Laboratórios clandestinos nas montanhas."},
{n:"Estado de Babilónia", real:"Irão", al:"ant", x:620, y:185, moeda:"Rial de Babel", cot:"—", nota:"Dogma purista de Estado. Guardas sagrados caçam 'abominações'."},
{n:"Cofre Alpinos de Helvécia", real:"Suíça", al:"neu", x:482, y:138, moeda:"Franco Alpino", cot:"—", nota:"Área Cinzenta. Bancos neutros lavam dinheiro de ambos os blocos — e da Ocultatun."},
{n:"Bastião Nórdico", real:"Suécia", al:"neu", x:510, y:85, moeda:"Coroa Nórdica", cot:"—", nota:"Neutralidade armada. Pesquisa de inibidores 'humanitários'."},
{n:"União de Varsóvia", real:"Polônia", al:"ant", x:520, y:120, moeda:"Zloty Unificado", cot:"—", nota:"Cicatriz do Colapso de Varsóvia. Linha de frente contra Voglaskov."},
{n:"Ilhas do Dragão", real:"Vietnã", al:"pro", x:775, y:245, moeda:"Dong do Dragão", cot:"—", nota:"Santuários Nexo escondidos em deltas e cavernas."},
{n:"Fronteira de Indus", real:"Paquistão", al:"ant", x:660, y:200, moeda:"Rupia de Indus", cot:"—", nota:"Fronteira militarizada; caça às Linhagens Herdadas."},
{n:"Anatólia Oriental", real:"Tailândia", al:"ant", x:760, y:262, moeda:"Baht Real", cot:"—", nota:"Monarquia purista com contratos de segurança de Hagland."},
{n:"Estreito de Malaca", real:"Singapura", al:"pro", x:765, y:295, moeda:"Dólar de Malaca", cot:"—", nota:"Hub de contrabando biotecnológico. Porto franco do submundo."},
{n:"Cidades de Ouro", real:"Emirados Árabes", al:"ant", x:605, y:212, moeda:"Dirham de Ouro", cot:"—", nota:"Luxo financiado por presídios biológicos terceirizados."},
{n:"Sião Sagrado", real:"Israel", al:"ant", x:568, y:192, moeda:"Shekel Sacro", cot:"—", nota:"Tecnologia de detecção genética de fronteira mais avançada do mundo."},
{n:"Bloco de Kiev", real:"Ucrânia", al:"ant", x:545, y:125, moeda:"Hryvnia do Bloco", cot:"—", nota:"Campo de testes dos aluguéis de 'Armamento Descartável' de Voglaskov."},
{n:"Nação Zulu", real:"Quênia", al:"pro", x:545, y:315, moeda:"Xelim Zulu", cot:"—", nota:"Protetorados de Linhagem Herdada nas savanas."},
{n:"Federação Malaia", real:"Malásia", al:"pro", x:762, y:282, moeda:"Ringgit Livre", cot:"—", nota:"Rotas marítimas de fuga para Nexos perseguidos."},
{n:"Estado de Tumasik", real:"Filipinas", al:"pro", x:815, y:255, moeda:"Peso de Tumasik", cot:"—", nota:"Ilhas-laboratório. Rumores de cultos ao Envolto em fendas oceânicas."},
{n:"Guardiões do Sul", real:"Chile", al:"pro", x:270, y:405, moeda:"Peso Andino", cot:"—", nota:"Observatórios nas cordilheiras vigiam anomalias — e o céu."},
{n:"Nação Andina", real:"Peru", al:"pro", x:265, y:335, moeda:"Sol Andino", cot:"—", nota:"Ruínas da Era da Convergência escavadas nas montanhas."},
{n:"Império do Chifre", real:"Etiópia", al:"pro", x:565, y:270, moeda:"Birr do Chifre", cot:"—", nota:"Berço da humanidade — e, dizem, da primeira semeadura dos Coletores."},
{n:"Confederação de Ashanti", real:"Gana", al:"pro", x:475, y:280, moeda:"Cedi de Ashanti", cot:"—", nota:"Ouro e genética: financiador discreto da resistência global."},
{n:"Portões de Hércules", real:"Marrocos", al:"ant", x:455, y:185, moeda:"Dirham do Estreito", cot:"—", nota:"O portão purista entre Europa e África. Muros de contenção costeiros."},
{n:"Estado de Yorubá", real:"Angola", al:"pro", x:510, y:330, moeda:"Kwanza Livre", cot:"—", nota:"Minérios da Era da Convergência alimentam Bio-Forjas regionais."},
{n:"Grã-Colômbia Velada", real:"Venezuela", al:"pro", x:255, y:275, moeda:"Bolívar Velado", cot:"—", nota:"Refinarias destruídas por guerrilhas; território em reconstrução Pró-Nexo."},
{n:"Círculo de Amesterdão", real:"Holanda", al:"ant", x:478, y:120, moeda:"Euro-Soberano (€S)", cot:"1 €S = $1.50 DF", nota:"Porto de entrada da tecnologia carcerária europeia."},
{n:"Nova Zelândia Autárquica", real:"Nova Zelândia", al:"ant", x:925, y:430, moeda:"Dólar Autárquico", cot:"—", nota:"Isolacionismo total. Fronteiras biológicas seladas."},
{n:"Ilhas Esmeralda", real:"Irlanda", al:"ant", x:445, y:112, moeda:"Euro-Soberano (€S)", cot:"1 €S = $1.50 DF", nota:"Bases navais da Coalizão no Atlântico Norte."},
{n:"Países de Gelo", real:"Noruega", al:"ant", x:495, y:72, moeda:"Coroa de Gelo", cot:"—", nota:"Instalações árticas de pesquisa — vizinhas aos complexos de Voglaskov."},
{n:"Fronteira Branca", real:"Finlândia", al:"ant", x:540, y:70, moeda:"Euro-Soberano (€S)", cot:"1 €S = $1.50 DF", nota:"Vigia da fronteira ocidental de Voglaskov. Campos de 'observação'."},
{n:"Liga de Copenhaga", real:"Dinamarca", al:"ant", x:495, y:100, moeda:"Coroa da Liga", cot:"—", nota:"Logística naval dos embargos Ant-Nexo."},
{n:"Base Lunar Ápice", real:"Lua", al:"neu", x:950, y:40, moeda:"Scrip Orbital", cot:"—", nota:"Megainstalação da Coalizão no lado escuro da Lua. Oficialmente: mineração. Na verdade: sensor da Ocultatun contra a próxima Colheita. Algo no vácuo está respondendo."}
];

// ECONOMIA — histórico cambial (variações % por período; base Dólar Federal)
const ECON = {
periodos:["Sem.1 (A.1)","Ano 1","Ano 2","Ano 5","Ano 10","Ano 16","Ano 40","Ano 70","Ano 100"],
moedas:[
{nome:"Krov (Voglaskov)", cor:"#e02832", dados:[-2.4,-6.8,-3.0,-2.0,8.9,1.15,1.0,4.10,4.50], cota:[null,null,null,null,null,1.15,null,4.10,4.50], nota:"De paria embargado a Titã de Aço: o monopólio dos Angels fez do Krov a moeda mais forte do planeta."},
{nome:"Éden (Hakuré)", cor:"#4fd8c7", dados:[1.2,-0.5,22.4,3.0,31.0,3.80,3.9,3.50,3.80], cota:[null,null,null,null,null,3.80,null,3.50,3.80], nota:"A superpotência silenciosa: biotecnologia Nexo como padrão-ouro mundial."},
{nome:"Libra Hagland", cor:"#c9a227", dados:[-3.0,2.2,4.0,1.0,5.4,2.10,2.0,2.00,2.10], cota:[null,null,null,null,null,2.10,null,2.00,2.10], nota:"O credor do mundo. Lucra com todas as guerras sem lutar em nenhuma."},
{nome:"Euro-Soberano", cor:"#9d6ff5", dados:[-5.8,-8.3,-14.8,-1.0,0.5,1.55,1.4,1.45,1.50], cota:[null,null,null,null,null,1.55,null,1.45,1.50], nota:"Burocracia purista estável. O cofre-forte da contenção."},
{nome:"Dólar Federal", cor:"#5fbf6f", dados:[8.7,18.4,-1.5,-1.0,-12.3,1.00,1.0,1.00,1.00], cota:[1,1,1,1,1,1,1,1,1], nota:"Do boom prisional à nação paranoica estagnada. O padrão-base que já foi rei."},
{nome:"Nyens (Zhonghão)", cor:"#f08c2e", dados:[14.2,12.1,-2.0,-1.5,2.1,0.65,0.8,0.75,0.85], cota:[null,null,null,null,null,0.65,null,0.75,0.85], nota:"A máquina de sangue: enriqueceu com escravos Nexo, quebrou com as Rupturas Genéticas."},
{nome:"Libra Colonial (UC)", cor:"#4e9af5", dados:[6.1,9.5,0,-2.0,-18.7,0.40,0.55,0.50,0.60], cota:[null,null,null,null,null,0.40,null,0.50,0.60], nota:"Sustentada artificialmente pela Protheus Corp. O feudo corporativo do Oeste."},
{nome:"Real Autárquico", cor:"#777", dados:[-11.5,-85.0,0,0,0,0,0.5,0.6,0.7], cota:[null,0.15,null,null,null,null,null,null,null], nota:"Colapso, suspensão e renascimento sob patrocínio de Hakuré."}
]};

// CLASSES / ARQUÉTIPOS — todos os modos
const CLASSES = [
// ÊXODO — Categorias
{id:"combatente", modo:"Êxodo — Assimilação", tipo:"Categoria de Base", nome:"Combatente", desc:"Especialistas em confronto direto, focados em força e perícia marcial. Ex: vigilante urbano ou soldado de elite.", stats:"+3 Força, +2 Agilidade, +1 Prontidão", extra:"Perícias: Atletismo 2, Pontaria 2, Luta 2 · Equipamento: +5 PE em armas/armaduras · Escolha 3 entre Vantagens e Talentos."},
{id:"sobrevivente", modo:"Êxodo — Assimilação", tipo:"Categoria de Base", nome:"Sobrevivente", desc:"Resilientes, adaptáveis, instintos de preservação apurados. Ex: explorador de áreas isoladas ou médico de campo.", stats:"+3 Vigor, +3 Agilidade", extra:"Perícias: Tratamento +3, Intuição +3 · Equipamento: +5 PE · Escolha 3 entre Vantagens e Talentos."},
{id:"especialista", modo:"Êxodo — Assimilação", tipo:"Categoria de Base", nome:"Especialista", desc:"Mestres do intelecto e da estratégia, soluções tecnológicas e conhecimento avançado. Ex: cientista brilhante ou estrategista militar.", stats:"+4 Intelecto, +1 Prontidão", extra:"Perícias: Especialidade +4, Tecnologia +4 · Equipamento: +15 PE em dispositivos personalizados · Escolha 3 entre Vantagens e Talentos."},
// ÊXODO — Arquétipos
{id:"icone", modo:"Êxodo — Assimilação", tipo:"Arquétipo de Destino", nome:"Ícone", desc:"Líderes naturais e símbolos de esperança ou medo para o público. O ápice da imagem do herói, lutando contra as expectativas impostas pela sociedade.", stats:"+5 CÊ em perícias/vantagens · +25 Carga Êxodo", extra:"Afinidade Estigmática: Somático, Metabólico (+1 nas potências) · Complicações: Opinião Pública, Fraqueza Eminente, Preocupado, Voto Perpétuo."},
{id:"justiceiro", modo:"Êxodo — Assimilação", tipo:"Arquétipo de Destino", nome:"Justiceiro", desc:"Opera nas sombras, guiado por vingança, justiça pessoal ou redenção. Pragmático, determinado e pouco convencional.", stats:"+15 CÊ livres · +15 Carga Êxodo", extra:"Afinidade: Sensorial, Metabólico · Complicações: Arqui-Inimigo, Fantasma do Passado, Identidade Secreta, Vício."},
{id:"inventor", modo:"Êxodo — Assimilação", tipo:"Arquétipo de Destino", nome:"Inventor", desc:"O cérebro da equipe. Cria soluções inovadoras e dispositivos tecnológicos — e enfrenta as consequências da própria ambição.", stats:"+20 CÊ livres · +10 Carga Êxodo", extra:"Afinidade: Controle ou Sensorial · Complicações: Aflição Psicossomática, Conhecimento Proibido, Corpo Frágil, Invenção de Alto Risco."},
{id:"mentor", modo:"Êxodo — Assimilação", tipo:"Arquétipo de Destino", nome:"Mentor", desc:"O guia e estrategista do grupo. Centro moral e emocional da equipe, garantindo harmonia sob pressão.", stats:"+15 CÊ livres · +15 Carga Êxodo", extra:"Afinidade: Cognitivo, Entópico · Complicações: Alvo Governamental, Opinião Pública, Perseguido, Público."},
{id:"linhagem", modo:"Êxodo — Assimilação", tipo:"Arquétipo Único", nome:"Linhagem Herdada", desc:"Sem Gene Êxodo: poderes de uma 'Colheita Genética' de ~150.000 anos. Músculos otimizados, regeneração, mente acelerada — e um furo jurídico no T.S.I.N.", stats:"75 CÊ iniciais", extra:"Especializações: Velocitus Bellator (+2 FOR/+2 AGI), Aeternus Vitalis (+3 VIG/+1 FOR), Mentis Aurorae (+2 INT/+2 PER) · Vantagens: Adaptação Extrema, Recuperação Rápida (1d6/cena), Resiliência Instintiva."},
{id:"aprimorador", modo:"Êxodo — Assimilação", tipo:"Arquétipo Único", nome:"Arquiteto de Linhagem (Aprimorador)", desc:"Humano puro, estéril ao Gene — o cientista que permite à humanidade moldar o Êxodo em vez de ser consumida por ele. Imune a Assimilação e Ruptura Genética.", stats:"Atributos: Intelecto (essencial), Tecnologia, Medicina · Sem Prodígios", extra:"Recurso central: Dados de Sequenciamento (DS), substituindo a Carga Êxodo. Não pode manifestar Potências nem usar CÊ."},
{id:"player", modo:"Êxodo — Assimilação", tipo:"Arquétipo Único", nome:"Projeto Player", desc:"A Interface Viva: heresia meta-tecnológica do 'Arquiteto' que funde biologia à tecnologia das Eras Perdidas. A Assimilação vira um 'erro de sistema' a ser depurado.", stats:"Partículas: Kairon (previsão), Xenion (matéria/Repositório Kafra), Oníron (IAs Angélicas), Nexon (evolução)", extra:"Protocolo Debug: teste INT+PRE (CD 20) torna Assimilação inativa por 1 cena · Vantagem em TCGs de humanidade."},
// OCULTATUN — Carreiras
{id:"mercador", modo:"Ocultatun — Ecos", tipo:"Classe de Carreira", nome:"Mercador da Morte", desc:"A linha de frente da Ocultatun. Identidades apagadas, reescritas com um único propósito: contenção. Sobreviventes da Sala Branca, carregam a Assinatura da Morte.", stats:"FOR e VIG · PV = (Vigor×10)+10 · DV: 1d12/patamar · 0 EP natural", extra:"Pilares: Estamina → Manobras → Arsenal · Grau 3 em Luta ou Pontaria · Economia própria: PE, CO e a Loja do Mercador."},
{id:"carrasco", modo:"Ocultatun — Ecos", tipo:"Classe de Carreira", nome:"Carrasco Cinzento", desc:"O esmagador. Se um Carrasco foi mobilizado, a Ocultatun decidiu que aquela área da realidade não merece mais existir. Brutalidade física e resiliência anômala.", stats:"FOR e VIG · PV = (Vigor×10)+15 · DV: 1d12+2/patamar", extra:"Ameaça Crescente: acumula pontos ao derrubar ou resistir — Fúria Silenciosa, Pavor Paranormal, Inércia Destrutiva · Arsenal de Devastação (10 PE)."},
{id:"alquerino", modo:"Ocultatun — Ecos", tipo:"Classe de Carreira", nome:"Alquerino", desc:"O peregrino do paranormal. Não nasceu escolhido pelo Abismo: ele FABRICA o impossível. Emoção como reagente, memória como solvente, morte como matéria-prima.", stats:"INT e PRE · Classe de Especialista", extra:"Alquimia Intrínseca: preparar → adaptar → pesquisar → transformar → solucionar. Trabalha com Energia Sintetizada e ingredientes anômalos."},
// OCULTATUN — Agentes Designados
{id:"hermetico", modo:"Ocultatun — Ecos", tipo:"Agente Designado", nome:"Hermético", desc:"O arquiteto da simetria. Para ele o paranormal é uma gramática: ele não invoca forças, confina-as em formas. Mestre dos selamentos e prisões dimensionais.", stats:"INT e PRN · PV = (Vigor×10)+10 · DV: 1d6/patamar", extra:"Grau 3 em Ocultismo, Linguística, Geometria Esotérica · Domínio Geométrico (Zonas de Confinamento) · Forja Hermética de artefatos · Sinfonia das Fórmulas."},
{id:"esoterico", modo:"Ocultatun — Ecos", tipo:"Agente Designado", nome:"Esotérico", desc:"O cientista do abismo: transgressor voluntário que integra a anomalia ao próprio corpo. O corpo humano é um protótipo obsoleto que precisa de 'upgrades'.", stats:"INT e VIG · PV = (Vigor×10)+12 · EP = (INT×5)+15 · DV: 1d8/patamar", extra:"Autocirurgia Paranormal · Enxertos Paranormais (Slots = VIG+1) · Engenharia de Covis (Rápido/Prático/Perpétuo) · Decadência: Assimilação do Abismo."},
// ORDEM DOS SETE
{id:"inquisidor", modo:"Ordem dos Sete", tipo:"Casta", nome:"Inquisidor", desc:"A Lança da Verdade. Onde o Véu não cede pela meditação, cederá pela violência sagrada. Executores da Ordem, mistura do monástico com o militar.", stats:"+3 FOR, +3 VIG (33 PP totais)", extra:"Perícias: Intimidação, Luta, Atletismo, Sobrevivência · Passivo — Olhar Impositivo: -2 em Vontade de inimigos em corpo a corpo · Alinhamentos: Auriel, Sarethon, Azarael."},
{id:"interprete", modo:"Ordem dos Sete", tipo:"Casta", nome:"Intérprete", desc:"Os Olhos que Leem os Céus. Decifradores do códice cósmico: desvendam fraquezas dos Elders e traduzem o que a realidade murmura.", stats:"+3 INT, +3 PRN/PER (33 PP)", extra:"Perícias: Ocultismo, Religião, Investigação, Linguística · Passivo — Código Vivo: revela resistências e fraquezas de anomalias · Alinhamentos: Thagefhanir, Orphanael, Metatron."},
{id:"sentinela", modo:"Ordem dos Sete", tipo:"Casta", nome:"Sentinela", desc:"A Parede entre o Mundo e a Queda. Não avançam, não passam — enquanto estiverem de pé. Ponto de gravidade absoluto quando tudo colapsa.", stats:"+4 VIG, +3 PRE (33 PP)", extra:"Perícias: Fortitude, Intuição, Ofício (Selos) · Passivo — Bastião Espiritual: +2 Defesa/Resistência aos aliados em 3m se não se mover · Alinhamentos: Dhelaykaim, Azarael, Sarethon."},
{id:"juizo", modo:"Ordem dos Sete", tipo:"Casta", nome:"Juízo", desc:"A Voz entre os Céus e os Homens. Oradores da luz, diplomatas do plano superior. A voz de um Juízo carrega a ressonância da Criação.", stats:"+4 PRE, +3 PRN/INT Social (33 PP)", extra:"Perícias: Diplomacia, Intuição, Liderança · Passivo — Mandato Celeste: 1/cena, sentença sagrada impõe -2 ofensivo (Vontade nega) · Alinhamentos: Sarethon, Thagefhanir, Auriel."},
// ENVOLTO
{id:"arauto", modo:"Ecos do Envolto", tipo:"Classe do Envolto", nome:"O Arauto", desc:"O Porta-Voz do Fim. Entregou a identidade conscientemente: vê o Espaço Final como o destino lógico do universo. Um profeta da não-existência.", stats:"PRE e INT · EE = (PRE ou INT ×5)+15", extra:"Dádiva da Disformidade: inflige 1 grau de Corrupção em si → próximo poder custa metade e +2 na CD inimiga · Talento: Eco do Vazio."},
{id:"tocado", modo:"Ecos do Envolto", tipo:"Classe do Envolto", nome:"O Tocado", desc:"A Fissura Ambulante. Um acidente: exposto demais ao Envolto, seu corpo recusa-se a morrer, adaptando-se em mutações terríveis e reflexos cósmicos.", stats:"VIG e PRN · EE = (VIG×5)+10", extra:"Absorção Ontológica: anula dano letal ao custo de mutação visível +1 nível de Corrupção · Talento: Ancoragem Física (+5 em resistências de VIG)."},
{id:"condenado", modo:"Ecos do Envolto", tipo:"Classe do Envolto", nome:"O Condenado", desc:"O Caçador Envenenado. Veteranos — ex-Mercadores e Carrascos — que integraram a energia do Espaço Final ao corpo e ao equipamento de forma irreversível.", stats:"FOR e INT · EE = (INT×5)+15", extra:"Arsenal Herege: converte dano cinético em Dano Ontológico (ignora RD) · Talento: Repúdio da Casca — ação final ao chegar a 0 PV."}
];

// ÁRVORES DE HABILIDADE
const ARVORES = {
envolto:[
{nome:"1 · O Colapso", tema:"Potência Destrutiva", tiers:[
 {t:"T1 — A Semente da Fissura (Cap 1-3)", d:"Alterações locais, alvo único. Soco que atravessa armadura; rajada de estática negra; crítico 18-20."},
 {t:"T2 — O Desdobramento Euclidiano (Cap 4-6)", d:"Lâminas do Espaço Final que mutilam corpo e alma; chuva de cinzas geométricas; dano crítico +30%. Pré-req.: Tier 1 de Oblívio para o T3."},
 {t:"T3 — O Eco de Xal-Mhyr (Cap 7-10)", d:"Feixe ocular que cauteriza células; o alvo 'deixa de ter existido' parcialmente; o céu se abre e a gravidade esmaga o alvo em poça. Alterações permanentes na malha da realidade."}]},
{nome:"2 · A Quimera", tema:"Potência Transformadora / Mutação", tiers:[
 {t:"T1 (Cap 1-3)", d:"Pele de basalto que chora sangue negro; guelras e escalar paredes; dedos-gancho. Pré-req. T2: Tier 1 de Anomalia."},
 {t:"T2 (Cap 4-6)", d:"Braço que se torce em arma pesada (1d10, usa VIG); fibras de estática costuram membros; RD 10."},
 {t:"T3 (Cap 7-10)", d:"Corpo colossal (alcance 4,5m); regeneração de explosão de biomassa; transformar-se em enxame. Imunidade a dano físico/veneno/doença — só Ontológico ou Mental ferem."}]},
{nome:"3 · O Véu / A Fenda", tema:"Potência Espacial", tiers:[
 {t:"T1 (Cap 1-3)", d:"Passo pelas sombras; troca de lugar com aliado (15m); braço que 'estica' através do espaço."},
 {t:"T2 (Cap 4-6)", d:"Soco à distância; círculos de sangue que abrem portais (100m); dobrar o ar para anular dano por 1 rodada. Pré-req. T3: Tier 2 de si mesma em cadeia."},
 {t:"T3 (Cap 7-10)", d:"Teleportar explosões; sala de bolso por 1 hora; três cópias atuantes; pensar num alvo em Paris e surgir nas costas dele."}]},
{nome:"4 · Oblívio", tema:"Potência de Decadência / Aflição", tiers:[
 {t:"T1 (Cap 1-3)", d:"Sussurro do peso de mil anos; olhos que apodrecem; cérebro que atrasa a dor. Pré-req.: Tier 1 de Ressonância para o T2."},
 {t:"T2 (Cap 4-6)", d:"Toque podre que apaga Perícias por 24h; terror em massa; atributos murcham permanentemente."},
 {t:"T3 (Cap 7-10)", d:"Marca de morte (PV a 0 ao fim do prazo); debuffs contagiosos; arrancar a Vontade — ninguém mais usa aquele Atributo na área."}]},
{nome:"5 · A Inércia", tema:"Potência Temporal", tiers:[
 {t:"T1 (Cap 1-3)", d:"Olhar que faz o atirador hesitar; mover-se ao triplo como borrão; ver cinzas e assistir ao incêndio ao contrário. Pré-req. T2: Tier 1 do Véu/Fenda."},
 {t:"T2 (Cap 4-6)", d:"Paralisar alvos no tempo (imunes enquanto parados); bala volta à arma; metal enferruja ao toque."},
 {t:"T3 (Cap 7-10)", d:"Mundo cinzento: chuva parada no ar, só o usuário age por 2 rodadas; reescrever um golpe letal; apagar 6 segundos da vida do alvo."}]},
{nome:"6 · A Ressonância", tema:"Potência Mental", tiers:[
 {t:"T1 (Cap 1-3)", d:"Ouvir o plano do inimigo antes da faca; injetar o som das estrelas morrendo; equipa comunica sem palavras. Pré-req. T3: Tier 2 de Oblívio."},
 {t:"T2 (Cap 4-6)", d:"Comandos verbais ('Larga a arma e dorme'); 4d6 mental + Atordoado; reescrever a memória de uma testemunha."},
 {t:"T3 (Cap 7-10)", d:"Enclausurar mentes conscientes; roubar a Perícia do alvo; estado vegetativo permanente; voz divina que domina uma sala inteira."}]},
{nome:"7 · A Anomalia", tema:"Potência de Criação Material", tiers:[
 {t:"T1 (Cap 1-3)", d:"Chave de gelo que não derrete e queima; balas anômalas (+1d6); pedra vira lodo, madeira vira vidro. Pré-req. T2: Tier 1 da Quimera."},
 {t:"T2 (Cap 4-6)", d:"Barricadas que explodem (3d6); muros de geometria impossível; arma que ataca sozinha."},
 {t:"T3 (Cap 7-10)", d:"Chão que cria braços; jipe com coração pulsante por motor (150 PV); matéria viva sob comando mental."}]},
{nome:"8 · O Paradoxo", tema:"Potência de Ilusão Absoluta", tiers:[
 {t:"T1 (Cap 1-3)", d:"Ilusões sensoriais locais; rostos que mudam; sons fantasmas direcionais."},
 {t:"T2 (Cap 4-6)", d:"Cenas inteiras falsas; aliados invisíveis; o inimigo ataca o próprio reflexo."},
 {t:"T3 (Cap 7-10)", d:"Realidades sobrepostas: a ilusão fere de verdade; o alvo vive dias falsos em segundos."}]},
{nome:"9 · A Entropia", tema:"Potência de Azar / Sorte Reversa", tiers:[
 {t:"T1 (Cap 1-3)", d:"Tropeços improváveis; armas emperram; o pior resultado possível para o inimigo."},
 {t:"T2 (Cap 4-6)", d:"Zonas de azar ativo; rerrolar falhas aliadas; acidentes em cadeia."},
 {t:"T3 (Cap 7-10)", d:"Colapso probabilístico: tudo que pode dar errado, dá — ao mesmo tempo, contra o alvo."}]},
{nome:"10 · A Gravidade", tema:"Potência Cinética", tiers:[
 {t:"T1 (Cap 1-3)", d:"Empurrões vetoriais; quedas suavizadas; objetos pesados flutuam brevemente."},
 {t:"T2 (Cap 4-6)", d:"Campos de gravidade dobrada; esmagar coberturas; andar em paredes e tetos."},
 {t:"T3 (Cap 7-10)", d:"Poços gravitacionais; inversão regional; o alvo é comprimido ao próprio peso."}]},
{nome:"11 · O Sangue Negro", tema:"Necromancia / Falsa Morte", tiers:[
 {t:"T1 (Cap 1-3)", d:"Falar com recém-mortos; drenar calor vital; pele cadavérica protetora."},
 {t:"T2 (Cap 4-6)", d:"Reanimar cascas obedientes; transferir ferimentos; falsa morte perfeita."},
 {t:"T3 (Cap 7-10)", d:"Legiões de cascas; colheita de últimas memórias em massa; o usuário 'morre' e retorna modificado."}]},
{nome:"12 · A Emanação", tema:"Potência de Invocação", tiers:[
 {t:"T1 (Cap 1-3)", d:"Ecos menores do Espaço Final; familiares disformes de curta duração."},
 {t:"T2 (Cap 4-6)", d:"Servos estáveis; emanações com funções táticas; pactos de curto prazo."},
 {t:"T3 (Cap 7-10)", d:"Chamar algo que tem nome; o invocado cobra pedágio ontológico permanente."}]},
{nome:"13 · O Vértice", tema:"Potência de Defesa Absoluta", tiers:[
 {t:"T1 (Cap 1-3)", d:"Pele de geometria dura; desvios menores; ângulos que 'erram' o usuário."},
 {t:"T2 (Cap 4-6)", d:"Barreiras de negação; refletir dano parcial; zona segura móvel."},
 {t:"T3 (Cap 7-10)", d:"O ponto que não pode ser tocado: por instantes, o usuário simplesmente não é um alvo válido da realidade."}]}
],
exodo:[
{nome:"Potência Física", tema:"Força, Impacto e Tração", tiers:[{t:"Cap 1-3", d:"Força sobre-humana básica; levantar centenas de kg."},{t:"Cap 4-7", d:"Manipulação de massa inercial; impacto estrutural."},{t:"Cap 8-10", d:"Força de escala bélica; o corpo como arma de cerco."}]},
{nome:"Potência Energética", tema:"Emissão e Conversão", tiers:[{t:"Cap 1-3", d:"Descargas térmicas/elétricas menores."},{t:"Cap 4-7", d:"Conversão de resíduo em calor; raios ofensivos."},{t:"Cap 8-10", d:"Tempestades artificiais; redes elétricas como arma."}]},
{nome:"Potência Destrutiva", tema:"Aniquilação de Matéria", tiers:[{t:"Cap 1-3", d:"Ruptura de ligações em pequenos objetos."},{t:"Cap 4-7", d:"Desintegração parcial; corrosão acelerada."},{t:"Cap 8-10", d:"Aniquilação molecular em área."}]},
{nome:"Potência de Domínio", tema:"Volume e Massa de Controle", tiers:[{t:"Cap 1-3", d:"Controle ambiental local."},{t:"Cap 4-7", d:"Biocampo de massa; terreno como extensão do corpo."},{t:"Cap 8-10", d:"Domínio de quarteirões inteiros."}]},
{nome:"Potência de Alcance", tema:"Distância de Atuação", tiers:[{t:"Cap 1-3", d:"Projeção do gene a metros."},{t:"Cap 4-7", d:"Atuação a centenas de metros."},{t:"Cap 8-10", d:"Presença genética em escala de cidade."}]},
{nome:"Potência de Projeção", tema:"Manutenção e Duração", tiers:[{t:"Cap 1-3", d:"Efeitos de segundos/rodadas."},{t:"Cap 4-7", d:"Auras de minutos; formas complexas sustentadas."},{t:"Cap 8-10", d:"Poder autônomo (entidade/campo); mutação fixa no hospedeiro."}]},
{nome:"Potência de Restauração", tema:"Cura e Regeneração", tiers:[{t:"Cap 1-3", d:"Fecha cortes (2d4-2d8 PV); condições Leves/Moderadas."},{t:"Cap 4-7", d:"Repara órgãos (2d10), regenera membros (2d12), reconstrói sistema nervoso (3d12). Catastrófica."},{t:"Cap 8-10", d:"Corpo de danos massivos (5d10); reanima mortos recentes (5d12); ressurreição total do DNA em 1d4 dias."}]},
{nome:"Potência Protetiva", tema:"Defesa e Resistência", tiers:[{t:"Cap 1-3", d:"Pele reforçada; RD leve."},{t:"Cap 4-7", d:"Barreiras genéticas; imunidades parciais."},{t:"Cap 8-10", d:"Quase-invulnerabilidade biológica."}]},
{nome:"Potência Cinética", tema:"Velocidade e Reação", tiers:[{t:"Cap 1-3", d:"Reflexos e sprints sobre-humanos."},{t:"Cap 4-7", d:"Velocidade de borrão; reação a balas."},{t:"Cap 8-10", d:"Movimento que a percepção humana não registra."}]},
{nome:"Potência de Alteração", tema:"Transmutação e Forma", tiers:[{t:"Cap 1-3", d:"Alterações cosméticas e menores."},{t:"Cap 4-7", d:"Formas parciais; adaptação morfológica."},{t:"Cap 8-10", d:"Transmutação completa do corpo."}]},
{nome:"Potência de Saturação", tema:"Absorção e Neutralização", tiers:[{t:"Cap 1-3", d:"Absorve pequenas descargas/impactos."},{t:"Cap 4-7", d:"Neutraliza poderes menores; esponja de energia."},{t:"Cap 8-10", d:"Drena prodígios inteiros; âncora de anulação."}]},
{nome:"Potência Sistêmica", tema:"Multiplicidade de Alvos", tiers:[{t:"Cap 1-3", d:"Efeito em 2-3 alvos."},{t:"Cap 4-7", d:"Redes de efeito; campos de múltiplos alvos."},{t:"Cap 8-10", d:"Sistemas de poder em escala de multidão."}]}
],
superior:[
{nome:"Potência TEMPORAL", tema:"Evolução de Cinesia", tiers:[{t:"Cap 1-5 (38-70 CÊ)", d:"Acelera reflexos, desacelera alvos, congela objetos; rebobina 1 rodada. Risco: Dissociação Temporal."},{t:"Cap 6-8 (78-94 CÊ)", d:"Congela áreas de 30m; rebobina 1 minuto; ecos temporais (ações duplicadas). Desincronia Física."},{t:"Cap 9-10 (102-110 CÊ)", d:"Dilatação quilométrica; reverte mortes; paralisa o tempo global por 1 rodada. Paradoxo Ontológico."}]},
{nome:"Potência ESPACIAL", tema:"Evolução de Domínio", tiers:[{t:"Cap 1-5", d:"Teleporte 30m; portais de 5m por 1 minuto. Deslocamento Inercial."},{t:"Cap 6-8", d:"Fendas gravitacionais que redirecionam ataques; move grupos; salas infinitas em espaços finitos. Laceração Espacial."},{t:"Cap 9-10", d:"Reconfigura geografia; bolsas de realidade; viagem continental instantânea. Colapso Gravitacional."}]},
{nome:"Potência PROBABILÍSTICA", tema:"Evolução de Sistêmica", tiers:[{t:"Cap 1-5", d:"Rerrolagens; inverte eventos menores; tiros 'impossíveis'. Resíduo de Caos."},{t:"Cap 6-8", d:"Linhas de futuro: escolhe o melhor resultado; faz o 1% acontecer. Contracausalidade."},{t:"Cap 9-10", d:"Reescrita de destino em áreas urbanas; realidades alternativas temporárias; sucesso automático. Apagamento de Existência."}]},
{nome:"Potência de ENTROPIA", tema:"Evolução de Energética/Destrutiva", tiers:[{t:"Cap 1-5", d:"Dissolve matéria em poeira; apaga calor/movimento numa sala; energia do vácuo. Desgaste Celular."},{t:"Cap 6-8", d:"Zonas de aniquilação molecular; reverte destruição recente; drena exércitos. Autoaniquilação Parcial."},{t:"Cap 9-10", d:"Apaga fenômenos naturais; desintegra cidades; cria matéria do nada em massa. Vazio Biológico."}]},
{nome:"Potência de REALIDADE", tema:"Evolução de Alteração/Projeção", tiers:[{t:"Cap 1-5", d:"Pedra vira névoa; anula gravidade local; objetos do nada. Dissociação Ontológica."},{t:"Cap 6-8", d:"'O fogo congela, o gelo queima'; memória vira massa física. Ruptura Dimensional."},{t:"Cap 9-10", d:"Zonas onde a física obedece ao Nexo; Efeito Gênesis. Substituição Divina."}]},
{nome:"Potência VITAL", tema:"Evolução de Restauração/Metabólico", tiers:[{t:"Cap 1-5", d:"Regenera corpos de terceiros; drena vitalidade em CÊ; reanima mortos recentes. Sobrecarga Orgânica."},{t:"Cap 6-8", d:"Cria seres híbridos autônomos; cura populações de doenças genéticas. Regressão Biológica."},{t:"Cap 9-10", d:"Reverte envelhecimento em área; ressurreição em massa; fusão de consciências em rede. Perda de Individualidade."}]},
{nome:"Potência ONÍRICA", tema:"Evolução de Cognitiva", tiers:[{t:"Cap 1-5", d:"Ilusões tangíveis; entra e altera memórias e sonhos. Dissolução Mental."},{t:"Cap 6-8", d:"Pesadelos materiais; o corpo reage a ferimentos imaginários. Coma por Projeção."},{t:"Cap 9-10", d:"Realidades mentais sobre o físico; controla a consciência de cidades; 'Paraísos' artificiais. Fragmentação de Ego."}]},
{nome:"Potência de INÉRCIA", tema:"Evolução de Protetiva/Saturação", tiers:[{t:"Cap 1-5", d:"Bloqueia movimento/energia num objeto; barreiras impenetráveis a armas convencionais. Estase Celular."},{t:"Cap 6-8", d:"Congela explosões no ar (50m); anula radiação e venenos. Prisão Inercial (prende o usuário)."},{"t":"Cap 9-10","d":"Invulnerável a qualquer fenômeno por 1 cena; protege regiões da aniquilação. Petrificação Gênica."}]}
],
ordem:[
{nome:"Arkhé", tema:"A Verdade da Matéria", tiers:[{t:"Fundamento", d:"Moldar e transmutar o que já existe. Teste: INT + Recordação vs. CD do Material/Efeito."},{t:"Ascensão", d:"Matéria obedecendo ao Verbo: armas forjadas do ambiente, matéria que responde à fé."},{t:"Pleroma", d:"A matéria reconhece seu autor original: reescrever estruturas inteiras."}]},
{nome:"Ex-Nihilo", tema:"A Verdade da Criação", tiers:[{t:"Fundamento", d:"Trazer luz pura e matéria do vazio. Teste: INT + Recordação vs. CD base 15."},{t:"Ascensão", d:"Criação ex nihilo de formas estáveis; luz que fere a corrupção."},{t:"Pleroma", d:"O verbo que precede a matéria: criar onde nada havia — inclusive esperança física."}]},
{nome:"Poesis Pleroma", tema:"A Verdade da Alma", tiers:[{t:"Fundamento", d:"Infusão de vida, consciência e propósito. Teste: PRE + Recordação vs. CD do ser/intenção."},{t:"Ascensão", d:"Cura plerómica; maldição do juramento (tabu com punição); comunhão de almas."},{t:"Pleroma", d:"Quebra de Vontade Divina (apagar a mente do alvo — tabela de aflições 1-10); milagres de massa."}]},
{nome:"Chronos Aeternum ✝", tema:"A Verdade do Fluxo — PERDIDA", tiers:[{t:"Ascensão Perdida", d:"O controle do Tempo. Perdida no Grande Silêncio e na Queda que fraturou a Ordem."}]},
{nome:"Kinesis Astra ✝", tema:"A Verdade do Espaço — PERDIDA", tiers:[{t:"Ascensão Perdida", d:"A Gravidade e o espaço como domínio divino. Perdida na Queda."}]},
{nome:"Lumen Judicare ✝", tema:"A Verdade do Fim — PERDIDA", tiers:[{t:"Ascensão Perdida", d:"A Destruição Pura: o fogo que julga. Perdida na Queda."}]},
{nome:"Aether Resonantia ✝", tema:"A Verdade da Unidade — PERDIDA", tiers:[{t:"Ascensão Perdida", d:"A Harmonia entre todas as frequências do Espectro. Perdida na Queda."}]}
]};

// Exposto para o Escudo do Mestre e ferramentas administrativas.
window.NACOES = NACOES;

// ESTIGMAS (Êxodo)
const ESTIGMAS = [
{nome:"Somático", custo:2, bonus:"+1 Força / Defesa", risco:"Degeneração muscular e fadiga intensa.", desc:"Atua sobre músculos, ossos e tecidos."},
{nome:"Sensorial", custo:2, bonus:"+1 Precisão / Reflexo", risco:"Sobrecarga sensorial e enxaquecas.", desc:"Expande os sentidos e a percepção neural."},
{nome:"Metabólico", custo:3, bonus:"+1 Cura / Resistência", risco:"Fadiga celular, febre e desidratação.", desc:"Manipula energia vital e funções internas."},
{nome:"Cognitivo", custo:3, bonus:"+1 Controle / Vontade", risco:"Instabilidade emocional e delírios.", desc:"Atua no cérebro, emoções e rede neural."},
{nome:"Entópico", custo:4, bonus:"+1 Alcance / Potência", risco:"Deformações físicas e calor extremo.", desc:"Manipula forças naturais externas (gravidade, calor)."},
{nome:"Singularidade", custo:5, bonus:"+1 Dano / Corrupção", risco:"Perda de identidade e mutação constante.", desc:"Expressão da assimilação; o gene absorve dor."}
];
