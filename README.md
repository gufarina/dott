# Dott

App desktop Windows de captura pessoal e segundo cerebro, que conecta as notas sozinho.
Repositorio PRIVADO do codigo. A vitrine publica (README + instalador) e outra:
github.com/gufarina/dott.

## Rodar

```
npm install
npm run tauri dev      # app em janela, com hot reload
npm run tauri build    # release + instalador NSIS em src-tauri/target/release/bundle/nsis
```

## Onde as coisas estao

| Caminho | O que e |
|---|---|
| `src-tauri/src/` | core Rust: disco, janelas, atalho global, backup |
| `src/store.ts` | estado unico (Zustand) e derivacoes |
| `src/lib/graphify.ts` | motor de conexao automatica entre notas |
| `src/features/` | UI por feature (board, editor, constelacao, inbox, tarefas, onboarding) |
| `src/widget/` | a bolinha flutuante (janela propria) |
| `landing/` | landing page de lancamento e cabecalho do GitHub |

## Documentacao do produto

Fora deste repo, no studio: `studio-farina/clients/dott/`

- `client.md` - contrato do Client e linguagem ubiqua
- `docs/arquitetura.md` - arquitetura medida
- `docs/features.md` - mapa de features para marketing
- `squad/knowledge/armadilhas-medidas.md` - armadilhas tecnicas que ja custaram tempo

## Versao

A versao vive em tres arquivos e os tres tem que bater: `package.json`,
`src-tauri/Cargo.toml` e `src-tauri/tauri.conf.json` (este ultimo nomeia o instalador).
