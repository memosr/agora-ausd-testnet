/**
 * Adim 4: AUSD -> CTK swap (fixed-input, swapExactTokensForTokens).
 *
 * Calistir:  npm run swap
 *            npm run swap -- 250        (250 AUSD swapla)
 *
 * Akis:
 *   1. On kontroller (whitelist, paused, bakiye)
 *   2. Token sirasini zincirden oku, swapPath kur
 *   3. getAmountsOut ile teklif al, slippage payi birak
 *   4. Sadece gerekiyorsa approve gonder
 *   5. swapExactTokensForTokens
 */
import { formatUnits, parseUnits } from "viem";
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, stableSwapAbi, erc20Abi, APPROVED_SWAPPER } from "./config.js";

// Teklif ile gercek cikti arasindaki kabul edilebilir fark (basis point).
// 50 bps = %0.5. Dokumandaki ornek teklifi dogrudan amountOutMin yapiyor;
// bu fiyat oynarsa InsufficientOutputAmount ile revert eder.
const SLIPPAGE_BPS = 50n;

const PAIR = ADDRESSES.pair;
const INPUT_SYMBOL = "AUSD";

/** Pair'in name() ciktisindan token sirasini cozer, [input, output] dizisi dondurur. */
async function buildSwapPath(inputSymbol: string) {
  const [name, token0, token1] = await Promise.all([
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "name" }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "token0" }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "token1" }),
  ]);

  // name formati: "TOKEN0/TOKEN1-major.minor.patch"
  const [sym0, rest] = (name as string).split("/");
  const sym1 = rest?.split("-")[0] ?? "";

  if (sym0 === inputSymbol) return { path: [token0, token1] as const, name, inSym: sym0, outSym: sym1 };
  if (sym1 === inputSymbol) return { path: [token1, token0] as const, name, inSym: sym1, outSym: sym0 };
  throw new Error(`${inputSymbol} bu pair'de yok: ${name}`);
}

async function main() {
  const humanAmount = process.argv[2] ?? "100";

  // --- 1. On kontroller -----------------------------------------------------
  const [whitelisted, paused] = await Promise.all([
    client.readContract({
      address: PAIR,
      abi: stableSwapAbi,
      functionName: "hasRole",
      args: [APPROVED_SWAPPER, account.address],
    }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "isPaused" }),
  ]);

  if (paused) throw new Error("Pair su anda paused. Swap yapilamaz.");
  if (!whitelisted) throw new Error("Cuzdanin APPROVED_SWAPPER degil. Once: npm run whitelist");

  // --- 2. Swap yonu ---------------------------------------------------------
  const { path, name, inSym, outSym } = await buildSwapPath(INPUT_SYMBOL);
  const [tokenIn, tokenOut] = path;
  console.log(`Pair: ${name}`);
  console.log(`Yon : ${inSym} -> ${outSym}`);

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
      `Yetersiz ${inSym}. Bakiye ${formatUnits(balance, decIn)}, gereken ${humanAmount}. ` +
        `Once: npm run faucet`,
    );
  }

  // --- 3. Teklif ------------------------------------------------------------
  const amounts = (await client.readContract({
    address: PAIR,
    abi: stableSwapAbi,
    functionName: "getAmountsOut",
    args: [amountIn, [...path]],
  })) as readonly bigint[];

  const quoted = amounts[1];
  const amountOutMin = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  console.log(`\nGirdi        : ${formatUnits(amountIn, decIn)} ${inSym}`);
  console.log(`Teklif       : ${formatUnits(quoted, decOut)} ${outSym}`);
  console.log(`Min kabul    : ${formatUnits(amountOutMin, decOut)} ${outSym} (%${Number(SLIPPAGE_BPS) / 100} slippage)`);

  // --- 4. Approve (sadece gerekiyorsa) -------------------------------------
  const allowance = await client.readContract({
    address: tokenIn,
    abi: erc20Abi,
    functionName: "allowance",
    args: [account.address, PAIR],
  });

  if (allowance < amountIn) {
    console.log(`\nApprove gerekiyor (mevcut allowance: ${formatUnits(allowance, decIn)})...`);
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
    console.log("\nAllowance yeterli, approve atlandi.");
  }

  // --- 5. Swap --------------------------------------------------------------
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300); // +5 dk
  console.log("\nswapExactTokensForTokens gonderiliyor...");

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
  console.log(`\nYeni ${outSym} bakiyesi: ${formatUnits(newBal, decOut)}`);
}

main().catch((e) => {
  console.error("\nHATA:", e.shortMessage ?? e.message);
  process.exit(1);
});
