import * as anchor from "@coral-xyz/anchor";
import { sha256 } from "js-sha256";
import { readUInt256BE } from "./helpers";
// We have to parse MessageSent data manually because the version of IDL from Circle repo is not compatible with the
// latest Anchor when breaking changes were introduced in:
// https://github.com/coral-xyz/anchor/pull/2824
export const decodeMessageSentData = (data: Buffer) => {
  // Index positions to decode MessageSent from
  // https://github.com/circlefin/solana-cctp-contracts/blob/master/programs/message-transmitter/src/events.rs
  const DISCRIMINATOR_INDEX = 0;
  const RENT_PAYER_INDEX = 8;
  const MESSAGE_LENGTH_INDEX = 40;
  const MESSAGE_HEADER_INDEX = 44;

  // Index positions to decode Message Header from
  // https://developers.circle.com/stablecoins/docs/message-format#message-header
  const HEADER_VERSION_INDEX = 0;
  const SOURCE_DOMAIN_INDEX = 4;
  const DESTINATION_DOMAIN_INDEX = 8;
  const NONCE_INDEX = 12;
  const HEADER_SENDER_INDEX = 20;
  const HEADER_RECIPIENT_INDEX = 52;
  const DESTINATION_CALLER_INDEX = 84;
  const MESSAGE_BODY_INDEX = 116;

  // Index positions to decode Message Body for TokenMessenger from
  // https://developers.circle.com/stablecoins/docs/message-format#message-body
  const BODY_VERSION_INDEX = 0;
  const BURN_TOKEN_INDEX = 4;
  const MINT_RECIPIENT_INDEX = 36;
  const AMOUNT_INDEX = 68;
  const MESSAGE_SENDER_INDEX = 100;

  // Decode MessageSent data
  const discriminator = data
    .slice(DISCRIMINATOR_INDEX, DISCRIMINATOR_INDEX + 8)
    .toString("hex");
  const expectedDiscriminator = Buffer.from(sha256.array("account:MessageSent"))
    .slice(0, 8)
    .toString("hex");
  if (discriminator !== expectedDiscriminator) {
    throw new Error("Invalid discriminator");
  }
  const rentPayer = new anchor.web3.PublicKey(
    data.slice(RENT_PAYER_INDEX, RENT_PAYER_INDEX + 32)
  );
  const messageLength = data.readUInt32LE(MESSAGE_LENGTH_INDEX);
  const messageHeaderData = data.slice(
    MESSAGE_HEADER_INDEX,
    MESSAGE_HEADER_INDEX + messageLength
  );

  // Decode Message Header
  const headerVersion = messageHeaderData.readUInt32BE(HEADER_VERSION_INDEX);
  const sourceDomain = messageHeaderData.readUInt32BE(SOURCE_DOMAIN_INDEX);
  const destinationDomain = messageHeaderData.readUInt32BE(
    DESTINATION_DOMAIN_INDEX
  );
  const nonce = messageHeaderData.readBigUInt64BE(NONCE_INDEX);
  const headerSender = new anchor.web3.PublicKey(
    messageHeaderData.slice(HEADER_SENDER_INDEX, HEADER_SENDER_INDEX + 32)
  );
  const headerRecipient = new anchor.web3.PublicKey(
    messageHeaderData.slice(HEADER_RECIPIENT_INDEX, HEADER_RECIPIENT_INDEX + 32)
  );
  const destinationCaller = new anchor.web3.PublicKey(
    messageHeaderData.slice(
      DESTINATION_CALLER_INDEX,
      DESTINATION_CALLER_INDEX + 32
    )
  );
  const messageBodyData = data.slice(MESSAGE_HEADER_INDEX + MESSAGE_BODY_INDEX);

  // Decode Message Body for TokenMessenger
  const bodyVersion = messageBodyData.readUInt32BE(BODY_VERSION_INDEX);
  const burnToken = new anchor.web3.PublicKey(
    messageBodyData.slice(BURN_TOKEN_INDEX, BURN_TOKEN_INDEX + 32)
  );
  const mintRecipient = new anchor.web3.PublicKey(
    messageBodyData.slice(MINT_RECIPIENT_INDEX, MINT_RECIPIENT_INDEX + 32)
  );
  const amount = readUInt256BE(
    messageBodyData.slice(AMOUNT_INDEX, AMOUNT_INDEX + 32)
  );
  const messageSender = new anchor.web3.PublicKey(
    messageBodyData.slice(MESSAGE_SENDER_INDEX, MESSAGE_SENDER_INDEX + 32)
  );
  const messageBody = {
    bodyVersion,
    burnToken,
    mintRecipient,
    amount,
    messageSender,
  };

  const messageHeader = {
    headerVersion,
    sourceDomain,
    destinationDomain,
    nonce,
    headerSender,
    headerRecipient,
    destinationCaller,
    messageBody,
  };

  return { rentPayer, messageLength, messageHeader };
};
