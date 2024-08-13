use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
pub struct TokenMinter {
    pub token_controller: Pubkey,
    pub pauser: Pubkey,
    pub paused: bool,
    pub bump: u8,
}

#[account]
#[derive(Debug, InitSpace)]
pub struct LocalToken {
    pub custody: Pubkey,
    pub mint: Pubkey,
    pub burn_limit_per_message: u64,
    pub messages_sent: u64,
    pub messages_received: u64,
    pub amount_sent: u128,
    pub amount_received: u128,
    pub bump: u8,
    pub custody_bump: u8,
}
