pub mod token_messenger;
pub mod token_minter;

use {anchor_lang::prelude::*, token_messenger::*};

declare_id!("CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3");

#[program]
pub mod token_messenger_minter {
    use super::*;

    pub fn deposit_for_burn(
        _ctx: Context<DepositForBurnContext>,
        _params: DepositForBurnParams,
    ) -> Result<u64> {
        // We only need this for interface generation.
        Ok(0)
    }
}
