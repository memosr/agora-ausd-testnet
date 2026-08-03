/**
 * Adim 2: Kendini APPROVED_SWAPPER olarak whitelist'e ekle.
 *
 * Calistir:  npm run whitelist
 *
 * Agora Stable Swaps izinli (permissioned) bir protokol. Bu rol olmadan
 * swap fonksiyonlari AddressIsNotRole("APPROVED_SWAPPER") ile revert eder.
 * Self-whitelist SADECE testnet'te mumkun; mainnet'te KYC gerekiyor.
 */
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, stableSwapAbi, whitelisterAbi, APPROVED_SWAPPER } from "./config.js";

async function isWhitelisted(address: `0x${string}`) {
  return client.readContract({
    address: ADDRESSES.pair,
    abi: stableSwapAbi,
    functionName: "hasRole",
    args: [APPROVED_SWAPPER, address],
  });
}

async function main() {
  console.log("Cuzdan:", account.address);
  console.log("Pair  :", ADDRESSES.pair);

  if (await isWhitelisted(account.address)) {
    console.log("\nZaten whitelist'tesin. Swap yapabilirsin.");
    return;
  }

  console.log("\nWhitelist'te degilsin, setApprovedSwapper cagriliyor...");
  const { request } = await client.simulateContract({
    address: ADDRESSES.whitelister,
    abi: whitelisterAbi,
    functionName: "setApprovedSwapper",
    args: [account.address],
  });
  const hash = await client.writeContract(request);
  console.log("  tx:", explorerTx(hash));
  await client.waitForTransactionReceipt({ hash });

  const ok = await isWhitelisted(account.address);
  console.log(ok ? "\nWhitelist basarili." : "\nTx gecti ama rol hala yok, kontrol et.");
}

main().catch((e) => {
  console.error("\nHATA:", e.message);
  process.exit(1);
});
