/**
 * Step 1: pull testnet AUSD (and CTK) from the faucet contracts.
 *
 *   npm run faucet
 *
 * Requires Sepolia ETH for gas:
 * https://cloud.google.com/application/web3/faucet/ethereum/sepolia
 */
import { formatUnits } from "viem";
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, faucetAbi, erc20Abi } from "./config.js";

async function balanceOf(token: `0x${string}`) {
  const [raw, decimals, symbol] = await Promise.all([
    client.readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }),
  ]);
  return { symbol, formatted: formatUnits(raw, decimals) };
}

async function requestFromFaucet(faucet: `0x${string}`, label: string) {
  console.log(`\nCalling ${label} faucet...`);
  try {
    // Simulate first so a doomed transaction never costs gas.
    const { request } = await client.simulateContract({
      address: faucet,
      abi: faucetAbi,
      functionName: "requestFunds",
      args: [account.address],
    });
    const hash = await client.writeContract(request);
    console.log(`  tx: ${explorerTx(hash)}`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`  confirmed (block ${receipt.blockNumber}, status: ${receipt.status})`);
  } catch (err) {
    // Faucets rate-limit per address. Not fatal, just skip.
    console.log(`  skipped: ${(err as Error).message.split("\n")[0]}`);
  }
}

async function main() {
  console.log("Wallet:", account.address);

  const eth = await client.getBalance({ address: account.address });
  console.log("Sepolia ETH:", formatUnits(eth, 18));
  if (eth === 0n) {
    throw new Error(
      "Zero ETH balance. You cannot send transactions without gas.\n" +
        "Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
    );
  }

  await requestFromFaucet(ADDRESSES.ausdFaucet, "AUSD");
  await requestFromFaucet(ADDRESSES.ctkFaucet, "CTK");

  console.log("\n--- Balances ---");
  for (const token of [ADDRESSES.ausd, ADDRESSES.ctk] as const) {
    const b = await balanceOf(token);
    console.log(`  ${b.symbol.padEnd(5)} ${b.formatted}`);
  }
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
