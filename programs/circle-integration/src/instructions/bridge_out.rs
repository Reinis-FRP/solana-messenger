use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use message_transmitter::program::MessageTransmitter;
use token_messenger_minter::cpi::accounts::DepositForBurnContext;
use token_messenger_minter::program::TokenMessengerMinter;
use token_messenger_minter::token_messenger::DepositForBurnParams;

use crate::state::Pool;

#[derive(Accounts)]
pub struct BridgeOut<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    #[account(
      seeds = [b"pool"],
      bump,
    )]
    pub pool: Account<'info, Pool>,
    #[account(
      associated_token::mint = mint,
      associated_token::authority = pool,
    )]
    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,
    /// CHECK: empty PDA, checked in CCTP. Seeds must be \["sender_authority"\] (CCTP Token Messenger Minter program).
    pub token_messenger_minter_sender_authority: UncheckedAccount<'info>,
    /// CHECK: MessageTransmitter is checked in CCTP. Seeds must be \["message_transmitter"\] (CCTP Message Transmitter
    /// program).
    #[account(mut)]
    pub message_transmitter: UncheckedAccount<'info>,
    /// CHECK: TokenMessenger is checked in CCTP. Seeds must be \["token_messenger"\] (CCTP Token Messenger Minter
    /// program).
    pub token_messenger: UncheckedAccount<'info>,
    /// CHECK: RemoteTokenMessenger is checked in CCTP. Seeds must be \["remote_token_messenger"\,
    /// remote_domain.to_string()] (CCTP Token Messenger Minter program).
    pub remote_token_messenger: UncheckedAccount<'info>,
    /// CHECK: TokenMinter is checked in CCTP. Seeds must be \["token_minter"\] (CCTP Token Messenger Minter program).
    pub token_minter: UncheckedAccount<'info>,
    /// CHECK: LocalToken is checked in CCTP. Seeds must be \["local_token", mint\] (CCTP Token Messenger Minter
    /// program).
    #[account(mut)]
    pub local_token: UncheckedAccount<'info>,
    #[account(mut)]
    pub message_sent_event_data: Signer<'info>,
    pub message_transmitter_program: Program<'info, MessageTransmitter>,
    pub token_messenger_minter_program: Program<'info, TokenMessengerMinter>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    /// CHECK: EventAuthority is checked in CCTP. Seeds must be \["__event_authority"\] (CCTP Token Messenger Minter
    /// program).
    pub event_authority: UncheckedAccount<'info>,
}

impl<'info> BridgeOut<'info> {
    pub fn bridge_out(&mut self, amount: u64, bumps: &BridgeOutBumps) -> Result<()> {
        let cpi_program = self.token_messenger_minter_program.to_account_info();
        let cpi_accounts = DepositForBurnContext {
            owner: self.pool.to_account_info(),
            event_rent_payer: self.payer.to_account_info(),
            sender_authority_pda: self
                .token_messenger_minter_sender_authority
                .to_account_info(),
            burn_token_account: self.vault.to_account_info(),
            message_transmitter: self.message_transmitter.to_account_info(),
            token_messenger: self.token_messenger.to_account_info(),
            remote_token_messenger: self.remote_token_messenger.to_account_info(),
            token_minter: self.token_minter.to_account_info(),
            local_token: self.local_token.to_account_info(),
            burn_token_mint: self.mint.to_account_info(),
            message_sent_event_data: self.message_sent_event_data.to_account_info(),
            message_transmitter_program: self.message_transmitter_program.to_account_info(),
            token_messenger_minter_program: self.token_messenger_minter_program.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            event_authority: self.event_authority.to_account_info(),
            program: self.token_messenger_minter_program.to_account_info(),
        };
        let pool_seeds: &[&[&[u8]]] = &[&[b"pool", &[bumps.pool]]];
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, pool_seeds);
        let params = DepositForBurnParams {
            amount,
            destination_domain: self.pool.destination_domain,
            mint_recipient: self.pool.mint_recipient,
        };
        token_messenger_minter::cpi::deposit_for_burn(cpi_ctx, params)?;

        Ok(())
    }
}
