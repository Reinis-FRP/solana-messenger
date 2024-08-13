import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import type NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  transfer,
} from "@solana/spl-token";
import { getBytes, ZeroAddress } from "ethers";
import type { CircleIntegration } from "../../target/types/circle_integration";
import type { TokenMessengerMinter } from "../../target/types/token_messenger_minter";
import tokenMessengerMinterIdl from "../../target/idl/token_messenger_minter.json";
import { assert } from "chai";
import { evmAddressToBytes32, readUInt256BE } from "../common/helpers";
import { decodeMessageSentData } from "../common/circle";

describe("circle_integration", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const circleIntegrationProgram = anchor.workspace
    .CircleIntegration as Program<CircleIntegration>;

  // We cannot reuse IDL from Circle repo due to breaking changes in Anchor. Our IDL is built from stripped down version
  // of token_messenger_minter that includes only necessary methods and accounts. Attach it to the cloned program from
  // devnet.
  const tokenMessengerMinterProgram = new Program({
    ...(tokenMessengerMinterIdl as TokenMessengerMinter),
    address: "CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3",
  });

  // We have cloned MessageTransmitter from devnet.
  const messageTransmitterAddress = new anchor.web3.PublicKey(
    "CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd"
  );

  // USDC mint account data is modified to have test wallet as mint authority.
  const usdcMint = new anchor.web3.PublicKey(
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
  );

  const wallet = provider.wallet as NodeWallet;

  // Derived wallet to hold USDC for initial pool sponsor. Account will be created in Test Preparation.
  let sponsorATA: anchor.web3.PublicKey;

  // Pool account can sign on behalf of the integration program.
  const pool = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("pool")],
    circleIntegrationProgram.programId
  )[0];

  // Derived vault account to hold USDC for the pool. Account will be created by initialize method.
  const vault = getAssociatedTokenAddressSync(usdcMint, pool, true);

  const destinationDomain = 0; // Ethereum

  // Sepolia TokenMessenger from:
  // https://developers.circle.com/stablecoins/docs/evm-smart-contracts#tokenmessenger-testnet
  const destinationTokenMessenger = new anchor.web3.PublicKey(
    getBytes(evmAddressToBytes32("0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5"))
  );

  // We don't restrict destination caller to receive the message.
  const destinationCaller = new anchor.web3.PublicKey(
    getBytes(evmAddressToBytes32(ZeroAddress))
  );

  // Arbitrary recipient address on Ethereum.
  const mintRecipient = new anchor.web3.PublicKey(
    getBytes(evmAddressToBytes32("0x000000000000000000000000000000000000dEaD"))
  );

  const testAmount = 10_000_000; // 10 USDC

  const confirm = async (signature: string): Promise<string> => {
    const block = await provider.connection.getLatestBlockhash();
    await provider.connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  it("Test Preparation", async () => {
    sponsorATA = (
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        usdcMint,
        wallet.publicKey
      )
    ).address;

    const mintTx = await mintTo(
      provider.connection,
      wallet.payer,
      usdcMint,
      sponsorATA,
      provider.publicKey,
      testAmount
    );
    console.log("Minted 10 USDC to sponsor", mintTx);
  });

  it("Initialize Pool", async () => {
    const tx = await circleIntegrationProgram.methods
      .initialize({ destinationDomain, mintRecipient })
      .accountsPartial({
        payer: wallet.publicKey,
        mint: usdcMint,
        pool,
        vault,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([])
      .rpc()
      .then(confirm);

    console.log("\nInitialized pool Account");
    console.log("Your transaction signature", tx);
  });

  it("Sponsor the Pool", async () => {
    const tx = await transfer(
      provider.connection,
      wallet.payer,
      sponsorATA,
      vault,
      wallet.payer,
      testAmount
    ).then(confirm);

    console.log("Sponsored the pool", tx);
    console.log(
      "Vault balance",
      (await provider.connection.getTokenAccountBalance(vault)).value.amount
    );
  });

  it("Bridge out from the Pool", async () => {
    // Derive all required accounts.
    const tokenMessengerMinterSenderAuthority =
      anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("sender_authority")],
        tokenMessengerMinterProgram.programId
      )[0];

    // We clone message_transmitter state from devnet (BWrwSWjbikT3H7qHAkUEbLmwDQoB4ZDJ4wcSEhSPTZCu).
    const messageTransmitter = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("message_transmitter")],
      messageTransmitterAddress
    )[0];

    // We clone token_messenger state from devnet (Afgq3BHEfCE7d78D2XE9Bfyu2ieDqvE24xX8KDwreBms).
    const tokenMessenger = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_messenger")],
      tokenMessengerMinterProgram.programId
    )[0];

    // We clone Ethereum remote_token_messenger state from devnet (Hazwi3jFQtLKc2ughi7HFXPkpDeso7DQaMR9Ks4afh3j).
    const remoteTokenMessenger = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("remote_token_messenger"),
        Buffer.from(destinationDomain.toString()),
      ],
      tokenMessengerMinterProgram.programId
    )[0];

    // We clone token_minter state from devnet (DBD8hAwLDRQkTsu6EqviaYNGKPnsAMmQonxf7AH8ZcFY).
    const tokenMinter = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("token_minter")],
      tokenMessengerMinterProgram.programId
    )[0];

    // We clone USDC local_token state from devnet (4xt9P42CcMHXAgvemTnzineHp6owfGUcrg1xD9V7mdk1).
    const localToken = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("local_token"), usdcMint.toBuffer()],
      tokenMessengerMinterProgram.programId
    )[0];

    // This account will hold the message sent event data.
    const messageSentEventData = anchor.web3.Keypair.generate();

    // PDA for token_messenger_minter to emit DepositForBurn event via CPI.
    const eventAuthority = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("__event_authority")],
      tokenMessengerMinterProgram.programId
    )[0];

    const accounts = {
      payer: wallet.publicKey,
      mint: usdcMint,
      pool,
      vault,
      tokenMessengerMinterSenderAuthority,
      messageTransmitter,
      tokenMessenger,
      remoteTokenMessenger,
      tokenMinter,
      localToken,
      messageSentEventData: messageSentEventData.publicKey,
      messageTransmitterProgram: messageTransmitterAddress,
      tokenMessengerMinterProgram: tokenMessengerMinterProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: anchor.web3.SystemProgram.programId,
      eventAuthority,
    };

    const tx = await circleIntegrationProgram.methods
      .bridgeOut(new anchor.BN(testAmount))
      .accounts(accounts)
      .signers([messageSentEventData])
      .rpc()
      .then(confirm);

    console.log("Bridged out of the pool", tx);
    console.log(
      "Vault balance",
      (await provider.connection.getTokenAccountBalance(vault)).value.amount
    );

    // Fetch the message sent event data and decode it.
    const event = decodeMessageSentData(
      (await provider.connection.getAccountInfo(messageSentEventData.publicKey))
        .data
    );
    assert(event.rentPayer.equals(wallet.publicKey), "Invalid rent payer");
    assert(event.messageHeader.sourceDomain === 5, "Invalid source domain"); // Solana
    assert(
      event.messageHeader.destinationDomain === destinationDomain,
      "Invalid destination domain"
    );
    assert(
      event.messageHeader.headerSender.equals(
        tokenMessengerMinterProgram.programId
      ),
      "Invalid header sender"
    );
    assert(
      event.messageHeader.headerRecipient.equals(destinationTokenMessenger),
      "Invalid header recipient"
    );
    assert(
      event.messageHeader.destinationCaller.equals(destinationCaller),
      "Invalid destination caller"
    );
    assert(
      event.messageHeader.messageBody.burnToken.equals(usdcMint),
      "Invalid burn token"
    );
    assert(
      event.messageHeader.messageBody.mintRecipient.equals(mintRecipient),
      "Invalid mint recipient"
    );
    assert(
      event.messageHeader.messageBody.messageSender.equals(pool),
      "Invalid message sender"
    );
    assert(
      event.messageHeader.messageBody.amount.toString() ===
        testAmount.toString(),
      "Invalid amount"
    );
  });
});
