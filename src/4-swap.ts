/**
 * Step 4: swap AUSD for CTK (fixed input, swapExactTokensForTokens).
 *
 *   npm run swap
 *   npm run swap -- 250
 *
 * Flow:
 *   1. Preflight checks (role, paused, balance)
 *   2. Resolve token order from the chain, build swapPath
 *   3. Quote via getAmountsOut, subtract slippage headroom
 *   4. Approve only if current allowance is short
 *   5. swapExactTokensForTokens
 */
import { formatUnits, parseUnits } from "viem";
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, stableSwapAbi, erc20Abi, APPROVED_SWAPPER } from "./config.js";

// Tolerated gap between quote and actual output, in basis points.
// 50 bps = 0.5%. Price comes from an oracle and can update between the quote
// and the transaction landing; passing the quote directly as amountOutMin
// risks InsufficientOutputAmount().
const SLIPPAGE_BPS = 50n;

const PAIR = ADDRESSES.pair;
const INPUT_SYMBOL = "AUSD";

/** Resolve token order from the pair and return [tokenIn, tokenOut]. */
async function buildSwapPath(inputSymbol: string) {
  const [name, token0, token1] = await Promise.all([
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "name" }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "token0" }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "token1" }),
  ]);

  // "TOKEN0/TOKEN1-major.minor.patch"
  const [sym0, rest] = (name as string).split("/");
  const sym1 = rest?.split("-")[0] ?? "";

  if (sym0 === inputSymbol) return { path: [token0, token1] as const, name, inSym: sym0, outSym: sym1 };
  if (sym1 === inputSymbol) return { path: [token1, token0] as const, name, inSym: sym1, outSym: sym0 };
  throw new Error(`${inputSymbol} is not part of pair ${name}`);
}

async function main() {
  const humanAmount = process.argv[2] ?? "100";

  // --- 1. Preflight ---------------------------------------------------------
  const [whitelisted, paused] = await Promise.all([
    client.readContract({
      address: PAIR,
      abi: stableSwapAbi,
      functionName: "hasRole",
      args: [APPROVED_SWAPPER, account.address],
    }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "isPaused" }),
  ]);

  if (paused) throw new Error("Pair is paused.");
  if (!whitelisted) throw new Error("Wallet lacks APPROVED_SWAPPER. Run: npm run whitelist");

  // --- 2. Direction ---------------------------------------------------------
  const { path, name, inSym, outSym } = await buildSwapPath(INPUT_SYMBOL);
  const [tokenIn, tokenOut] = path;
  console.log(`Pair     : ${name}`);
  console.log(`Direction: ${inSym} -> ${outSym}`);

  const [decIn, decOut] = await Promise.all([
    client.readContract({ address: tokenIn, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: tokenOut, abi: erc20Abi, functionName: "decimals" }),
  ]);

  const amountIn = parseUnits(humanAmount, decIn);

  const balance = await client.readContract({
    address: tokenIn,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  if (balance < amountIn) {
    throw new Error(
      `Insufficient ${inSym}. Have ${formatUnits(balance, decIn)}, need ${humanAmount}. ` +
        `Run: npm run faucet`,
    );
  }

  // --- 3. Quote -------------------------------------------------------------
  const amounts = (await client.readContract({
    address: PAIR,
    abi: stableSwapAbi,
    functionName: "getAmountsOut",
    args: [amountIn, [...path]],
  })) as readonly bigint[];

  const quoted = amounts[1];
  const amountOutMin = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  console.log(`\nInput    : ${formatUnits(amountIn, decIn)} ${inSym}`);
  console.log(`Quote    : ${formatUnits(quoted, decOut)} ${outSym}`);
  console.log(`Min accept: ${formatUnits(amountOutMin, decOut)} ${outSym} (${Number(SLIPPAGE_BPS) / 100}% slippage)`);

  // --- 4. Approve if needed -------------------------------------------------
  const allowance = await client.readContract({
    address: tokenIn,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, PAIR],
  });

  if (allowance < amountIn) {
    console.log(`\nApproval needed (current allowance: ${formatUnits(allowance, decIn)})...`);
    const { request } = await client.simulateContract({
      address: tokenIn,
      abi: erc20Abi,
      functionName: "approve",
      args: [PAIR, amountIn],
    });
    const hash = await client.writeContract(request);
    console.log("  tx:", explorerTx(hash));
    await client.waitForTransactionReceipt({ hash });
  } else {
    console.log("\nAllowance sufficient, skipping approval.");
  }

  // --- 5. Swap --------------------------------------------------------------
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // +5 min
  console.log("\nSending swapExactTokensForTokens...");

  const { request } = await client.simulateContract({
    address: PAIR,
    abi: stableSwapAbi,
    functionName: "swapExactTokensForTokens",
    args: [amountIn, amountOutMin, [...path], account.address, deadline],
  });
  const hash = await client.writeContract(request);
  console.log("  tx:", explorerTx(hash));

  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`  status: ${receipt.status} (block ${receipt.blockNumber}, gas ${receipt.gasUsed})`);

  const newBal = await client.readContract({
    address: tokenOut,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`\nNew ${outSym} balance: ${formatUnits(newBal, decOut)}`);
}

main().catch((e) => {
  console.error("\nERROR:", e.shortMessage ?? e.message);
  process.exit(1);
});
