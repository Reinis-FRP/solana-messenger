export const evmAddressToBytes32 = (address: string): string =>
  `0x000000000000000000000000${address.replace("0x", "")}`;

export const readUInt256BE = (buffer: Buffer): BigInt => {
  let result = BigInt(0);
  for (let i = 0; i < buffer.length; i++) {
    result = (result << BigInt(8)) + BigInt(buffer[i]);
  }
  return result;
};
