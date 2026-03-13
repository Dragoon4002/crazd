/**
 * CrashHouse Soroban Contract Configuration
 *
 * Deployed on Stellar Mainnet
 */

export const CRASH_HOUSE_CONTRACT = {
  // Contract ID on Stellar Mainnet (replace after deployment)
  id: process.env.NEXT_PUBLIC_CONTRACT_ID || 'PLACEHOLDER_CONTRACT_ID',

  // Network
  network: {
    name: 'Stellar Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet.sorobanrpc.com',
    passphrase: 'Test SDF Network ; September 2015',
    explorerUrl: 'https://stellar.expert/explorer/testnet',
  },

  // Native XLM Stellar Asset Contract (SAC) on Testnet
  nativeXlmSac: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
} as const;
