# Mundos Sombrios V2.8.10

## Forja de Êxodo
- removido exclusivamente em Êxodo o seletor inicial de Categoria e seus ícones 3D;
- Ocultatun continua utilizando o seletor visual de Categoria;
- a Categoria de Êxodo agora é inferida a partir da escolha posterior de Categoria/Classe/Especialização;
- Nexo Padrão usa diretamente Combatente, Sobrevivente ou Especialista como Categoria de Base;
- expansões especiais mapeiam sua classe para a Categoria correspondente sem criar uma segunda escolha visual;
- atributos, perícias gratuitas e PE concedidos pela Categoria continuam sendo aplicados automaticamente;
- o campo canônico `category` continua salvo no payload da ficha e continua sujeito às validações do servidor;
- fichas antigas que já possuem Categoria continuam compatíveis.

## Compatibilidade
Nenhuma regra de Categoria foi removida. A alteração elimina apenas a duplicidade de seleção na experiência de criação de Êxodo.
