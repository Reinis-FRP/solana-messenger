import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaMessenger } from "../target/types/solana_messenger";

describe("solana-messenger", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaMessenger as Program<SolanaMessenger>;

  //it("Is initialized!", async () => {
  //  // Add your test here.
  //  const tx = await program.methods.initialize().rpc();
  //  console.log("Your transaction signature", tx);
  //});
});
