#![cfg(test)]

use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::token::{StellarAssetClient, TokenClient};
use soroban_sdk::{Address, Env};

struct Setup<'a> {
    env: Env,
    #[allow(dead_code)]
    contract_id: Address,
    client: GameHouseClient<'a>,
    owner: Address,
    server: Address,
    token: TokenClient<'a>,
    sac: StellarAssetClient<'a>,
}

fn setup() -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(GameHouse, ());
    let owner = Address::generate(&env);
    let server = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let token_addr = env
        .register_stellar_asset_contract_v2(token_admin.clone())
        .address();
    let token = TokenClient::new(&env, &token_addr);
    let sac = StellarAssetClient::new(&env, &token_addr);

    let client = GameHouseClient::new(&env, &contract_id);
    client.initialize(
        &owner,
        &server,
        &token_addr,
        &1_000_000_i128,  // min_liquidity: 0.1 XLM
        &50_000_000_i128, // max_payout: 5 XLM
    );

    // Fund house with 10 XLM via fund_house
    let funder = Address::generate(&env);
    sac.mint(&funder, &100_000_000_i128);
    client.fund_house(&funder, &10_000_000_i128);

    Setup {
        env,
        contract_id,
        client,
        owner,
        server,
        token,
        sac,
    }
}

#[test]
fn test_initialize() {
    let s = setup();
    assert_eq!(s.client.get_owner(), s.owner);
    assert_eq!(s.client.get_server(), s.server);
    assert!(!s.client.is_paused());
    assert_eq!(s.client.get_min_liquidity(), 1_000_000_i128);
    assert_eq!(s.client.get_max_payout_per_tx(), 50_000_000_i128);
    assert_eq!(s.client.get_house_balance(), 10_000_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_double_initialize() {
    let s = setup();
    let token_addr = Address::generate(&s.env);
    s.client
        .initialize(&s.owner, &s.server, &token_addr, &0, &0);
}

#[test]
fn test_bet() {
    let s = setup();
    let player = Address::generate(&s.env);
    s.sac.mint(&player, &50_000_000_i128);

    let balance_before = s.client.get_house_balance();
    s.client.bet(&player, &5_000_000_i128);
    assert_eq!(
        s.client.get_house_balance() - balance_before,
        5_000_000_i128
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_bet_zero() {
    let s = setup();
    let player = Address::generate(&s.env);
    s.client.bet(&player, &0);
}

#[test]
fn test_pay_player() {
    let s = setup();

    // Add more to house
    let bettor = Address::generate(&s.env);
    s.sac.mint(&bettor, &50_000_000_i128);
    s.client.bet(&bettor, &20_000_000_i128);

    let player = Address::generate(&s.env);
    let house_before = s.client.get_house_balance();

    s.client.pay_player(&player, &5_000_000_i128);

    assert_eq!(s.client.get_house_balance(), house_before - 5_000_000_i128);
    assert_eq!(s.token.balance(&player), 5_000_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_pay_player_exceeds_max_payout() {
    let s = setup();
    let funder = Address::generate(&s.env);
    s.sac.mint(&funder, &1_000_000_000_i128);
    s.client.fund_house(&funder, &500_000_000_i128);

    let player = Address::generate(&s.env);
    // max is 50M, try 60M
    s.client.pay_player(&player, &60_000_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_pay_player_exceeds_balance() {
    let s = setup();
    let player = Address::generate(&s.env);
    // house has 10M from setup, try 20M (within max of 50M)
    s.client.pay_player(&player, &20_000_000_i128);
}

#[test]
fn test_fund_house() {
    let s = setup();
    let funder = Address::generate(&s.env);
    s.sac.mint(&funder, &50_000_000_i128);

    let before = s.client.get_house_balance();
    s.client.fund_house(&funder, &10_000_000_i128);
    assert_eq!(s.client.get_house_balance(), before + 10_000_000_i128);
}

#[test]
fn test_withdraw_house() {
    let s = setup();

    // Fund more
    let funder = Address::generate(&s.env);
    s.sac.mint(&funder, &50_000_000_i128);
    s.client.fund_house(&funder, &50_000_000_i128);

    let recipient = Address::generate(&s.env);
    let before = s.client.get_house_balance();
    s.client.withdraw_house(&10_000_000_i128, &recipient);

    assert_eq!(s.client.get_house_balance(), before - 10_000_000_i128);
    assert_eq!(s.token.balance(&recipient), 10_000_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_withdraw_below_min_liquidity() {
    let s = setup();
    let recipient = Address::generate(&s.env);
    // house has 10M, min_liq is 1M, withdraw 10M → remaining 0 < 1M
    s.client.withdraw_house(&10_000_000_i128, &recipient);
}

#[test]
fn test_set_server() {
    let s = setup();
    let new_server = Address::generate(&s.env);
    s.client.set_server(&new_server);
    assert_eq!(s.client.get_server(), new_server);
}

#[test]
fn test_pause_unpause() {
    let s = setup();
    assert!(!s.client.is_paused());
    s.client.set_paused(&true);
    assert!(s.client.is_paused());
    s.client.set_paused(&false);
    assert!(!s.client.is_paused());
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_bet_when_paused() {
    let s = setup();
    s.client.set_paused(&true);
    let player = Address::generate(&s.env);
    s.sac.mint(&player, &10_000_000_i128);
    s.client.bet(&player, &1_000_000_i128);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_pay_player_when_paused() {
    let s = setup();
    s.client.set_paused(&true);
    let player = Address::generate(&s.env);
    s.client.pay_player(&player, &1_000_000_i128);
}
