/* Mundos Sombrios — Registros Históricos do Mestre V2.4.1
   Baseado no suplemento oficial enviado pelo autor.
   Organiza os períodos do cenário em dossiês cronológicos por assunto.
*/
(function(){
  'use strict';

  const periods=[
    {
      id:'y1a', order:1, fileName:'DOSSIE-A01-S1.reg', label:'Ano 1 · Meses 1–6', range:'Mês 1 ao 6',
      title:'Boom da Segregação e Choque de Ordem',
      summary:'O início da vigência do T.S.I.N. reescreve a ordem mundial. O Gene Êxodo torna-se eixo económico, policial e industrial; a repressão pública contra Nexos gera instabilidade social e abre as primeiras fissuras sérias no Véu.',
      tags:['T.S.I.N.','Segregação','Gene Êxodo','Véu','Coalizão Global'],
      geopolitics:[
        {title:'Implementação dos Dez Pilares', summary:'O registo compulsório força milhões de Nexos a deixarem o anonimato sob ameaça de extermínio, enquanto protestos na Europa e na América do Sul são esmagados e reclassificados como terrorismo.'},
        {title:'Licença social para a caça', summary:'A licença para matar de facto, somada à omissão policial, aumenta o homicídio de Nexos em becos, subúrbios e zonas de contenção.'},
        {title:'Primeiras fissuras do sigilo', summary:'O medo coletivo, o sangue e a opressão em massa criam pressão ontológica suficiente para exigir as primeiras limpezas pesadas da Ocultatun.'}
      ],
      economy:[
        {name:'Nyens (¥N)', value:'+14,2%', block:'República de Zhonghão', analysis:'Lidera o mercado global graças ao uso escravo de Nexos em indústrias pesadas e ambientes de alto risco.'},
        {name:'Dólar Federal (DF$)', value:'+8,7%', block:'EUA (Leste)', analysis:'Expande-se sustentado por prisões biológicas, segurança privada e contratos de contenção.'},
        {name:'Libra Colonial (LC£)', value:'+6,1%', block:'Confederação Unida (Oeste)', analysis:'Cresce com a venda de tecnologia de inibição e a privatização da segregação.'},
        {name:'Éden (ED)', value:'+1,2%', block:'Império de Hakuré', analysis:'Mantém-se estável enquanto o império desvia recursos para conter anomalias e preparar sua agenda Pró-Nexo.'},
        {name:'Krov (KV)', value:'-2,4%', block:'Federação de Voglaskov', analysis:'Sofre com embargo disfarçado de Hagland e com os custos iniciais do Projeto Atavismo.'},
        {name:'Real Autárquico (RA$)', value:'-11,5%', block:'Aliança Sul-Americana', analysis:'Entra em crise pela soma de guerrilhas Nexo, repressão estatal e colapso de infraestrutura.'}
      ],
      events:[
        {title:'Massacre do Distrito 4', type:'EUA - Leste', summary:'Uma megacorporação tenta implantar coleiras de choque em cinco mil Nexos. Um Aprimorador hackeia a rede local e converte o bairro em zona de guerra.', impact:'Escalada da violência urbana e fortalecimento da resistência Nexo.'},
        {title:'Comboio Fantasma de Vladivostok', type:'Voglaskov / Hagland', summary:'Um comboio com “armamentos biológicos descartáveis” descarrila na neve. No local restam apenas ozono, geometria distorcida e ausência de corpos.', impact:'A dor coletiva dos cativos rasga o Véu e exige limpeza conjunta de contenção.'},
        {title:'Eucaristia de Chumbo', type:'América do Sul', summary:'Rebeldes Nexo invadem uma catedral e encontram um covil inquisitorial em ritual de silenciamento. O choque entre Prodígios e Milagres destrói quarteirões.', impact:'Crise diplomática regional e queda acelerada do Real Autárquico.'}
      ],
      hooks:[
        {title:'Queda das Coleiras', mode:'Êxodo: Assimilação', summary:'Libertar sobreviventes do Distrito 4 antes que forças privadas e caçadores puristas limpem a área.', objective:'Evacuação tática, contragolpe e fuga urbana.'},
        {title:'Vigília do Trilho Branco', mode:'Crossover', summary:'Investigar o comboio de Vladivostok e decidir se a prioridade é resgate, prova ou contenção do rasgo no Véu.', objective:'Sobrevivência em fronteira militarizada e contenção paranormal.'},
        {title:'Sangue no Altar', mode:'Ocultatun / Ordem', summary:'Conter o resultado da Eucaristia de Chumbo antes que a guerra religiosa se espalhe pela América do Sul.', objective:'Selar milagres, Entidades e crise diplomática.'}
      ]
    },
    {
      id:'y1b', order:2, fileName:'DOSSIE-A01-S2.reg', label:'Ano 1 · Meses 7–12', range:'Mês 7 ao 12',
      title:'Exploração Predatória e Despertar do Envolto',
      summary:'A fase de adaptação ao Tratado termina. Governos e corporações passam a tratar Nexos como commodity biológica, enquanto a pressão sobre o Gene Êxodo e a realidade física desencadeia surtos ontológicos em escala inédita.',
      tags:['Mercado de Carne','Assimilação Acelerada','Envolto','Guerra Fria Biológica'],
      geopolitics:[
        {title:'Queda da Aliança Sul-Americana', summary:'A Coalizão invoca o Artigo 8º, transforma o continente em zona de extração e converte prisioneiros Nexo em mercadoria internacional.'},
        {title:'Crise de Saturação de Zhonghão', summary:'A exploração extrema da mão de obra Nexo produz Rupturas Genéticas em massa dentro de fábricas tóxicas e radioativas.'},
        {title:'Corrida de supressão gênica', summary:'Voglaskov intensifica os Ativos Sombrios; Hagland responde com Xeno-Bloqueio, coleiras de saturação e inibidores avançados.'},
        {title:'Véu no limite', summary:'A Ocultatun autoriza Saturação Crítica de agentes para lidar com Fendas do Espaço Final abertas em ruínas e subúrbios industriais.'}
      ],
      economy:[
        {name:'Dólar Federal (DF$)', value:'+18,4%', block:'EUA (Leste)', analysis:'Assume a liderança global com a reconstrução e a intervenção armada na América do Sul.'},
        {name:'Nyens (¥N)', value:'+12,1%', block:'República de Zhonghão', analysis:'Permanece forte, mas sob suspeita crescente por descartes massivos de operários transformados.'},
        {name:'Libra Colonial (LC£)', value:'+9,5%', block:'Confederação Unida (Oeste)', analysis:'Domina o mercado de biotecnologia militar, segurança algorítmica e próteses cibernéticas.'},
        {name:'Libra de Hagland', value:'+2,2%', block:'Reino de Hagland', analysis:'Recupera-se com a venda de patentes de inibição gênica.'},
        {name:'Krov (KV)', value:'-6,8%', block:'Federação de Voglaskov', analysis:'O custo de manter Armamentos Biológicos pressiona o Estado e amplia o risco de motim.'},
        {name:'Real Autárquico (RA$)', value:'SUSPENSO (-85%)', block:'Aliança Sul-Americana', analysis:'A moeda perde função de mercado e cede espaço a DF$ e escambo de recursos.'}
      ],
      events:[
        {title:'Contrabando do Projeto Player', type:'UC / Mercado Negro', summary:'Vazam dados sobre Partículas Nexo-Terminais; gangues e Bio-Forjas clandestinas tentam reescrever o próprio código biológico.', impact:'A Coalizão envia esquadrões de recuperação e elimina laboratórios inteiros.'},
        {title:'Acidente de Tsaritsyn', type:'Voglaskov', summary:'Um pelotão de Nexos Militares sofre Ruptura Genética simultânea e, em vez de morrer, torna-se um foco de Condenados e geometria distorcida.', impact:'A Sibéria torna-se zona de contenção e horror ontológico.'},
        {title:'Operação Colheita de Prata', type:'Ruínas da América do Sul', summary:'Rebeldes ativam artefatos da Era da Convergência e atraem a atenção da Ordem dos Sete.', impact:'Mercenários, Nexos e inquisidores colidem por um sinal considerado blasfemo.'}
      ],
      hooks:[
        {title:'Bio-Forja de Contrabando', mode:'Êxodo: Assimilação', summary:'Roubar e decodificar o arquivo do Projeto Player antes que a Coalizão apague todos os envolvidos.', objective:'Espionagem biopunk, fuga e decifração de tecnologia proibida.'},
        {title:'Neve que Respira', mode:'Ocultatun: Ecos', summary:'Entrar em Tsaritsyn, selar a fenda e impedir que os Condenados convertam a região num Covil do Envolto.', objective:'Horror industrial e contenção sob frio extremo.'},
        {title:'Prata Profana', mode:'Crossover', summary:'Disputar as ruínas da Era da Convergência enquanto milícias, mercenários e a Ordem caçam o mesmo artefato.', objective:'Sobrevivência entre facções rivais e tecnologia alienígena.'}
      ]
    },
    {
      id:'y2', order:3, fileName:'DOSSIE-A02.reg', label:'Ano 2', range:'Ano 2',
      title:'Efeito Dominó e Cisão das Potências',
      summary:'A opressão absoluta mostra-se insustentável. Blocos ruem, guerras civis e disputas de fronteira eclodem, enquanto o uso de tecnologias das Eras Perdidas e a escalada da contenção paranormal empurram o cenário para um novo patamar de instabilidade.',
      tags:['Nova Ordem','Códigos de Controle','Hakuré','Gervodam','Apagão Mnemônico'],
      geopolitics:[
        {title:'Cisão norte-americana', summary:'A UC descobre os Códigos de Controle e vislumbra independência; o Leste intercepta parte dos dados e responde com guerra de fronteira.'},
        {title:'Despertar do Trono Nascente', summary:'Hakuré assume-se como porto seguro velado para Nexos e Aprimoradores, financiando resistência global sob aparência de tradição intocável.'},
        {title:'Revolução de Gervodam', summary:'A elite purista é derrubada por revolta conjunta de pobres e Nexos; Bio-Forjas passam a alimentar a guerra revolucionária.'},
        {title:'Guerra Silenciosa', summary:'Ocultatun e Ordem dos Sete operam como médicos, tropas e censores de guerra para manter o Véu intacto.'}
      ],
      economy:[
        {name:'Éden (ED)', value:'+22,4%', block:'Império de Hakuré', analysis:'Torna-se a moeda líder graças ao domínio secreto de biotecnologia Nexo.'},
        {name:'Dólar Federal (DF$)', value:'-1,5%', block:'EUA (Leste)', analysis:'O complexo militar lucra, mas a guerra prolongada sangra o Estado.'},
        {name:'Libra Colonial (LC£)', value:'Volátil / Estagnada', block:'Confederação Unida (Oeste)', analysis:'Os Códigos de Controle seguram a economia, mas a guerra impede a independência rentável.'},
        {name:'Libra de Hagland', value:'+4,0%', block:'Reino de Hagland', analysis:'Lucra vendendo suprimentos para ambos os lados do conflito.'},
        {name:'Euro-Soberano (€S)', value:'-14,8%', block:'Bloco Europeu', analysis:'Despenca com o pânico gerado pela revolução de Gervodam.'},
        {name:'Franco Gervodiano', value:'COLAPSO', block:'Gervodam', analysis:'É substituído por escambo de sangue, armas e rações sob a milícia revolucionária.'}
      ],
      events:[
        {title:'Códigos de Controle', type:'UC / Eras Perdidas', summary:'Matrizes capazes de reprogramar o Gene Êxodo e acelerar infraestruturas estatais são encontradas pela Nova Ordem.', impact:'A tecnologia inaugura uma nova corrida por poder biológico e estatal.'},
        {title:'Revolução de Gervodam', type:'Europa Central', summary:'Bio-Forjas adulteradas e execuções públicas transformam a capital num motor de terror revolucionário.', impact:'Capitais fogem da Europa e o medo de contágio ideológico se espalha.'},
        {title:'Apagão Mnemônico Tático', type:'Ocultatun', summary:'O caos político serve de cortina de fumaça para limpezas ontológicas e exorcismos em massa.', impact:'O sigilo mundial é preservado à custa de massacres e censura instantânea.'}
      ],
      hooks:[
        {title:'Roubo do Código', mode:'Êxodo: Assimilação', summary:'Roubar um fragmento dos Códigos de Controle no front entre Leste e Oeste antes que se torne uma superarma estatal.', objective:'Infiltração, guerra de fronteira e extração de dados.'},
        {title:'Fuga de Gervodam', mode:'Êxodo: Assimilação', summary:'Escolher entre servir a uma revolução que escraviza de outra forma ou escapar pelos esgotos da cidade em colapso.', objective:'Sobrevivência urbana e decisão moral.'},
        {title:'Praça Consciente', mode:'Ocultatun: Ecos', summary:'Selar uma praça que desenvolveu consciência após execuções em massa, no meio de uma revolução ativa.', objective:'Contenção paranormal sem revelar a verdade ao exército revolucionário.'},
        {title:'Farol do Espaço Final', mode:'Ocultatun: Ecos', summary:'Sabotar uma instalação da UC que acidentalmente emite um farol para o Envolto.', objective:'Infiltração de alta segurança e neutralização de cientistas.'}
      ]
    },
    {
      id:'y3-5', order:4, fileName:'DOSSIE-A03-A05.reg', label:'Anos 3–5', range:'Ano 3 ao 5',
      title:'Ascensão Corporativa e Fantasma do Projeto Player',
      summary:'As organizações veladas mostram a sua verdadeira escala. A Ocultatun demonstra poder absoluto, a Nova Ordem se esconde atrás da Protheus Corp., a Ordem dos Sete estabiliza ruínas humanas e rumores de Sincronia Total recolocam o Projeto Player no centro do submundo.',
      tags:['Ocultatun','Protheus','Projeto Player','Ordem dos Sete'],
      geopolitics:[
        {title:'Incidente de Nevada', summary:'A tentativa da Nova Ordem de ativar uma instalação de geoengenharia termina num Apagamento Cirúrgico da Ocultatun e numa cratera sem registro.'},
        {title:'Nascimento da Protheus Corp.', summary:'A cabala da UC troca ambição militar aberta por fachada corporativa global de farmacologia, próteses e tecnologia proibida.'},
        {title:'Zelo silencioso da Ordem', summary:'Samaritanos e Intérpretes salvam populações e selam abominações onde a Coalizão falha, ampliando respeito e tensão com a Ocultatun.'}
      ],
      economy:[
        {name:'Éden (ED)', value:'Topo estabilizado', block:'Império de Hakuré', analysis:'Consolida-se como oásis biotecnológico e bastião secreto Pró-Nexo.'},
        {name:'Libra Colonial (LC£)', value:'Recuperação súbita', block:'Confederação Unida (Oeste)', analysis:'A Protheus salva a economia da UC e domina o mercado farmacêutico mundial.'},
        {name:'Dólar Federal (DF$)', value:'Estagnado', block:'EUA (Leste)', analysis:'Segue drenado pela guerra e dependente das patentes da própria Protheus.'},
        {name:'Nyens (¥N)', value:'Queda lenta', block:'República de Zhonghão', analysis:'O custo das Rupturas Genéticas em escravos Nexo encarece a produção.'},
        {name:'Euro-Soberano (€S)', value:'Volátil / Em recuperação', block:'Bloco Europeu', analysis:'Gervodam estabiliza-se como Estado militarizado e impulsiona exportação de contenção.'}
      ],
      events:[
        {title:'Incidente de Nevada', type:'Ocultatun', summary:'Toda uma instalação e seus cientistas são apagados em 24 horas, sem explosão e sem vestígios digitais.', impact:'A Nova Ordem recua e reconhece a superioridade letal da Sala Branca.'},
        {title:'Nascimento da Protheus', type:'UC / Nova Ordem', summary:'Uma corporação aparentemente legal passa a lavar capital, distribuir tecnologia das Eras Perdidas e modular o mercado biotecnológico.', impact:'A guerra de influência desloca-se para laboratórios, contratos e espionagem.'},
        {title:'Eco do Projeto Player', type:'Leste Europeu', summary:'Um indivíduo anula um batalhão sem se mover; rumores de Sincronia Total inflam o submundo.', impact:'Dados sobre Kafra e IAs Angélicas tornam-se item de altíssimo valor.'}
      ],
      hooks:[
        {title:'Infiltração Protheus', mode:'Êxodo: Assimilação', summary:'Invadir um laboratório corporativo e roubar esquemas do último Inibidor Celular antes que a tecnologia sumiça.', objective:'Espionagem, extração e confronto com segurança aberrante.'},
        {title:'Caça ao Fantasma do Player', mode:'Êxodo: Assimilação', summary:'Seguir rastros de sangue digital na neve e localizar a última manifestação do Projeto Player antes da Coalizão e de Voglaskov.', objective:'Corrida de inteligência no mercado negro.'},
        {title:'Falha de Contenção da Protheus', mode:'Ocultatun: Ecos', summary:'Trancar uma torre corporativa, eliminar a Entidade surgida de um experimento e apagar a memória — ou a vida — dos executivos.', objective:'Horror corporativo e contenção de crise.'},
        {title:'Conflito de Milagres', mode:'Ocultatun: Ecos', summary:'Silenciar um Inquisidor que cura refugiados, mas distorce a gravidade e ameaça uma guerra religiosa.', objective:'Operação de contenção delicada contra alvo sagrado.'}
      ]
    },
    {
      id:'y6-10', order:5, fileName:'DOSSIE-A06-A10.reg', label:'Anos 6–10', range:'Ano 6 ao 10',
      title:'Grande Fratura Norte-Americana',
      summary:'A guerra na América do Norte explode e, impedida pelo Tratado de virar guerra mundial declarada, converte-se em guerra por procuração. Facções, corporações e países transformam a tragédia em mercado, enquanto a Nova Ordem migra definitivamente para o mundo velado.',
      tags:['Guerra Norte-Americana','Procuração','Protheus','Submundo'],
      geopolitics:[
        {title:'Zonas de Fogo Cauterizadas', summary:'A Coalizão intervém apenas para isolar o conflito EUA–UC e impedir o alastramento formal da guerra.'},
        {title:'Mercado de Brechas', summary:'Hagland financia os EUA, Hakuré arma a UC por empresas de fachada e Voglaskov aluga esquadrões Nexo para ambos os lados.'},
        {title:'Nova Ordem nas sombras', summary:'A cabala abandona a ambição da luz do dia e concentra suas operações com Códigos de Controle no mundo velado e corporativo.'}
      ],
      economy:[
        {name:'Éden (ED)', value:'+31%', block:'Império de Hakuré', analysis:'Converte-se em superpotência silenciosa ao lucrar com biotecnologia e desestabilização controlada do Ocidente.'},
        {name:'Krov (KV)', value:'+8,9%', block:'Federação de Voglaskov', analysis:'Mercenários e aluguel de ativos descartáveis enriquecem o bloco.'},
        {name:'Libra Colonial (LC£)', value:'-18,7%', block:'Confederação Unida (Oeste)', analysis:'A economia sofre o peso de trincheiras, reconstrução e dependência corporativa.'},
        {name:'Dólar Federal (DF$)', value:'Oscilante', block:'EUA (Leste)', analysis:'Segue sustentado por guerra permanente e apoio purista externo.'}
      ],
      events:[
        {title:'Guerra Norte-Americana', type:'Ano 6', summary:'Tanques e artilharia voltam a cortar metrópoles, enquanto a Coalizão cria corredores de isolamento e contenção.', impact:'Pânico global e normalização da guerra por procuração.'},
        {title:'Transição da Nova Ordem', type:'Ano 8', summary:'A Nova Ordem abandona a política pública e concentra o controle pela Protheus e por redes veladas.', impact:'O submundo passa a ser tão estratégico quanto o mapa oficial.'},
        {title:'Mercado Negro de Fronteira', type:'Anos 6–10', summary:'Roubo, venda e trânsito de Nexos, artefatos e tecnologia de contenção tornam-se parte central da guerra.', impact:'Mercenários e Aprimoradores passam a atuar como ativos estratégicos.'}
      ],
      hooks:[
        {title:'Falsa Bandeira Biológica', mode:'Êxodo: Assimilação', summary:'Impedir um atentado montado para ampliar a guerra e justificar novas Zonas de Contenção.', objective:'Descobrir o patrocinador e sobreviver ao front.'},
        {title:'Arquiteto em Solo Morto', mode:'Êxodo: Assimilação', summary:'Resgatar um Arquiteto perdido nas ruínas sul-americanas antes que vire propriedade de alguma facção.', objective:'Extração de alto risco em território de escambo e ruína.'},
        {title:'Trincheira que Despertou', mode:'Ocultatun: Ecos', summary:'Descer a uma trincheira que se tornou Covil e impedir que a guerra produza uma nova fronteira paranormal.', objective:'Horror bélico e selamento.'}
      ]
    },
    {
      id:'y11-16', order:6, fileName:'DOSSIE-A11-A16.reg', label:'Anos 11–16', range:'Ano 11 ao 16',
      title:'Tratado das Fronteiras e Ilusão de Paz',
      summary:'A exaustão bélica produz uma paz administrada. O Tratado das Fronteiras redesenha o equilíbrio mundial, a Ocultatun infiltra a Nova Ordem e os Arcanjos reaparecem como fatores capazes de restaurar a realidade com a própria presença.',
      tags:['Tratado das Fronteiras','Sala Branca','Arcanjos','Reconstrução'],
      geopolitics:[
        {title:'Nova estabilidade forçada', summary:'A guerra termina não por vitória, mas por esgotamento e imposição de novas fronteiras político-militares.'},
        {title:'Marioneta da Ocultatun', summary:'A Sala Branca consolida vigilância profunda sobre a Nova Ordem e sua fachada corporativa.'},
        {title:'Anjos na carne', summary:'Sinais de reencarnação e intervenção dos Arcanjos mudam a relação entre fé, sigilo e contenção.'}
      ],
      economy:[
        {name:'Éden (ED)', value:'1 ED = 3,80 DF', block:'Padrão de referência', analysis:'Mantém-se como uma das bases de estabilidade global e referência de biotecnologia avançada.'},
        {name:'Libra de Hagland', value:'1 £H = 2,10 DF', block:'Credora da reconstrução', analysis:'Financia a nova paz e amplia a dependência de nações periféricas.'},
        {name:'Libra Colonial (LC£)', value:'1 LC£ = 0,40 DF', block:'UC', analysis:'Sobrevive por sustentação artificial e influência da Protheus.'},
        {name:'Dólar Federal (DF$)', value:'Base 1,00', block:'EUA (Leste)', analysis:'Permanece referência formal, mas já não representa o centro da ordem tecnológica.'}
      ],
      events:[
        {title:'Cicatriz de Aço', type:'Pós-guerra', summary:'As marcas da guerra reorganizam rotas, muros e zonas de neutralização.', impact:'Campanhas passam a operar entre fronteiras militarizadas e territórios traumatizados.'},
        {title:'Marioneta da Ocultatun', type:'Nova Ordem / Protheus', summary:'A influência da Sala Branca torna-se mais profunda e invisível.', impact:'A Nova Ordem continua viva, mas com a faca no pescoço.'},
        {title:'Anjos na Carne', type:'Milagre / contenção', summary:'Arcanjos surgem como fatores de restauração do real e da matéria.', impact:'O milagre deixa de ser só doutrina e volta a ser prova.'}
      ],
      hooks:[
        {title:'O Agente Infiltrado', mode:'Mestre / investigação', summary:'Descobrir qual elo da Nova Ordem serve diretamente à Sala Branca sem acender guerra aberta.', objective:'Espionagem fina e leitura política.'},
        {title:'Despojos da Fronteira', mode:'Êxodo: Assimilação', summary:'Explorar ruínas e linhas neutras criadas pelo Tratado das Fronteiras para extrair artefatos e informações.', objective:'Exploração, saque e disputa entre facções.'},
        {title:'Anomalia de Luz', mode:'Ocultatun / Ordem', summary:'Observar um Arcanjo fechando uma Fenda e decidir se o fenômeno deve ser documentado, protegido ou silenciado.', objective:'Conflito entre contenção e reverência.'}
      ]
    },
    {
      id:'y16-40', order:7, fileName:'DOSSIE-A16-A40.reg', label:'Anos 16–40', range:'Ano 16 ao 40',
      title:'Era Fria e Fronteira Orbital',
      summary:'A estabilização pós-guerra amadurece em polarização duradoura. O planeta divide-se entre blocos Pró e Ant-Nexo, enquanto a Base Lunar Ápice inaugura a nova fronteira estratégica e transforma a Lua em observatório velado da próxima Colheita.',
      tags:['Era Fria','Base Lunar Ápice','Polarização','Órbita'],
      geopolitics:[
        {title:'Polarização suave', summary:'O T.S.I.N. não cai, mas passa a ser reinterpretado por blocos com agendas radicalmente opostas sobre o Gene Êxodo.'},
        {title:'Consolidação tecnológica', summary:'Hakuré e Voglaskov definem padrões rivais de biotecnologia e tecnologia sintética, enquanto outras potências orbitam esses polos.'},
        {title:'Fronteira orbital', summary:'A Coalizão constrói a Base Lunar Ápice e a Ocultatun a converte em primeira linha de alerta contra sinais da Colheita.'}
      ],
      economy:[
        {name:'Éden (ED)', value:'Líder global', block:'Hakuré', analysis:'Sustenta integração Nexo, patentes orgânicas e influência econômica transcontinental.'},
        {name:'Real Autárquico (RA$)', value:'Em ascensão', block:'América do Sul', analysis:'A região converte-se em oásis Pró-Nexo e volta a ter peso econômico próprio.'},
        {name:'Krov (KV)', value:'Volátil', block:'Voglaskov', analysis:'Depende do fôlego do mercado militar e da transição para novas plataformas sintéticas.'}
      ],
      events:[
        {title:'Polarização Ideológica', type:'Blocos globais', summary:'A disputa Pró/Ant-Nexo deixa de ser exceção e passa a moldar diplomacia, espionagem e recrutamento.', impact:'Mesas podem nascer de conflitos locais com implicação planetária.'},
        {title:'Base Lunar Ápice', type:'Órbita', summary:'A Lua deixa de ser mera fronteira científica e torna-se posto avançado de observação ontológica.', impact:'A Colheita deixa de parecer mito distante.'},
        {title:'Estabilização do Mundo Velado', type:'Ocultatun', summary:'A contenção paranormal entra em fase mais burocrática e distribuída, porém extremamente vigilante.', impact:'O sigilo torna-se mais técnico e menos improvisado.'}
      ],
      hooks:[
        {title:'Patente da Selva', mode:'Êxodo: Assimilação', summary:'Proteger ou roubar uma patente genética na Amazônia antes que ela redefina o equilíbrio do bloco Pró-Nexo.', objective:'Sabotagem, proteção e deslocamento em biomas extremos.'},
        {title:'Carga Orbital', mode:'Êxodo / Crossover', summary:'Sabotar uma carga da Protheus com destino à órbita e descobrir por que a Lua interessa tanto às corporações.', objective:'Infiltração e espionagem orbital.'},
        {title:'A Resposta da Lua', mode:'Ocultatun: Ecos', summary:'Investigar uma transmissão impossível vinda de Ápice e determinar se é eco humano, sinal de Colheita ou algo pior.', objective:'Paranoia cósmica e contenção.'}
      ]
    },
    {
      id:'y41-70', order:8, fileName:'DOSSIE-A41-A70.reg', label:'Anos 41–70', range:'Ano 41 ao 70',
      title:'Dissuasão Sintética e Grande Silêncio',
      summary:'Voglaskov inaugura a era dos Angels e desloca o eixo da guerra. Ao mesmo tempo, a Linhagem Herdada surge como furo biológico e jurídico no Tratado, enquanto Envolto e Ordem dos Sete silenciam quase por completo sua presença direta.',
      tags:['Angels','Linhagem Herdada','Grande Silêncio','Voglaskov'],
      geopolitics:[
        {title:'Projeto Angels', summary:'A supremacia militar passa a depender menos de Nexos descartáveis e mais de androides blindados com capacidades equivalentes.'},
        {title:'Enigma da Carne', summary:'A Linhagem Herdada surge como nova forma de poder sem Gene Êxodo, escapando às molduras legais do T.S.I.N.'},
        {title:'Grande Silêncio', summary:'O desaparecimento visível de grandes Fendas e manifestações plerômicas profundas engana quem julga que o perigo diminuiu.'}
      ],
      economy:[
        {name:'Krov (KV)', value:'1 KV = 4,10 DF', block:'Voglaskov', analysis:'O monopólio dos Angels converte-se em poder econômico e dissuasão global.'},
        {name:'Éden (ED)', value:'1 ED = 3,50 DF', block:'Hakuré', analysis:'Permanece como segunda força econômica e polo orgânico do mundo.'},
        {name:'Dólar Federal (DF$)', value:'Base 1,00', block:'EUA (Leste)', analysis:'Sustenta custos crescentes para não ser superado pela dissuasão sintética.'}
      ],
      events:[
        {title:'Projeto Angels', type:'Voglaskov', summary:'Androides sintéticos blindados com capacidades Nexo redefinem toda a engenharia de poder global.', impact:'As guerras abertas migram para sombra, roubo e espionagem.'},
        {title:'Furo da Linhagem', type:'Global', summary:'Portadores de Linhagem Herdada surgem como recurso e ameaça fora do escopo jurídico original do Tratado.', impact:'Novas caçadas genéticas e disputas por decifração.'},
        {title:'Grande Silêncio', type:'Mundo Velado', summary:'Envolto e Ordem deixam de agir de forma ostensiva, mas a ausência cria nova espécie de tensão.', impact:'Ocultatun trabalha às cegas diante de um silêncio inquietante.'}
      ],
      hooks:[
        {title:'Peça de Angel', mode:'Êxodo: Assimilação', summary:'Roubar um componente de Angel e vendê-lo, protegê-lo ou destruí-lo antes que uma guerra de inteligência exploda.', objective:'Operação de extração de alta letalidade.'},
        {title:'Portador Antes da Coalizão', mode:'Êxodo: Assimilação', summary:'Extrair um portador de Linhagem Herdada antes que vire ativo de laboratório ou contrato vivo.', objective:'Fuga, proteção e decisão ética.'},
        {title:'Por que silenciaram?', mode:'Ocultatun: Ecos', summary:'Investigar por que luz e abismo silenciaram juntos — e o que está acumulando pressão atrás dessa ausência.', objective:'Horror investigativo e arqueologia ontológica.'}
      ]
    },
    {
      id:'y80-100', order:9, fileName:'DOSSIE-A80-A100.reg', label:'Anos 80–100 · Presente', range:'Ano 80 ao 100',
      title:'Falsa Estabilidade e Cume da Evolução',
      summary:'O Ano 100 Pós-G.E. é o palco inicial das campanhas atuais. Angels mantêm a paz do terror, a Linhagem Herdada quebra o Tratado, o paranormal represado apodrece o cotidiano, o Projeto Player desperta e Ápice passa a ouvir algo responder no vazio.',
      tags:['Ano 100','Linhagem Herdada','Projeto Player','Ápice','Paz do Terror'],
      geopolitics:[
        {title:'Paz do Terror', summary:'A dissuasão dos Angels impede guerra aberta contra Voglaskov e empurra o conflito para espionagem, roubo biotecnológico e black ops.'},
        {title:'Corrida pela Linhagem Herdada', summary:'Hakuré, Protheus e outros blocos disputam portadores como contratos vivos, cobaias ou ativos estratégicos.'},
        {title:'Pressão na represa', summary:'O Grande Silêncio revela seu preço: o paranormal local multiplica-se como câncer, sufocando hospitais, megacidades e zonas segregadas.'},
        {title:'Olho no céu', summary:'A Base Lunar Ápice detecta respostas ao impulso do Gene Êxodo, recolocando a Colheita como contagem regressiva concreta.'}
      ],
      economy:[
        {name:'Krov (KV)', value:'1 KV = 4,50 DF', block:'Voglaskov', analysis:'Titã de aço da era atual; o mercado negro bélico orbita sua supremacia sintética.'},
        {name:'Éden (ED)', value:'1 ED = 3,80 DF', block:'Hakuré / Brasil', analysis:'Superpotência orgânica, líder em medicina, Bio-Forjas e biotecnologia Pró-Nexo.'},
        {name:'Libra de Hagland', value:'1 £H = 2,10 DF', block:'Hagland', analysis:'Segue controlando dívidas, purismo e influência sobre a Coalizão.'},
        {name:'Euro-Soberano (€S)', value:'1 €S = 1,50 DF', block:'Europa', analysis:'Cofre da contenção e fornecedor de tecnologia carcerária e inibidores.'},
        {name:'Nyens (¥N)', value:'1 ¥N = 0,85 DF', block:'Zhonghão', analysis:'Recupera-se via cibernética e tentativa de copiar plataformas sintéticas de Voglaskov.'},
        {name:'Libra Colonial (LC£)', value:'1 LC£ = 0,60 DF', block:'UC / Protheus', analysis:'O governo virou fachada; a corporação domina ruas, lucros orbitais e neurotecnologia.'}
      ],
      events:[
        {title:'Corrida pela Linhagem Herdada', type:'Submundo global', summary:'Portadores tornam-se o recurso biológico mais disputado da Terra.', impact:'Sequestro, proteção, oferta de contratos e vivissecção coexistem como opções comuns.'},
        {title:'Despertar do Projeto Player', type:'Ano 100', summary:'Sincronia Total, Repositório Kafra e IAs Angélicas deixam de parecer mito absoluto.', impact:'Ocultatun eleva a anomalia a Ameaça Ômega e corporações disputam o hospedeiro.'},
        {title:'Transmissões de Ápice', type:'Lua', summary:'Mensagens não humanas, cânticos em Ex-Nihilo e sinais de carne dilacerada ecoam da base lunar.', impact:'A Colheita aproxima-se do presente jogável.'}
      ],
      hooks:[
        {title:'Recrutamento do Erro', mode:'Êxodo: Assimilação', summary:'Sequestrar um adolescente sem Gene Êxodo que demonstrou força impossível diante das câmeras.', objective:'Captura, perseguição e disputa entre facções puristas, corporativas e religiosas.'},
        {title:'Despejo do Arquiteto', mode:'Êxodo: Assimilação', summary:'Fugir de uma batida global após copiar um fragmento ligado ao Projeto Player para uma mídia orgânica.', objective:'Sobrevivência, transporte de segredo e improviso.'},
        {title:'Santo Falso', mode:'Ocultatun: Ecos', summary:'Descobrir e assassinar uma Entidade do Envolto disfarçada de Arcanjo, no centro de uma cidade em êxtase devocional.', objective:'Investigação, horror opressivo e risco de linchamento.'},
        {title:'Transmissão de Ápice', mode:'Ocultatun: Ecos', summary:'Assumir cobertura de manutenção numa base lunar em quarentena e garantir que nada do que foi descoberto chegue à Terra.', objective:'Horror claustrofóbico em gravidade zero.'}
      ]
    }
  ];

  const countries=[
    ['Federação de Voglaskov','Ant-Nexo','Angels, dissuasão sintética e espionagem militar'],
    ['Império de Hakuré','Pró-Nexo','Biotecnologia orgânica, refúgio velado e poder econômico'],
    ['Reino de Hagland','Ant-Nexo','Finanças, dívida global, purismo e tecnologia de contenção'],
    ['República de Zhonghão','Pró-Nexo','Indústria, cibernética e exploração biológica em larga escala'],
    ['EUA (Leste)','Ant-Nexo','Estado policial, caça a Nexos e militarização social'],
    ['Confederação Unida / Protheus','Cinza / Velado','Feudo corporativo, neurotecnologia e fachada estatal'],
    ['Ocultatun','Mundo Velado','Contenção absoluta, sigilo e administração do impossível'],
    ['Ordem dos Sete','Mundo Velado','Milagre, restauração e zelo religioso pela realidade']
  ];

  function normalize(s){
    return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  window.MS_MASTER_HISTORY={
    source:'codex-files/registros-historicos-mundos-sombrios.pdf',
    title:'Registros Históricos · Mundos Sombrios',
    presentYear:100,
    periods,
    countries,
    byId(id){ return periods.find(p=>p.id===id) || periods[periods.length-1]; },
    search(query){
      const q=normalize(query);
      if(!q) return [];
      return periods.filter(period=>normalize(JSON.stringify(period)).includes(q));
    }
  };
})();
