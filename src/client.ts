/**
 * Sepolia icin tek bir viem wallet client.
 * Hem yazma (writeContract) hem okuma (readContract) yapabilir,
 * nonce'lari otomatik takip eder.
 */
import { http, createWalletClient, publicActions, nonceManager } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const pk = process.env.TESTNET_HOTWALLET_PK;

if (!pk) {
  throw new Error(
    ".env dosyasinda TESTNET_HOTWALLET_PK yok. .env.example dosyasini kopyalayip doldur.",
  );
}
if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  throw new Error(
    "TESTNET_HOTWALLET_PK formati hatali. 0x ile baslayan 64 karakterlik hex olmali.",
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
