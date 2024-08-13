use anchor_lang::prelude::*;

declare_id!("742CfUUTjqb8etrFz4b1TZ5SRTHyUP8uhh8DAR2fwBnS");

mod constants;
mod instructions;
mod state;

pub use constants::*;
use instructions::*;

#[program]
pub mod circle_integration {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, params: InitializeParams) -> Result<()> {
        ctx.accounts.initialize(&params, &ctx.bumps)?;

        Ok(())
    }

    pub fn bridge_out(ctx: Context<BridgeOut>, amount: u64) -> Result<()> {
        ctx.accounts.bridge_out(amount, &ctx.bumps)?;

        Ok(())
    }
}
