/**
 * Step 3: inspect the pair. Reads only, sends nothing, costs no gas.
 *
 *   npm run inspect
 *
 * Run this before anything else. It shows token order, price, reserves,
 * fees, your role and your balances.
 */
import { formatUnits } from "viem";
import { client, account } from "./client.js";
import { ADDRESSES, stableSwapAbi, erc20Abi, APPROVED_SWAPPER } from "./config.js";

async function main() {
  const pair = ADDRESSES.pair;

  const [name, token0, token1, dec0, dec1, res0, res1, price, priceNorm, fee0, fee1, paused, whitelisted] =
    await Promise.all([
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "name" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token0" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token1" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token0Decimals" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "token1Decimals" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "reserve0" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "reserve1" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "getPrice" }),
      client.readContract({ address: pair, abi: stableSwapAbi, functionName: "getPriceNormalized" }),
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

  // name() is formatted "TOKEN0/TOKEN1-x.y.z" so it encodes the token order.
  const [sym0, rest] = (name as string).split("/");
  const sym1 = rest?.split("-")[0] ?? "?";

  console.log("=== Pair ===");
  console.log("  name    :", name);
  console.log("  address :", pair);
  console.log("  paused  :", paused);
  console.log();
  console.log("=== Tokens ===");
  console.log(`  token0  : ${sym0} ${token0} (${dec0} decimals)`);
  console.log(`  token1  : ${sym1} ${token1} (${dec1} decimals)`);
  console.log();
  console.log("=== Liquidity ===");
  console.log(`  reserve0: ${formatUnits(res0, Number(dec0))} ${sym0}`);
  console.log(`  reserve1: ${formatUnits(res1, Number(dec1))} ${sym1}`);
  console.log();
  console.log("=== Price & fees ===");
  // getPrice is in raw units, so it carries the decimal gap between the tokens.
  // getPriceNormalized rescales both sides to 18 decimals, which is readable.
  console.log(`  getPrice          : ${formatUnits(price, 18)}  (raw units)`);
  console.log(`  getPriceNormalized: ${formatUnits(priceNorm, 18)}`);
  console.log(`  token0PurchaseFee : ${Number(formatUnits(fee0, 18)) * 100}%`);
  console.log(`  token1PurchaseFee : ${Number(formatUnits(fee1, 18)) * 100}%`);
  console.log();
  console.log("=== Your wallet ===");
  console.log("  address         :", account.address);
  console.log("  APPROVED_SWAPPER:", whitelisted ? "yes" : "NO (run: npm run whitelist)");

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
    console.log(`  ${String(label).padEnd(16)}: ${formatUnits(bal, dec)}`);
  }
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
