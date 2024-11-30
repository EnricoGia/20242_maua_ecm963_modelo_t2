const Redux = require('redux');
const prompts = require('prompts');

// Criadores de ação
const criarContrato = (nome, taxa) => {
  return {
    type: 'CRIAR_CONTRATO',
    payload: {
      nome,
      taxa,
      data: new Date().toISOString().split('T')[0], // Inclui data
    },
  };
};

const cancelarContrato = (nome, dataInicio) => {
  const dataAtual = new Date();
  const dataContrato = new Date(dataInicio);
  const diferencaMeses =
    dataAtual.getFullYear() * 12 +
    dataAtual.getMonth() -
    (dataContrato.getFullYear() * 12 + dataContrato.getMonth());
  const multa = diferencaMeses < 3 ? 100 : 0;
  return {
    type: 'CANCELAR_CONTRATO',
    payload: {
      nome,
      multa,
      data: dataAtual.toISOString().split('T')[0], // Inclui data
    },
  };
};

const solicitarCashback = (nome, valor) => {
  return {
    type: 'CASHBACK',
    payload: { nome, valor },
  };
};

const comprarProduto = (nome, produto, valor) => {
  return {
    type: 'COMPRAR_PRODUTO',
    payload: {
      nome,
      produto,
      valor,
      cashback: valor * 0.1,
    },
  };
};

// Reducers
const historicoDePedidosDeCashback = (state = [], acao) => {
  if (acao.type === 'CASHBACK') {
    return [
      ...state,
      { ...acao.payload, status: acao.payload.valor <= (state.find((e) => e.nome === acao.payload.nome)?.cashback || 0) ? 'ATENDIDO' : 'NAO_ATENDIDO' },
    ];
  }
  return state;
};

const caixa = (state = 0, acao) => {
  if (acao.type === 'CRIAR_CONTRATO') return state + acao.payload.taxa;
  if (acao.type === 'CANCELAR_CONTRATO') return state + acao.payload.multa;
  if (acao.type === 'COMPRAR_PRODUTO') return state;
  if (acao.type === 'CASHBACK' && acao.payload.status === 'ATENDIDO') return state - acao.payload.valor;
  return state;
};

const contratos = (state = [], acao) => {
  if (acao.type === 'CRIAR_CONTRATO') return [...state, acao.payload];
  if (acao.type === 'CANCELAR_CONTRATO') return state.filter((c) => c.nome !== acao.payload.nome);
  return state;
};

const cashbacks = (state = {}, acao) => {
  if (acao.type === 'COMPRAR_PRODUTO') {
    const cashbackAtual = state[acao.payload.nome] || 0;
    return { ...state, [acao.payload.nome]: cashbackAtual + acao.payload.cashback };
  }
  if (acao.type === 'CASHBACK' && acao.payload.status === 'ATENDIDO') {
    const cashbackAtual = state[acao.payload.nome] || 0;
    return { ...state, [acao.payload.nome]: cashbackAtual - acao.payload.valor };
  }
  return state;
};

// Combine reducers
const { createStore, combineReducers } = Redux;
const todosOsReducers = combineReducers({ historicoDePedidosDeCashback, caixa, contratos, cashbacks });
const store = createStore(todosOsReducers);

// Menu interativo
const menu = async () => {
  let sair = false;

  while (!sair) {
    const response = await prompts({
      type: 'select',
      name: 'option',
      message: 'Selecione uma opção:',
      choices: [
        { title: 'Realizar novo contrato', value: 1 },
        { title: 'Cancelar contrato existente', value: 2 },
        { title: 'Consultar saldo de cashback', value: 3 },
        { title: 'Fazer pedido de cashback', value: 4 },
        { title: 'Exibir saldo em caixa', value: 5 },
        { title: 'Sair', value: 0 },
      ],
    });

    switch (response.option) {
      case 1:
        const contrato = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente:' },
          { type: 'number', name: 'taxa', message: 'Taxa do contrato:' },
        ]);
        store.dispatch(criarContrato(contrato.nome, contrato.taxa));
        console.log('Contrato criado com sucesso!');
        break;

      case 2:
        const cancelamento = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente:' },
          { type: 'text', name: 'dataInicio', message: 'Data do início do contrato (YYYY-MM-DD):' },
        ]);
        store.dispatch(cancelarContrato(cancelamento.nome, cancelamento.dataInicio));
        console.log('Contrato cancelado com sucesso!');
        break;

      case 3:
        const clienteCashback = await prompts({ type: 'text', name: 'nome', message: 'Nome do cliente:' });
        const saldo = store.getState().cashbacks[clienteCashback.nome] || 0;
        console.log(`Saldo de cashback: R$${saldo.toFixed(2)}`);
        break;

      case 4:
        const pedidoCashback = await prompts([
          { type: 'text', name: 'nome', message: 'Nome do cliente:' },
          { type: 'number', name: 'valor', message: 'Valor do cashback:' },
        ]);
        store.dispatch(solicitarCashback(pedidoCashback.nome, pedidoCashback.valor));
        console.log('Pedido de cashback realizado!');
        break;

      case 5:
        console.log(`Saldo em caixa: R$${store.getState().caixa.toFixed(2)}`);
        break;

      case 0:
        sair = true;
        console.log('Saindo...');
        break;

      default:
        console.log('Opção inválida.');
    }
  }
};

menu();
