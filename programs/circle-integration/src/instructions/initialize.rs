use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{state::Pool, ANCHOR_DISCRIMINATOR};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(
      init,
      payer = payer,
      seeds = [b"pool"],
      bump,
      space = ANCHOR_DISCRIMINATOR + Pool::INIT_SPACE,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
      init,
      payer = payer,
      associated_token::mint = mint,
      associated_token::authority = pool,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> Initialize<'info> {
    pub fn initialize(&mut self, params: &InitializeParams, bumps: &InitializeBumps) -> Result<()> {
        self.pool.set_inner(Pool {
            mint: self.mint.key(),
            destination_domain: params.destination_domain,
            mint_recipient: params.mint_recipient,
            bump: bumps.pool,
        });

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeParams {
    pub destination_domain: u32,
    pub mint_recipient: Pubkey,
}