import { atom } from 'jotai';
import { transactionSingleState, TransactionsListResponse } from '@store/transactions';
import { blocksSingleState } from '@store/blocks';
import { contractInfoState, contractInterfaceState, contractSourceState } from '@store/contracts';
import { atomFamily, atomWithDefault, selectAtom } from 'jotai/utils';
import type { MempoolTransaction, Transaction, Block } from '@stacks/stacks-blockchain-api-types';
import {
  accountBalancesResponseState,
  accountInfoState,
  accountStxBalanceResponseState,
  accountTransactionsState,
} from '@store/accounts';
import { InfiniteData } from 'react-query';

function makeDebugLabel(name: string) {
  return `[currently in view] ${name}`;
}

export type InViewTypes =
  | 'home'
  | 'tx'
  | 'contract_id'
  | 'address'
  | 'transactions'
  | 'blocks'
  | 'block';

export interface InView {
  type: InViewTypes;
  payload: string;
}

export const currentlyInViewState = atom<InView | null>(null);

export const currentlyInViewTxId = atom<string | undefined>(get => {
  const inView = get(currentlyInViewState);
  if (inView) {
    if (inView.type === 'tx') return inView.payload;
    if (inView.type === 'contract_id') return get(contractInfoState(inView.payload)).tx_id;
  }
  return undefined;
});

export const transactionInViewState = atom<Transaction | MempoolTransaction | undefined>(get => {
  const txId = get(currentlyInViewTxId);
  return txId ? get(transactionSingleState(txId)) : undefined;
});

export const transactionTypeInViewState = atom(get => get(transactionInViewState)?.tx_type);

export const blockHashInView = atom(get => {
  const inView = get(currentlyInViewState);
  if (!inView) return;
  if (inView.type === 'block') return inView.payload;
  const tx = get(transactionInViewState);
  if (!tx || tx?.tx_status !== 'success') return;
  return tx.block_hash;
});

export const blockInViewState = atom(get => {
  const hash = get(blockHashInView);
  if (hash) return get(blocksSingleState(hash));
});

const contractPrincipalInViewState = atom(get => {
  const inView = get(currentlyInViewState);
  const isTx = inView?.type === 'tx';
  const isContractId = inView?.type === 'contract_id';
  if (!inView || (!isTx && !isContractId)) return;
  if (isContractId) return inView.payload;
  const tx = get(transactionInViewState);
  if (tx?.tx_type === 'contract_call') return tx.contract_call.contract_id;
  if (tx?.tx_type === 'smart_contract') return tx.smart_contract.contract_id;
});

export const contractSourceInViewState = atom(get => {
  const contractPrincipal = get(contractPrincipalInViewState);
  if (contractPrincipal) return get(contractSourceState(contractPrincipal));
});

export const contractInterfaceInViewState = atom(get => {
  const contractPrincipal = get(contractPrincipalInViewState);
  if (contractPrincipal) return get(contractInterfaceState(contractPrincipal));
});

export const contractInfoInViewState = atom(get => {
  const contractPrincipal = get(contractPrincipalInViewState);
  if (contractPrincipal) {
    const data = get(contractInfoState(contractPrincipal));
    return { ...data, abi: JSON.parse(data.abi) };
  }
});

export const currentlyInViewBlockHash = atom<string | undefined>(get => {
  const inView = get(currentlyInViewState);
  if (inView) {
    if (inView.type === 'block') return inView.payload;
  }
  return undefined;
});

export const blockInView = atom<Block | undefined>(get => {
  const blockHash = get(currentlyInViewBlockHash);
  return blockHash ? get(blocksSingleState(blockHash)) : undefined;
});

export const blockInViewTransactions = atom<Transaction[] | undefined>(get => {
  const block = get(blockInView);
  if (!block) return;
  return block.txs.map(txid => get(transactionSingleState(txid))) as Transaction[];
});

export const addressInViewState = atom<string | undefined>(get => {
  const inView = get(currentlyInViewState);
  console.log({ inView });
  if (inView?.type === 'address') return inView.payload;
  const transaction = get(transactionInViewState);
  if (transaction?.tx_type === 'smart_contract') return transaction.smart_contract.contract_id;
  // if we want to display a list of transactions on a contract-call page related to the contract
  // uncomment the line below
  if (transaction?.tx_type === 'contract_call') return transaction.contract_call.contract_id;
});

export const accountInViewTransactionsState = atomFamily<
  number,
  InfiniteData<TransactionsListResponse> | undefined
>(limit => {
  const anAtom = atom<InfiniteData<TransactionsListResponse> | undefined>(get => {
    const address = get(addressInViewState);
    if (!address) return;
    return get(accountTransactionsState([address, limit]));
  });
  anAtom.debugLabel = makeDebugLabel('account transactions');
  return anAtom;
});

export const accountInViewBalances = atom(get => {
  const address = get(addressInViewState);
  if (!address) return;
  return get(accountBalancesResponseState(address));
});

export const accountInViewInfo = atom(get => {
  const address = get(addressInViewState);
  if (!address) return;
  return get(accountInfoState(address));
});

export const accountInViewStxBalance = atom(get => {
  const address = get(addressInViewState);
  if (!address) return;
  return get(accountStxBalanceResponseState(address));
});

currentlyInViewState.debugLabel = makeDebugLabel('currently in view');
currentlyInViewTxId.debugLabel = makeDebugLabel('txid');
transactionInViewState.debugLabel = makeDebugLabel('transaction');
transactionTypeInViewState.debugLabel = makeDebugLabel('tx_type');
blockHashInView.debugLabel = makeDebugLabel('block hash');
blockInViewState.debugLabel = makeDebugLabel('block');
contractPrincipalInViewState.debugLabel = makeDebugLabel('contract principal');
contractSourceInViewState.debugLabel = makeDebugLabel('contract source');
contractInterfaceInViewState.debugLabel = makeDebugLabel('contract interface');
contractInfoInViewState.debugLabel = makeDebugLabel('contract info');
addressInViewState.debugLabel = makeDebugLabel('address');
currentlyInViewBlockHash.debugLabel = makeDebugLabel('block hash');
blockInView.debugLabel = makeDebugLabel('block');
blockInViewTransactions.debugLabel = makeDebugLabel('block transactions');
