#![no_std]
use soroban_sdk::{
    contract, contractevent, contractimpl, contracttype, contracterror, panic_with_error, token,
    Address, Env,
};

// ─── Errors ─────────────────────────────────────────────────────────────────
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    ZeroValue = 2,
    Insolvent = 3,
    NotServer = 4,
    ContractPaused = 5,
    WithdrawTooLarge = 6,
}

// ─── Storage Keys ───────────────────────────────────────────────────────────
#[contracttype]
pub enum DataKey {
    Owner,
    Server,
    Token,
    Paused,
    HouseBalance,
    MinLiquidity,
    MaxPayoutPerTx,
}

// ─── Events ─────────────────────────────────────────────────────────────────
#[contractevent]
pub struct BetPlaced {
    #[topic]
    pub player: Address,
    pub amount: i128,
}

#[contractevent]
pub struct PlayerPaid {
    #[topic]
    pub player: Address,
    pub amount: i128,
}

#[contractevent]
pub struct HouseFunded {
    #[topic]
    pub funder: Address,
    pub amount: i128,
}

#[contractevent]
pub struct HouseWithdrawn {
    #[topic]
    pub to: Address,
    pub amount: i128,
}

#[contractevent]
pub struct ServerUpdated {
    #[topic]
    pub new_server: Address,
}

#[contractevent]
pub struct PausedSet {
    pub paused: bool,
}

// ─── Contract ───────────────────────────────────────────────────────────────
#[contract]
pub struct GameHouse;

#[contractimpl]
impl GameHouse {
    // ── Init (replaces constructor) ─────────────────────────────────────
    pub fn initialize(
        env: Env,
        owner: Address,
        server: Address,
        token: Address,
        min_liquidity: i128,
        max_payout_per_tx: i128,
    ) {
        if env.storage().instance().has(&DataKey::Owner) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Server, &server);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::MinLiquidity, &min_liquidity);
        env.storage()
            .instance()
            .set(&DataKey::MaxPayoutPerTx, &max_payout_per_tx);
        env.storage()
            .persistent()
            .set(&DataKey::HouseBalance, &0_i128);
    }

    // ── Player Entry ────────────────────────────────────────────────────
    /// Player places a bet. Transfers `amount` of token from player to contract.
    /// Equivalent to Solidity `bet() payable`.
    pub fn bet(env: Env, player: Address, amount: i128) {
        Self::require_not_paused(&env);
        player.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::ZeroValue);
        }

        let client = Self::token_client(&env);
        client.transfer(&player, &env.current_contract_address(), &amount);

        let balance = Self::get_house_balance_internal(&env);
        env.storage()
            .persistent()
            .set(&DataKey::HouseBalance, &(balance + amount));

        env.events().publish_event(&BetPlaced {
            player,
            amount,
        });
    }

    // ── Server Payout ───────────────────────────────────────────────────
    /// Server pays a winning player. Equivalent to Solidity `payPlayer`.
    pub fn pay_player(env: Env, player: Address, amount: i128) {
        Self::require_not_paused(&env);
        Self::require_server(&env);

        if amount == 0 {
            return;
        }

        let max_payout: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MaxPayoutPerTx)
            .unwrap();
        if amount > max_payout {
            panic_with_error!(&env, Error::Insolvent);
        }

        let balance = Self::get_house_balance_internal(&env);
        if amount > balance {
            panic_with_error!(&env, Error::Insolvent);
        }

        env.storage()
            .persistent()
            .set(&DataKey::HouseBalance, &(balance - amount));

        let client = Self::token_client(&env);
        client.transfer(&env.current_contract_address(), &player, &amount);

        env.events().publish_event(&PlayerPaid {
            player,
            amount,
        });
    }

    // ── House Ops ───────────────────────────────────────────────────────
    /// Anyone can fund the house. Equivalent to Solidity `fundHouse`.
    pub fn fund_house(env: Env, funder: Address, amount: i128) {
        funder.require_auth();
        if amount <= 0 {
            panic_with_error!(&env, Error::ZeroValue);
        }

        let client = Self::token_client(&env);
        client.transfer(&funder, &env.current_contract_address(), &amount);

        let balance = Self::get_house_balance_internal(&env);
        env.storage()
            .persistent()
            .set(&DataKey::HouseBalance, &(balance + amount));

        env.events().publish_event(&HouseFunded {
            funder,
            amount,
        });
    }

    /// Owner withdraws from house. Checks minLiquidity. Equivalent to Solidity `withdrawHouse`.
    pub fn withdraw_house(env: Env, amount: i128, to: Address) {
        Self::require_owner(&env);

        let balance = Self::get_house_balance_internal(&env);
        let min_liq: i128 = env
            .storage()
            .instance()
            .get(&DataKey::MinLiquidity)
            .unwrap();

        if balance - amount < min_liq {
            panic_with_error!(&env, Error::WithdrawTooLarge);
        }

        env.storage()
            .persistent()
            .set(&DataKey::HouseBalance, &(balance - amount));

        let client = Self::token_client(&env);
        client.transfer(&env.current_contract_address(), &to, &amount);

        env.events().publish_event(&HouseWithdrawn {
            to,
            amount,
        });
    }

    // ── Admin ───────────────────────────────────────────────────────────
    pub fn set_server(env: Env, new_server: Address) {
        Self::require_owner(&env);
        env.storage().instance().set(&DataKey::Server, &new_server);
        env.events().publish_event(&ServerUpdated { new_server });
    }

    pub fn set_paused(env: Env, paused: bool) {
        Self::require_owner(&env);
        env.storage().instance().set(&DataKey::Paused, &paused);
        env.events().publish_event(&PausedSet { paused });
    }

    // ── View Functions ──────────────────────────────────────────────────
    pub fn get_house_balance(env: Env) -> i128 {
        Self::get_house_balance_internal(&env)
    }

    pub fn get_owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }

    pub fn get_server(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Server).unwrap()
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }

    pub fn get_min_liquidity(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::MinLiquidity)
            .unwrap()
    }

    pub fn get_max_payout_per_tx(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::MaxPayoutPerTx)
            .unwrap()
    }

    // ── Internal Helpers ────────────────────────────────────────────────
    fn require_owner(env: &Env) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
    }

    fn require_server(env: &Env) {
        let server: Address = env.storage().instance().get(&DataKey::Server).unwrap();
        server.require_auth();
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        if paused {
            panic_with_error!(env, Error::ContractPaused);
        }
    }

    fn token_client(env: &Env) -> token::Client {
        let addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(env, &addr)
    }

    fn get_house_balance_internal(env: &Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::HouseBalance)
            .unwrap_or(0)
    }
}

