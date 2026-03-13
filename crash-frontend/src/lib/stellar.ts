import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc as StellarRpc } from '@stellar/stellar-sdk';

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID!;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet.sorobanrpc.com';
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;

const server = new StellarRpc.Server(RPC_URL);

// ── Transaction Builders ─────────────────────────────────────────────────

/**
 * Build a bet transaction — player sends XLM to the contract house pool.
 */
export async function buildBetTx(
  playerAddress: string,
  amount: bigint,
): Promise<string> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(playerAddress);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'bet',
        StellarSdk.Address.fromString(playerAddress).toScVal(),
        StellarSdk.nativeToScVal(amount, { type: 'i128' }),
      ),
    )
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);
  return preparedTx.toEnvelope().toXDR('base64');
}

/**
 * Build a fund-house transaction.
 */
export async function buildFundHouseTx(
  funderAddress: string,
  amount: bigint,
): Promise<string> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(funderAddress);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'fund_house',
        StellarSdk.Address.fromString(funderAddress).toScVal(),
        StellarSdk.nativeToScVal(amount, { type: 'i128' }),
      ),
    )
    .setTimeout(30)
    .build();

  const preparedTx = await server.prepareTransaction(tx);
  return preparedTx.toEnvelope().toXDR('base64');
}

// ── Submit ────────────────────────────────────────────────────────────────

/**
 * Submit signed XDR to the network and poll until confirmed.
 */
export async function submitTransaction(
  signedXdr: string,
): Promise<StellarRpc.Api.GetTransactionResponse> {
  const signedTx = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE,
  );

  const txResult = await server.sendTransaction(signedTx);

  if (txResult.status !== 'PENDING') {
    throw new Error(`Transaction failed: ${txResult.status}`);
  }

  let getResponse = await server.getTransaction(txResult.hash);

  // Poll until status resolves (max ~30s)
  while (getResponse.status === 'NOT_FOUND') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResponse = await server.getTransaction(txResult.hash);
  }

  return getResponse;
}

// ── Read-only queries (simulation) ────────────────────────────────────────

/**
 * Get house balance via simulation (no gas cost).
 */
export async function getHouseBalance(callerAddress: string): Promise<bigint> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(callerAddress);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('house_balance'))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);

  if (StellarRpc.Api.isSimulationSuccess(result) && result.result) {
    return StellarSdk.scValToNative(result.result.retval);
  }

  return BigInt(0);
}

/**
 * Check if contract is paused via simulation.
 */
export async function isPaused(callerAddress: string): Promise<boolean> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const account = await server.getAccount(callerAddress);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('paused'))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);

  if (StellarRpc.Api.isSimulationSuccess(result) && result.result) {
    return StellarSdk.scValToNative(result.result.retval);
  }

  return false;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/** Convert XLM to stroops (1 XLM = 10^7 stroops). */
export function xlmToStroops(xlm: number): bigint {
  return BigInt(Math.floor(xlm * 10_000_000));
}

/** Convert stroops to XLM string. */
export function stroopsToXlm(stroops: bigint | string): string {
  const s = typeof stroops === 'string' ? BigInt(stroops) : stroops;
  return (Number(s) / 10_000_000).toFixed(7);
}
