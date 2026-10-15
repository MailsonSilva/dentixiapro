# Diretrizes Técnicas para Desenvolvimento Mobile (Flutter)

Este guia estabelece os padrões arquiteturais, convenções de código, gestão de estado, persistência de dados e ergonomia de interface para as aplicações em `apps/mobile/`.

## 1. Arquitetura de Software e Separação de Camadas
Adotamos uma abordagem modular e desacoplada inspirada em **Clean Architecture**:

```
apps/mobile/lib/
├── core/                  # Serviços globais, tema, utilitários e clientes (HTTP/DB)
│   ├── database/          # SQLite / persistência local (migrations, helpers, DAOs)
│   ├── network/           # Clientes HTTP / APIs remotas
│   └── theme/             # Design Tokens, tipografia e estilos globais
├── features/              # Módulos funcionais isolados
│   └── [feature_name]/
│       ├── data/          # Models, DTOs, DataSources e Repositórios concretos
│       ├── domain/        # Entidades de negócio e Contratos de repositório (Interfaces)
│       └── presentation/  # Telas, Widgets atômicos e State Holders (Bloc/Notifier)
└── main.dart
```

### Regras de Dependência:
- A camada de **Apresentação (Presentation)** depende apenas do **Domínio (Domain)**. Nunca chame a camada de dados diretamente de dentro de um Widget.
- A camada de **Dados (Data)** implementa os contratos da camada de **Domínio**.
- O **Domínio (Domain)** é composto por Dart puro: livre de dependências do framework Flutter, widgets ou pacotes externos.

---

## 2. Gerenciamento de Estados de Tela (Regra dos 4 Estados)
Toda tela que consulta, carrega ou submete informações DEVE implementar explicitamente os quatro estados visuais da UI:
1. **Estado de Carregamento (`LoadingState`)**:
   - Usar *shimmer skeleton* ou indicador visual de progresso contextualizado.
   - Evitar bloquear a tela inteira se parte do conteúdo já estiver em cache.
2. **Estado de Conteúdo Vazio (`EmptyState`)**:
   - Mensagem amigável explicando por que não há itens na lista.
   - Ação visual clara e direta (*Call to Action*), com botão destacado.
3. **Estado de Falha/Erro (`ErrorState`)**:
   - Mensagem em Português claro, sem termos técnicos indecifráveis para o usuário final.
   - Botão obrigatório de *"Tentar Novamente"* para reexecutar a consulta.
4. **Estado de Sucesso/Dados (`SuccessState`)**:
   - Renderização limpa, com paginação sob demanda quando houver listas extensas.

---

## 3. Diretrizes de UI, Widgets e Performance
1. **Construtores `const`**: Sempre declare construtores `const` em Widgets sem estado mutável para evitar reconstruções desnecessárias.
2. **Tamanho Mínimo de Alvo de Toque (Touch Target)**:
   - Todo botão, ícone interativo ou elemento clicável deve ter uma área de toque de no mínimo 48x48 dp.
3. **Alinhamento com Tokens Visuais**:
   - Cores, raios de borda, espaçamentos e fontes devem ser consumidos centralmente a partir de `core/theme/` (gerado a partir de `_specs/design-tokens.json`).
   - É proibido usar cores "mágicas" (`Color(0xFF123456)`) soltas no corpo dos widgets.

---

## 4. Persistência de Dados e Testabilidade
1. **Migrações Incrementais e Versionadas**:
   - Nunca altere schemas existentes diretamente; utilize migrations sequenciais vinculadas à versão do banco.
2. **Operações em Lote**:
   - Mutações de múltiplos registros devem utilizar transações ou batches para evitar retenção de I/O em disco.
3. **Testabilidade em Memória**:
   - Testes unitários de repositórios e DAOs locais devem rodar em memória (ex.: `sqflite_common_ffi`), garantindo feedback em milissegundos sem depender de emulador físico.
