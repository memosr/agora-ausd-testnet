/**
 * Step 2: grant yourself the APPROVED_SWAPPER role.
 *
 *   npm run whitelist
 *
 * Agora Stable Swaps is permissioned. Without this role every swap reverts
 * with AddressIsNotRole("APPROVED_SWAPPER").
 *
 * Self-whitelisting works on testnets only. On mainnet the role requires KYC
 * through Agora.
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
  console.log("Wallet:", account.address);
  console.log("Pair  :", ADDRESSES.pair);

  // Check first so we don't burn gas on a no-op.
  if (await isWhitelisted(account.address)) {
    console.log("\nAlready whitelisted. You can swap.");
    return;
  }

  console.log("\nNot whitelisted. Calling setApprovedSwapper...");
  const { request } = await client.simulateContract({
    address: ADDRESSES.whitelister,
    abi: whitelisterAbi,
    functionName: "setApprovedSwapper",
    args: [account.address],
  });
  const hash = await client.writeContract(request);
  console.log("  tx:", explorerTx(hash));
  await client.waitForTransactionReceipt({ hash });

  // A successful receipt does not guarantee the role landed. Read it back.
  const ok = await isWhitelisted(account.address);
  console.log(ok ? "\nWhitelisted." : "\nTransaction succeeded but role is still missing.");
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
