use anchor_lang::prelude::*;

pub mod message_transmitter;

declare_id!("mesmzuHztrYrrGFSz3nm7uQzThz3t3JNdBvioj1YCT9");

#[program]
pub mod solana_messenger {
    use super::*;

    pub fn handle_receive_message(
        _ctx: Context<HandleReceiveMessageContext>,
        params: HandleReceiveMessageParams,
    ) -> Result<()> {
        msg!("Received message from remote domain: {:?}", params.remote_domain);
        msg!("Received message from: {:?}", params.sender);
        msg!("Message body: {:?}", params.message_body);
        Ok(())
    }
}

// Instruction parameters
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct HandleReceiveMessageParams {
    pub remote_domain: u32,
    pub sender: Pubkey,
    pub message_body: Vec<u8>,
    pub authority_bump: u8,
}

#[derive(Accounts)]
#[instruction(params: HandleReceiveMessageParams)]
pub struct HandleReceiveMessageContext<'info> {
    // authority_pda is a Signer to ensure that this instruction
    // can only be called by Message Transmitter
    #[account(
        seeds = [b"message_transmitter_authority", crate::ID.as_ref()],
        bump = params.authority_bump,
        seeds::program = message_transmitter::ID // Reference the declared program ID
    )]
    pub authority_pda: Signer<'info>,
}
