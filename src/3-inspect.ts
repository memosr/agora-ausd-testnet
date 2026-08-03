/**
 * Adim 3: Pair'i incele. Hicbir islem gondermez, sadece okur (gas maliyeti yok).
 *
 * Calistir:  npm run inspect
 *
 * Swap yazmadan once burayi calistir: token sirasini, fiyati, rezervleri
 * ve whitelist durumunu gorursun.
 */
import { formatUnits } from "viem";
import { client, account } from "./client.js";
import { ADDRESSES, stableSwapAbi, erc20Abi, APPROVED_SWAPPER } from "./config.js";

async function main() {
  const pair = ADDRESSES.pair;

  const [name, token0, token1, dec0, dec1, res0, res1, price, fee0, fee1, paused, whitelisted] =
    await Promise.all([
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "name" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token0" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token1" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token0Decimals" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token1Decimals" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "reserve0" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "reserve1" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "getPrice" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token0PurchaseFee" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token1PurchaseFee" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "isPaused" }),
      client.readContract({
        address: pair,
        abi: stableSwapAbi,
        functionName: "hasRole",
        args: [APPROVED_SWAPPER, account.address],
      }),
    ]);

  // name formati "TOKEN0/TOKEN1-x.y.z" seklinde, token sirasini buradan okuyoruz.
  const [sym0, rest] = (name as string).split("/");
  const sym1 = rest?.split("-")[0] ?? "?";

  console.log("=== Pair ===");
  console.log("  name    :", name);
  console.log("  adres   :", pair);
  console.log("  paused  :", paused);
  console.log();
  console.log("=== Tokenlar ===");
  console.log(`  token0  : ${sym0} ${token0} (${dec0} decimals)`);
  console.log(`  token1  : ${sym1} ${token1} (${dec1} decimals)`);
  console.log();
  console.log("=== Likidite ===");
  console.log(`  reserve0: ${formatUnits(res0, Number(dec0))} ${sym0}`);
  console.log(`  reserve1: ${formatUnits(res1, Number(dec1))} ${sym1}`);
  console.log();
  console.log("=== Fiyat & ucret (18 decimal precision) ===");
  console.log(`  getPrice          : ${formatUnits(price, 18)}`);
  console.log(`  token0PurchaseFee : ${formatUnits(fee0, 18)}  (%${Number(formatUnits(fee0, 18)) * 100})`);
  console.log(`  token1PurchaseFee : ${formatUnits(fee1, 18)}  (%${Number(formatUnits(fee1, 18)) * 100})`);
  console.log();
  console.log("=== Senin cuzdanin ===");
  console.log("  adres          :", account.address);
  console.log("  APPROVED_SWAPPER:", whitelisted ? "evet" : "HAYIR (npm run whitelist calistir)");

  for (const [label, token, dec] of [
    [sym0, token0 as `0x${string}`, Number(dec0)],
    [sym1, token1 as `0x${string}`, Number(dec1)],
  ] as const) {
    const bal = await client.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(`  ${String(label).padEnd(15)}: ${formatUnits(bal, dec)}`);
  }
}

main().catch((e) => {
  console.error("\nHATA:", e.message);
  process.exit(1);
});
