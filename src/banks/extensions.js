// Itens extras e correções sem editar os arquivos dos bancos.
// Carregado depois de todos os bancos (veja build.config.mjs).
//
// Acrescentar itens a um banco existente:
//   GHX.addItems('gh300-practice-a', [
//     { id: 'ext-001', d: 2, type: 'single', q: '...', o: ['...', '...'], a: 0,
//       why: ['...', '...'], exp: '...', ref: ['https://docs.github.com/...'] },
//   ]);
//
// Corrigir um item já registrado (por exemplo, quando a documentação mudar):
//   GHX.patchItem('fa-d2-6', { exp: 'Texto atualizado...' });
//
// Itens do tipo "ps" vão automaticamente para a série problema–solução do banco.
var GHX = globalThis.GHX || (globalThis.GHX = {});
