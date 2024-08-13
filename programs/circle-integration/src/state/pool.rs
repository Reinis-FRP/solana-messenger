use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug)]
pub struct Pool {
    pub mint: Pubkey,
    pub destination_domain: u32,
    pub mint_recipient: Pubkey,
    pub bump: u8,
}