mod test;

// ─── Integration Examples ───────────────────────────────────────────────────
//
// ## Build & Deploy
//
// ```bash
// # Build
// cd crazd && stellar contract build
//
// # Deploy to testnet
// stellar contract deploy \
//   --wasm target/wasm32v1-none/release/game_house.wasm \
//   --network testnet --source <SECRET_KEY>
//
// # Get XLM SAC address (pass as `token` to initialize)
// stellar contract id asset --network testnet --asset native
//
// # Initialize
// stellar contract invoke --id <CONTRACT_ID> --network testnet --source <SECRET_KEY> \
//   -- initialize \
//   --owner <OWNER_ADDRESS> \
//   --server <SERVER_ADDRESS> \
//   --token <XLM_SAC_ADDRESS> \
//   --min_liquidity 10000000 \
//   --max_payout_per_tx 100000000
// ```
//
// ## Frontend (TypeScript — @stellar/stellar-sdk)
//
// ```typescript
// import { Contract, Networks, TransactionBuilder, BASE_FEE, nativeToScVal } from "@stellar/stellar-sdk";
// import { Server } from "@stellar/stellar-sdk/rpc";
//
// const rpc = new Server("https://soroban-testnet.stellar.org");
// const contract = new Contract("CABC123...");
//
// // Read house balance (simulation only, no signing needed)
// async function getHouseBalance() {
//   const account = await rpc.getAccount(publicKey);
//   const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
//     .addOperation(contract.call("get_house_balance"))
//     .setTimeout(30)
//     .build();
//   const sim = await rpc.simulateTransaction(tx);
//   // parse result from sim.result.retval
// }
//
// // Place a bet (requires wallet signing)
// async function placeBet(playerAddress: string, amount: bigint) {
//   const account = await rpc.getAccount(playerAddress);
//   let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
//     .addOperation(contract.call("bet",
//       nativeToScVal(playerAddress, { type: "address" }),
//       nativeToScVal(amount, { type: "i128" }),
//     ))
//     .setTimeout(30)
//     .build();
//   tx = await rpc.prepareTransaction(tx);
//   // sign with wallet (e.g. Freighter), then:
//   const response = await rpc.sendTransaction(tx);
// }
// ```
//
// ## Backend (Node.js — server calling pay_player)
//
// ```typescript
// import { Keypair, Networks, TransactionBuilder, BASE_FEE, Contract, nativeToScVal } from "@stellar/stellar-sdk";
// import { Server } from "@stellar/stellar-sdk/rpc";
//
// const serverKeypair = Keypair.fromSecret(process.env.SERVER_SECRET_KEY!);
// const rpc = new Server("https://soroban-testnet.stellar.org");
// const contract = new Contract(process.env.CONTRACT_ID!);
//
// async function payPlayer(playerAddress: string, amount: bigint) {
//   const account = await rpc.getAccount(serverKeypair.publicKey());
//   let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
//     .addOperation(contract.call("pay_player",
//       nativeToScVal(playerAddress, { type: "address" }),
//       nativeToScVal(amount, { type: "i128" }),
//     ))
//     .setTimeout(30)
//     .build();
//   tx = await rpc.prepareTransaction(tx);
//   tx.sign(serverKeypair);
//   const response = await rpc.sendTransaction(tx);
//   // poll with rpc.getTransaction(response.hash) until SUCCESS
// }
// ```
