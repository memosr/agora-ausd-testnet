# Agora AUSD - Sepolia Testnet Playground

Agora Stable Swaps protokolünü Ethereum Sepolia üzerinde uçtan uca çalıştıran minimal bir TypeScript projesi. Faucet'ten token çekme, kendini whitelist'e ekleme, pair'i inceleme ve gerçek bir swap atma adımlarını ayrı ayrı scriptlere böler.

## Kurulum

```bash
npm install
cp .env.example .env
```

`.env` içine **sadece testnet için oluşturduğun** yeni bir cüzdanın private key'ini yaz:

```
TESTNET_HOTWALLET_PK=0x...
```

Mainnet cüzdanını asla buraya koyma. `.env` zaten `.gitignore`'da.

Gas için biraz Sepolia ETH lazım: https://cloud.google.com/application/web3/faucet/ethereum/sepolia

## Adımlar

Sırayla çalıştır:

```bash
npm run faucet      # 1. AUSD + CTK çek
npm run whitelist   # 2. APPROVED_SWAPPER rolünü al
npm run inspect     # 3. Pair'i incele (sadece okuma, gas yok)
npm run swap        # 4. 100 AUSD -> CTK swap
npm run swap -- 250 # farklı miktar
```

`npm run inspect` hiç işlem göndermez. Bir şey ters giderse önce bunu çalıştır: token sırasını, fiyatı, rezervleri ve whitelist durumunu gösterir.

## Bilinmesi gerekenler

**Swap izinlidir.** Cüzdanının pair üzerinde `APPROVED_SWAPPER` rolü yoksa swap `AddressIsNotRole("APPROVED_SWAPPER")` ile revert eder. Testnet'te Whitelister kontratı üzerinden kendini ekleyebilirsin; mainnet'te Agora üzerinden KYC gerekiyor.

**Token sırası sabit değil, zincirden okunur.** Pair'in `name()` fonksiyonu `"CTK/AUSD-1.0.0"` gibi bir string döner. İlk sembol token0, ikincisi token1. `swapPath` her zaman `[girdiToken, çıktıToken]` olmalı ve tam 2 adres içermeli, yoksa `InvalidPath()` alırsın.

**Decimal'ler farklı.** AUSD 6, CTK 18 decimal. Fiyat ve ücretler ise kontrat içinde 18 decimal hassasiyetle tutuluyor. `parseUnits` / `formatUnits` kullanmadan elle çarpma yapma.

**Slippage payı bırakılıyor.** `4-swap.ts` teklifin %0.5 altını `amountOutMin` olarak veriyor (`SLIPPAGE_BPS`). Teklifi doğrudan minimum yaparsan iki blok arasında fiyat oynadığında `InsufficientOutputAmount()` ile revert eder.

## Sepolia adresleri

| | |
|---|---|
| StableSwap Factory | `0x8468587Af422ad440F58a57E955eCA6A970b5375` |
| CTK/AUSD Pair | `0x1Aa8958Aa34cEC8096EF4381cb335effe977b0ae` |
| Whitelister (testnet) | `0x7c10F56d6f04a51376393a1C3670e966863F6BD5` |
| AUSD (6 dec) | `0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC` |
| CTK (18 dec) | `0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D` |
| AUSD Faucet | `0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C` |
| CTK Faucet | `0xf8A143b3406faF59FD9A34891076104B10200B1D` |

Whitelister, Factory ve Pair adresleri tüm testnetlerde aynı (CREATE3 deterministik deployment). Avalanche Fuji'ye geçmek için `src/client.ts` içindeki `sepolia` chain'ini `avalancheFuji` ile değiştirmen yeterli.

## Yaygın hatalar

| Hata | Sebep |
|---|---|
| `AddressIsNotRole("APPROVED_SWAPPER")` | `npm run whitelist` çalıştırmadın |
| `InsufficientOutputAmount()` | Fiyat oynadı, slippage payını artır |
| `InvalidPath()` / `InvalidPathLength()` | swapPath tam 2 adres ve pair'in tokenları olmalı |
| `InsufficientLiquidity()` | Pair'de yeterli rezerv yok, miktarı düşür |
| `Expired()` | Deadline geçti, süreyi uzat |
| `PairIsPaused()` | Pair duraklatılmış |

## Kaynaklar

- [Agora Stable Swaps dokümantasyonu](https://docs.agora.finance/stable-swaps)
- [Pair kontrat referansı](https://docs.agora.finance/stable-swaps/smart-contracts/pair-contract)
- [Resmi örnek repo](https://github.com/agora-finance/stable-swap-examples)
