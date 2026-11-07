# Mundos Sombrios V2.8.12 — Correção de Ativação Lazy/Offline

- Corrige módulos carregados após `DOMContentLoaded` que registravam inicialização tarde demais e nunca executavam.
- Corrige Progressão V2.8.9: Viewer universal, PEG, Núcleo 3D, Arconte e controles de recurso agora inicializam quando carregados sob demanda.
- Corrige Sandbox Integral: barra QA e login/troca Jogador/Mestre/ADM inicializam mesmo quando o módulo é injetado após `window.load`.
- Corrige inicialização tardia de módulos de Forja: Nexo, Ordem dos Sete, registro de poderes, atualizações contextuais e Dice 3D.
- Não altera regras nem dados canônicos; corrige somente o ciclo de vida de carregamento e ativação das implementações já existentes.
