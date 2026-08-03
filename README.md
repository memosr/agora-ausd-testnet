# agora-ausd-testnet

Run [Agora Stable Swaps](https://docs.agora.finance/stable-swaps) end to end on Ethereum Sepolia. Four scripts, no real funds, about 15 minutes.

Faucet → self-whitelist → inspect → swap.

> Turkish walkthrough: [REHBER.md](./REHBER.md)

## Why this exists

Agora issues AUSD, a fully reserved USD stablecoin (reserves managed by VanEck, custodied at State Street). Their Stable Swaps protocol prices from an oracle rather than a pool ratio, so stablecoin swaps execute at a fixed price with no slippage.

It's also **permissioned**, which surprises most people on first contact. This repo makes that whole flow runnable so you can see it rather than read about it.

## Setup

Requires Node 18+.

```bash
git clone https://github.com/memosr/agora-ausd-testnet.git
cd agora-ausd-testnet
npm install
cp .env.example .env
```

Put a **throwaway** private key in `.env`. Never a wallet holding real funds:

```
TESTNET_HOTWALLET_PK=0x...
```

Fund it with Sepolia ETH for gas: [Google Cloud faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

## Run

```bash
npm run inspect     # read-only, costs nothing. start here.
npm run faucet      # get 10,000 AUSD + 10,000 CTK
npm run whitelist   # grant yourself APPROVED_SWAPPER
npm run swap        # 100 AUSD -> CTK
npm run swap -- 250 # custom amount
```

| Script | What it does |
|---|---|
| `src/3-inspect.ts` | Reads pair name, token order, decimals, reserves, price, fees, your role and balances. No transactions. |
| `src/1-faucet.ts` | Calls `requestFunds()` on both testnet faucets. Tolerates cooldown rejections. |
| `src/2-whitelist.ts` | Checks `hasRole`, calls `setApprovedSwapper` if needed, re-reads to confirm. |
| `src/4-swap.ts` | Preflight checks, resolves direction from chain, quotes, approves if needed, swaps. |

Sample output:

```
Pair: CTK/AUSD
Yon : AUSD -> CTK

Girdi        : 100 AUSD
Teklif       : 100 CTK
Min kabul    : 99.5 CTK (%0.5 slippage)

swapExactTokensForTokens gonderiliyor...
  status: success (block 11412739, gas 104388)
```

## Gotchas

**Swaps are permissioned.** Your wallet needs the `APPROVED_SWAPPER` role on the pair or the call reverts with `AddressIsNotRole("APPROVED_SWAPPER")` and your gas is gone. On testnets a Whitelister contract holds `WHITELISTER_ROLE` across all pairs so you can self-whitelist. On mainnet this requires KYC through Agora.

**`getPrice()` returns 1000000000000, not 1.** That's 10^12, exactly the decimal gap between CTK (18) and AUSD (6). The contract prices in raw units. Economically it's 1:1. Use `getPriceNormalized()` if you want the readable number.

**Token order is not what you'd assume.** The pair's `name()` returns `CTK/AUSD`, so CTK is token0 despite AUSD being the headline asset. Ordering follows address sort, not economic importance. These scripts read it from the chain instead of hardcoding it. `swapPath` must be `[tokenIn, tokenOut]`, exactly 2 addresses, or you get `InvalidPath()`.

**Leave slippage headroom.** Price comes from an oracle and can update between your quote and your transaction landing. Passing the quote directly as `amountOutMin` risks `InsufficientOutputAmount()`. `src/4-swap.ts` uses 50 bps (`SLIPPAGE_BPS`).

**Approve is a separate transaction.** The pair can't pull your AUSD until you approve it. The swap script skips approval when existing allowance already covers the amount.

## Sepolia addresses

| | |
|---|---|
| StableSwap Factory | `0x8468587Af422ad440F58a57E955eCA6A970b5375` |
| CTK/AUSD Pair | `0x1Aa8958Aa34cEC8096EF4381cb335effe977b0ae` |
| Whitelister (testnet only) | `0x7c10F56d6f04a51376393a1C3670e966863F6BD5` |
| AUSD (6 dec) | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| CTK (18 dec) | `0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D` |
| AUSD Faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` |
| CTK Faucet | `0xf8A143b3406faF59FD9A34891076104B10200B1D` |

Factory, Pair and Whitelister share the same address on every testnet thanks to CREATE3 deterministic deployment. To target Avalanche Fuji instead, swap `sepolia` for `avalancheFuji` in `src/client.ts`. Nothing else changes.

## Common reverts

| Error | Cause |
|---|---|
| `AddressIsNotRole("APPROVED_SWAPPER")` | Run `npm run whitelist` |
| `InsufficientOutputAmount()` | Price moved, raise `SLIPPAGE_BPS` |
| `InvalidPath()` / `InvalidPathLength()` | Path must be exactly 2 addresses matching the pair |
| `InsufficientLiquidity()` | Reserves too low, reduce amount |
| `Expired()` | Deadline passed, extend it |
| `PairIsPaused()` | Pair is paused |

## Links

- [Stable Swaps docs](https://docs.agora.finance/stable-swaps)
- [Pair contract reference](https://docs.agora.finance/stable-swaps/smart-contracts/pair-contract)
- [Contract deployments](https://docs.agora.finance/developer/contract-deployments)
- [Official examples repo](https://github.com/agora-finance/stable-swap-examples)

Agora docs expose `/llms.txt` and serve markdown by appending `.md` to any page, which is handy if you work with AI tooling.

---

Testnet only. Testnet assets have no monetary value. Never commit `.env`.
