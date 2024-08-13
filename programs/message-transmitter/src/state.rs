use anchor_lang::prelude::*;

#[account]
#[derive(Debug, InitSpace)]
/// Main state of the MessageTransmitter program
pub struct MessageTransmitter {
    pub owner: Pubkey,
    pub pending_owner: Pubkey,
    pub attester_manager: Pubkey,
    pub pauser: Pubkey,
    pub paused: bool,
    pub local_domain: u32,
    pub version: u32,
    pub signature_threshold: u32,
    #[max_len(1)]
    pub enabled_attesters: Vec<Pubkey>,
    pub max_message_body_size: u64,
    pub next_available_nonce: u64,
}

// Without this got IDL build error.
impl anchor_lang::Id for MessageTransmitter {
  fn id() -> Pubkey {
      crate::ID
  }
}