#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol};

// ---------------------------------------------------------------------------
// Storage Keys
// ---------------------------------------------------------------------------

#[contracttype]
pub enum DataKey {
    TokenAddress,   // Address — native XLM SAC
    Owner,          // Address — contract deployer
    Server,         // Address — authorised payout caller
    HouseBalance,   // i128   — current house pool (stroops)
    Paused,         // bool
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct CrashHouse;

#[contractimpl]
impl CrashHouse {
    // ── Setup ────────────────────────────────────────────────────────────

    /// One-time init. Sets native XLM SAC, owner, and server address.
    pub fn initialize(env: Env, token: Address, owner: Address, server: Address) {
        if env.storage().instance().has(&DataKey::TokenAddress) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::TokenAddress, &token);
        env.storage().instance().set(&DataKey::Owner, &owner);
        env.storage().instance().set(&DataKey::Server, &server);
        env.storage().instance().set(&DataKey::HouseBalance, &0_i128);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    // ── Player actions ───────────────────────────────────────────────────

    /// Player deposits XLM into the house pool (bet).
    pub fn bet(env: Env, player: Address, amount: i128) {
        player.require_auth();
        Self::require_not_paused(&env);
        assert!(amount > 0, "ZeroValue");

        let token = Self::token(&env);
        let contract_addr = env.current_contract_address();

        // Transfer XLM from player → contract
        token::Client::new(&env, &token).transfer(&player, &contract_addr, &amount);

        // Update house balance
        let balance: i128 = Self::house_balance_internal(&env);
        env.storage().instance().set(&DataKey::HouseBalance, &(balance + amount));

        env.events().publish(
            (Symbol::new(&env, "bet"), player),
            amount,
        );
    }

    /// Server pays winnings to a player from the house pool.
    pub fn pay_player(env: Env, player: Address, amount: i128) {
        let server: Address = env.storage().instance().get(&DataKey::Server).unwrap();
        server.require_auth();
        assert!(amount > 0, "ZeroValue");

        let balance = Self::house_balance_internal(&env);
        assert!(balance >= amount, "Insolvent");

        let token = Self::token(&env);
        let contract_addr = env.current_contract_address();

        // Transfer XLM from contract → player
        token::Client::new(&env, &token).transfer(&contract_addr, &player, &amount);

        env.storage().instance().set(&DataKey::HouseBalance, &(balance - amount));

        env.events().publish(
            (Symbol::new(&env, "payout"), player),
            amount,
        );
    }

    // ── House management ─────────────────────────────────────────────────

    /// Anyone can fund the house (add liquidity).
    pub fn fund_house(env: Env, funder: Address, amount: i128) {
        funder.require_auth();
        assert!(amount > 0, "ZeroValue");

        let token = Self::token(&env);
        let contract_addr = env.current_contract_address();

        token::Client::new(&env, &token).transfer(&funder, &contract_addr, &amount);

        let balance = Self::house_balance_internal(&env);
        env.storage().instance().set(&DataKey::HouseBalance, &(balance + amount));

        env.events().publish(
            (Symbol::new(&env, "fund"), funder),
            amount,
        );
    }

    /// Owner withdraws from the house pool.
    pub fn withdraw_house(env: Env, to: Address, amount: i128) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        assert!(amount > 0, "ZeroValue");

        let balance = Self::house_balance_internal(&env);
        assert!(balance >= amount, "Insolvent");

        let token = Self::token(&env);
        let contract_addr = env.current_contract_address();

        token::Client::new(&env, &token).transfer(&contract_addr, &to, &amount);

        env.storage().instance().set(&DataKey::HouseBalance, &(balance - amount));

        env.events().publish(
            (Symbol::new(&env, "withdraw"), to),
            amount,
        );
    }

    // ── Admin ────────────────────────────────────────────────────────────

