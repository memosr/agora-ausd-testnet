/**
 * Single viem client for Sepolia.
 *
 * Extended with publicActions so one object handles both writes and reads,
 * and with nonceManager so back-to-back transactions don't collide.
 */
import { http, createWalletClient, publicActions, nonceManager } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const pk = process.env.TESTNET_HOTWALLET_PK;

if (!pk) {
  throw new Error(
    "TESTNET_HOTWALLET_PK missing from .env. Copy .env.example and fill it in.",
  );
}
if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  throw new Error(
    "TESTNET_HOTWALLET_PK is malformed. Expected 0x followed by 64 hex characters.",
  );
}

export const account = privateKeyToAccount(pk as `0x${string}`, { nonceManager });

export const client = createWalletClient({
  chain: sepolia,
  transport: http(
    process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  ),
  account,
}).extend(publicActions);

export const explorerTx = (hash: `0x${string}`) =>
  `https://sepolia.etherscan.io/tx/${hash}`;
