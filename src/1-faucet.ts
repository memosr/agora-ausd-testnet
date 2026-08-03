/**
 * Adim 1: Faucet'ten testnet AUSD (ve istege bagli CTK) cek.
 *
 * Calistir:  npm run faucet
 *
 * Not: Once cuzdaninda Sepolia ETH olmali (gas icin).
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
  return { raw, decimals, symbol, formatted: formatUnits(raw, decimals) };
}

async function requestFromFaucet(faucet: `0x${string}`, label: string) {
  console.log(`\n${label} faucet cagriliyor...`);
  try {
    const { request } = await client.simulateContract({
      address: faucet,
      abi: faucetAbi,
      functionName: "requestFunds",
      args: [account.address],
    });
    const hash = await client.writeContract(request);
    console.log(`  tx gonderildi: ${explorerTx(hash)}`);
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log(`  onaylandi (block ${receipt.blockNumber}, status: ${receipt.status})`);
  } catch (err) {
    // Faucet'ler genelde cooldown uygular; bu bir hata degil, bilgi.
    console.log(`  atlandi: ${(err as Error).message.split("\n")[0]}`);
  }
}

async function main() {
  console.log("Cuzdan:", account.address);

  const eth = await client.getBalance({ address: account.address });
  console.log("Sepolia ETH:", formatUnits(eth, 18));
  if (eth === 0n) {
    throw new Error(
      "Sepolia ETH bakiyen sifir. Gas olmadan islem gonderemezsin.\n" +
        "Faucet: https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
    );
  }

  await requestFromFaucet(ADDRESSES.ausdFaucet, "AUSD");
  await requestFromFaucet(ADDRESSES.ctkFaucet, "CTK");

  console.log("\n--- Bakiyeler ---");
  for (const token of [ADDRESSES.ausd, ADDRESSES.ctk] as const) {
    const b = await balanceOf(token);
    console.log(`  ${b.symbol.padEnd(5)} ${b.formatted}`);
  }
}

main().catch((e) => {
  console.error("\nHATA:", e.message);
  process.exit(1);
});
