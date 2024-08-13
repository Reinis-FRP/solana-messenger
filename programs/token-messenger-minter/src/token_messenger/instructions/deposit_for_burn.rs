use {
    crate::{
        program::TokenMessengerMinter,
        token_messenger::{
            error::TokenMessengerError,
            state::{RemoteTokenMessenger, TokenMessenger},
        },
        token_minter::state::{LocalToken, TokenMinter},
    },
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, Token, TokenAccount},
    message_transmitter::state::MessageTransmitter,
};

// Instruction accounts
#[event_cpi]
#[derive(Accounts)]
#[instruction(params: DepositForBurnParams)]
pub struct DepositForBurnContext<'info> {
    #[account()]
    pub owner: Signer<'info>,

    #[account(mut)]
    pub event_rent_payer: Signer<'info>,

    /// CHECK: empty PDA, used to check that sendMessage was called by TokenMessenger
    #[account(
      seeds = [b"sender_authority"],
      bump = token_messenger.authority_bump,
  )]
    pub sender_authority_pda: UncheckedAccount<'info>,

    #[account(
      mut,
      constraint = burn_token_account.mint == burn_token_mint.key(),
      has_one = owner
  )]
    pub burn_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub message_transmitter: Box<Account<'info, MessageTransmitter>>,

    #[account()]
    pub token_messenger: Box<Account<'info, TokenMessenger>>,

    #[account(
      constraint = params.destination_domain == remote_token_messenger.domain @ TokenMessengerError::InvalidDestinationDomain
  )]
    pub remote_token_messenger: Box<Account<'info, RemoteTokenMessenger>>,

    #[account()]
    pub token_minter: Box<Account<'info, TokenMinter>>,

    #[account(
      mut,
      seeds = [
          b"local_token",
          burn_token_mint.key().as_ref(),
      ],
      bump = local_token.bump,
  )]
    pub local_token: Box<Account<'info, LocalToken>>,

    #[account(mut)]
    pub burn_token_mint: Box<Account<'info, Mint>>,

    /// CHECK: Account to store MessageSent event data in. Any non-PDA uninitialized address.
    #[account(mut)]
    pub message_sent_event_data: Signer<'info>,

    pub message_transmitter_program:
        Program<'info, message_transmitter::program::MessageTransmitter>,

    pub token_messenger_minter_program: Program<'info, TokenMessengerMinter>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

// Instruction parameters
// NOTE: Do not reorder parameters fields. repr(C) is used to fix the layout of the struct
// so DepositForBurnWithCallerParams can be deserialized as DepositForBurnParams.
#[repr(C)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct DepositForBurnParams {
    pub amount: u64,
    pub destination_domain: u32,
    pub mint_recipient: Pubkey,
}
