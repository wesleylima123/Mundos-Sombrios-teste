# Auditoria — Imortalização de Ficha V2.5.3

## Objetivo
Garantir que nenhuma regra secundária impeça o usuário de salvar uma ficha parcialmente construída.

## Contrato
A ficha pode ser imortalizada quando possui **Nome**, **Expansão/Origem** e **Classe**. A regra é idêntica em Êxodo e Ocultatun.

## Campos não bloqueantes
Conceito, origem nacional, ocupação, vínculos, motivação, relação com o mundo, atributos, pontos, perícias, talentos, poderes, recursos, evolução, equipamento, dados específicos, avatar e galeria.

## Regras externas preservadas
A mudança não remove:
- limite de slots de ficha da Soul Economy;
- entitlement de expansão para contas Jogador;
- permissões de proprietário/Mestre;
- histórico de versões;
- persistência segura no Supabase.

## Resultado
A UI e o backend aplicam o mesmo contrato mínimo, eliminando divergência entre validação visual e persistência.