    pub fn set_server(env: Env, new_server: Address) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        env.storage().instance().set(&DataKey::Server, &new_server);
    }

    pub fn set_paused(env: Env, paused: bool) {
        let owner: Address = env.storage().instance().get(&DataKey::Owner).unwrap();
        owner.require_auth();
        env.storage().instance().set(&DataKey::Paused, &paused);
    }

    // ── View functions ───────────────────────────────────────────────────

    pub fn house_balance(env: Env) -> i128 {
        Self::house_balance_internal(&env)
    }

    pub fn paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    pub fn server(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Server).unwrap()
    }

    pub fn owner(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Owner).unwrap()
    }

    // ── Internal helpers ─────────────────────────────────────────────────

    fn token(env: &Env) -> Address {
        env.storage().instance().get(&DataKey::TokenAddress).expect("not initialized")
    }

    fn house_balance_internal(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::HouseBalance).unwrap_or(0)
    }

    fn require_not_paused(env: &Env) {
        let paused: bool = env.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        assert!(!paused, "Paused");
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::Address as _;

    fn setup_env() -> (Env, Address, Address, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();

        let token_admin = Address::generate(&env);
        let token_contract = env.register_stellar_asset_contract_v2(token_admin.clone());
        let token_addr = token_contract.address();
        let token_client = token::StellarAssetClient::new(&env, &token_addr);

        let contract_id = env.register(CrashHouse, ());
        let owner = Address::generate(&env);
        let server = Address::generate(&env);
        let player = Address::generate(&env);

        // Initialize
        let client = CrashHouseClient::new(&env, &contract_id);
        client.initialize(&token_addr, &owner, &server);

        // Mint XLM to player and contract (for payouts)
        token_client.mint(&player, &100_000_000); // 10 XLM
        token_client.mint(&contract_id, &500_000_000); // 50 XLM house seed

        // Set house balance to match minted amount
        env.as_contract(&contract_id, || {
            env.storage().instance().set(&DataKey::HouseBalance, &500_000_000_i128);
        });

        (env, contract_id, token_addr, owner, server, player)
    }

    #[test]
    fn test_bet_and_payout() {
        let (env, contract_id, _token_addr, _owner, _server, player) = setup_env();
        let client = CrashHouseClient::new(&env, &contract_id);

        // Player bets 1 XLM
        client.bet(&player, &10_000_000);
        assert_eq!(client.house_balance(), 510_000_000); // 50 + 1

        // Server pays 2 XLM
        client.pay_player(&player, &20_000_000);
        assert_eq!(client.house_balance(), 490_000_000); // 51 - 2
    }

    #[test]
    fn test_fund_and_withdraw() {
        let (env, contract_id, token_addr, owner, _server, player) = setup_env();
        let client = CrashHouseClient::new(&env, &contract_id);
        let token_client = token::StellarAssetClient::new(&env, &token_addr);

        // Fund house with player's XLM
        client.fund_house(&player, &10_000_000);
        assert_eq!(client.house_balance(), 510_000_000);

        // Owner withdraws
        let dest = Address::generate(&env);
        token_client.mint(&dest, &0); // ensure account exists
        client.withdraw_house(&dest, &5_000_000);
        assert_eq!(client.house_balance(), 505_000_000);
    }

    #[test]
    fn test_pause() {
        let (env, contract_id, _token_addr, _owner, _server, _player) = setup_env();
        let client = CrashHouseClient::new(&env, &contract_id);

        assert!(!client.paused());
        client.set_paused(&true);
        assert!(client.paused());
    }

    #[test]
    #[should_panic(expected = "Paused")]
    fn test_bet_when_paused() {
        let (env, contract_id, _token_addr, _owner, _server, player) = setup_env();
        let client = CrashHouseClient::new(&env, &contract_id);

        client.set_paused(&true);
        client.bet(&player, &10_000_000);
    }

    #[test]
    #[should_panic(expected = "Insolvent")]
    fn test_payout_insolvent() {
        let (env, contract_id, _token_addr, _owner, _server, player) = setup_env();
        let client = CrashHouseClient::new(&env, &contract_id);

        // Try paying more than house has
        client.pay_player(&player, &999_000_000_000);
    }
}
