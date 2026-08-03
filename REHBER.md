# Agora Stable Swaps'i Sıfırdan Test Etmek

Bir akşamda, hiç para harcamadan, kurumsal bir stablecoin protokolünü uçtan uca çalıştırma rehberi.

---

Web3'e yeni başlayan çoğu geliştirici aynı yerde tıkanıyor: dokümanı okuyorsun, mantıklı geliyor, ama kendi terminalinde çalıştırmadığın hiçbir şeyi gerçekten öğrenmiş olmuyorsun. Bu yazı o boşluğu kapatmak için.

Sonunda şunları yapmış olacaksın: bir test cüzdanı oluşturmak, faucet'ten token çekmek, izinli bir protokolde kendini yetkilendirmek ve gerçek bir swap işlemi göndermek. Hepsi Ethereum Sepolia test ağında, yani gerçek para riski sıfır.

Yol boyunca kafanı karıştıracak dört şeyle karşılaşacaksın. Onları da tek tek açacağım, çünkü asıl öğrenme orada.

> **Not:** Bu repoda kodun hazır hali zaten var. `npm install` deyip doğrudan çalıştırabilirsin.
> Aşağıdaki adımlar projeyi sıfırdan kurmak isteyenler için, çünkü her satırı kendin yazdığında
> gerçekten öğreniyorsun. Acelen varsa [README](./README.md)'ye bak, dört komutla bitiyor.

## Agora ve AUSD nedir

Agora, 2023'te kurulmuş New York merkezli bir şirket. AUSD adında, 1'e 1 dolar destekli bir stablecoin çıkarıyorlar. Rezervleri VanEck yönetiyor, State Street saklıyor. Paradigm liderliğinde 50 milyon dolarlık yatırım aldılar.

Diğer stablecoin'lerden ayrıldığı nokta iş modeli: rezervlerden gelen getiriyi kendilerine saklamak yerine, AUSD'yi entegre eden uygulamalar, borsalar ve cüzdanlarla paylaşıyorlar.

Bu yazının konusu olan **Stable Swaps** ise ikinci ürünleri: stablecoin'ler arasında sabit fiyatlı, slippage'sız takas yapan bir protokol. Uniswap gibi bir AMM değil, ve bu fark birazdan çok net görülecek.

## Neye ihtiyacın var

- **Node.js 18 veya üstü.** Kontrol: `node -v`. Yoksa `brew install node` (macOS).
- **MetaMask.** Tarayıcı eklentisi, [metamask.io](https://metamask.io) üzerinden.
- **Terminal.** macOS'te Terminal, Windows'ta PowerShell.
- **Yaklaşık 30 dakika.**

Gerçek paraya ihtiyacın yok. Hiçbir adımda cüzdanından bir kuruş çıkmayacak.

---

## Adım 1: Projeyi kur

Boş bir klasör aç ve bağımlılıkları yükle:

```bash
mkdir agora-ausd-testnet && cd agora-ausd-testnet
npm init -y
npm install viem dotenv
npm install -D typescript tsx @types/node
```

`viem`, Ethereum ile konuşmak için kullanacağımız TypeScript kütüphanesi. `dotenv` ise private key'i koddan ayrı tutmamızı sağlıyor.

`package.json` dosyasını aç ve şu iki şeyi ekle:

```json
{
  "type": "module",
  "scripts": {
    "inspect": "tsx src/inspect.ts",
    "faucet": "tsx src/faucet.ts",
    "whitelist": "tsx src/whitelist.ts",
    "swap": "tsx src/swap.ts"
  }
}
```

`tsconfig.json` oluştur:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

Bir de `.gitignore`, çünkü birazdan içine private key yazacağımız bir dosya oluşturacağız:

```
node_modules/
.env
```

Bu satırı atlamak, GitHub'a private key göndermenin en yaygın yolu. Şimdi yaz.

## Adım 2: Test cüzdanı oluştur

Private key'i düz metin olarak diske yazacağız. Bu yüzden **içinde gerçek para olan hiçbir cüzdanı kullanma.** Sıfırdan, sadece bu proje için bir hesap açıyoruz.

MetaMask'te:

1. Sağ üstteki hesap ikonu
2. **Add account or hardware wallet** → **Add a new account**
3. İsim: `agora-testnet`
4. Oluşan hesabın üç nokta menüsü → **Account details** → **Show private key**

Proje kökünde `.env` dosyası oluştur:

```
TESTNET_HOTWALLET_PK=0x_buraya_kopyaladigin_key
```

`0x` ile başlamalı, toplam 66 karakter olmalı.

Şimdi `src/client.ts` dosyasını oluştur. Bu, tüm scriptlerin ortak kullanacağı bağlantı:

```ts
import { http, createWalletClient, publicActions, nonceManager } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import "dotenv/config";

const pk = process.env.TESTNET_HOTWALLET_PK;

if (!pk) throw new Error(".env dosyasında TESTNET_HOTWALLET_PK yok.");
if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
  throw new Error("Private key formatı hatalı. 0x + 64 hex karakter olmalı.");
}

export const account = privateKeyToAccount(pk as `0x${string}`, { nonceManager });

export const client = createWalletClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
  account,
}).extend(publicActions);

export const explorerTx = (hash: `0x${string}`) =>
  `https://sepolia.etherscan.io/tx/${hash}`;
```

Buradaki `.extend(publicActions)` küçük ama işe yarar bir numara: normalde yazma işlemleri için `walletClient`, okuma için ayrı bir `publicClient` gerekir. Bu satır ikisini tek nesnede birleştiriyor.

`nonceManager` ise arka arkaya işlem gönderdiğinde nonce çakışmasını engelliyor.

Adresini görmek için:

```bash
node -e "const{privateKeyToAccount}=require('viem/accounts');require('dotenv').config();console.log(privateKeyToAccount(process.env.TESTNET_HOTWALLET_PK).address)"
```

## Adım 3: Sepolia ETH al

Her işlem gas istiyor. Şu an bakiyen sıfır, hiçbir şey gönderemezsin. Test ETH'nin parasal değeri yok, faucet'ler bedava dağıtıyor.

Sırayla dene:

1. [Google Cloud faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) (Google hesabı yeterli, 0.05 ETH)
2. [Alchemy](https://www.alchemy.com/faucets/ethereum-sepolia) (ücretsiz hesap gerekir)
3. [PoW faucet](https://sepolia-faucet.pk910.de) (hesap istemez, yavaş)

0.05 ETH bize fazlasıyla yeter. Toplam beş işlem göndereceğiz.

## Adım 4: Kontratları tanı

Zincire yazmadan önce okuyalım. Bu adım gas harcamıyor ve hiçbir riski yok.

`src/config.ts`:

```ts
export const ADDRESSES = {
  pair: "0x1Aa8958Aa34cEC8096EF4381cb335effe977b0ae",
  whitelister: "0x7c10F56d6f04a51376393a1C3670e966863F6BD5",
  ausd: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC",
  ctk: "0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D",
  ausdFaucet: "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C",
  ctkFaucet: "0xf8A143b3406faF59FD9A34891076104B10200B1D",
} as const;

export const stableSwapAbi = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "reserve0", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "reserve1", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getPrice", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "hasRole",
    inputs: [{ name: "_role", type: "string" }, { name: "_address", type: "address" }],
    outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getAmountsOut",
    inputs: [{ name: "_amountIn", type: "uint256" }, { name: "_path", type: "address[]" }],
    outputs: [{ type: "uint256[]" }], stateMutability: "view" },
  { type: "function", name: "swapExactTokensForTokens",
    inputs: [
      { name: "_amountIn", type: "uint256" },
      { name: "_amountOutMin", type: "uint256" },
      { name: "_path", type: "address[]" },
      { name: "_to", type: "address" },
      { name: "_deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256[]" }], stateMutability: "nonpayable" },
] as const;

export const erc20Abi = [
  { type: "function", name: "approve",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

export const faucetAbi = [
  { type: "function", name: "requestFunds",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [], stateMutability: "nonpayable" },
] as const;

export const whitelisterAbi = [
  { type: "function", name: "setApprovedSwapper",
    inputs: [{ name: "swapper", type: "address" }],
    outputs: [], stateMutability: "nonpayable" },
] as const;
```

ABI, kontratın arayüz tanımı. Bir kontrat zincirde derlenmiş bytecode olarak duruyor; hangi fonksiyonların olduğunu ve parametrelerinin tiplerini ABI'dan öğreniyoruz. Buraya sadece kullanacağımız fonksiyonları koydum, tamamına ihtiyaç yok.

Sondaki `as const` önemli: viem bu sayede fonksiyon isimlerini ve argüman tiplerini derleme zamanında biliyor. Yanlış parametre gönderirsen kod çalışmadan önce hata alırsın.

Şimdi `src/inspect.ts`:

```ts
import { formatUnits } from "viem";
import { client, account } from "./client.js";
import { ADDRESSES, stableSwapAbi, erc20Abi } from "./config.js";

const pair = ADDRESSES.pair;
const read = (fn: string, args?: any[]) =>
  client.readContract({ address: pair, abi: stableSwapAbi, functionName: fn as any, args: args as any });

async function main() {
  const [name, token0, token1, res0, res1, price, paused, whitelisted] = await Promise.all([
    read("name"), read("token0"), read("token1"),
    read("reserve0"), read("reserve1"), read("getPrice"), read("isPaused"),
    read("hasRole", ["APPROVED_SWAPPER", account.address]),
  ]);

  const [sym0, rest] = (name as string).split("/");
  const sym1 = rest?.split("-")[0] ?? "?";

  console.log("Pair    :", name, paused ? "(PAUSED)" : "");
  console.log("token0  :", sym0, token0);
  console.log("token1  :", sym1, token1);
  console.log("getPrice:", formatUnits(price as bigint, 18));
  console.log("Cuzdan  :", account.address);
  console.log("Whitelist:", whitelisted ? "evet" : "HAYIR");

  for (const t of [ADDRESSES.ausd, ADDRESSES.ctk] as const) {
    const [bal, dec, sym] = await Promise.all([
      client.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
      client.readContract({ address: t, abi: erc20Abi, functionName: "decimals" }),
      client.readContract({ address: t, abi: erc20Abi, functionName: "symbol" }),
    ]);
    console.log(`  ${sym}: ${formatUnits(bal, dec)}`);
  }
}

main().catch((e) => { console.error("HATA:", e.message); process.exit(1); });
```

Çalıştır:

```bash
npm run inspect
```

Şuna benzer bir çıktı almalısın:

```
Pair    : CTK/AUSD
token0  : CTK 0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D
token1  : AUSD 0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC
getPrice: 1000000000000
Cuzdan  : 0x...
Whitelist: HAYIR
  AUSD: 0
  CTK: 0
```

İki şey dikkatini çekmiş olmalı. `getPrice` saçma bir sayı döndürdü ve token sırası muhtemelen beklediğin gibi değil. İkisini de yazının sonunda açacağım, şimdilik devam.

## Adım 5: Faucet'ten token çek

`src/faucet.ts`:

```ts
import { formatUnits } from "viem";
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, faucetAbi, erc20Abi } from "./config.js";

async function request(faucet: `0x${string}`, label: string) {
  console.log(`\n${label} faucet...`);
  try {
    const { request } = await client.simulateContract({
      address: faucet, abi: faucetAbi, functionName: "requestFunds", args: [account.address],
    });
    const hash = await client.writeContract(request);
    console.log("  tx:", explorerTx(hash));
    const receipt = await client.waitForTransactionReceipt({ hash });
    console.log("  onaylandi:", receipt.status);
  } catch (err) {
    console.log("  atlandi:", (err as Error).message.split("\n")[0]);
  }
}

async function main() {
  const eth = await client.getBalance({ address: account.address });
  console.log("Sepolia ETH:", formatUnits(eth, 18));
  if (eth === 0n) throw new Error("Gas icin Sepolia ETH lazim.");

  await request(ADDRESSES.ausdFaucet, "AUSD");
  await request(ADDRESSES.ctkFaucet, "CTK");

  for (const t of [ADDRESSES.ausd, ADDRESSES.ctk] as const) {
    const [bal, dec, sym] = await Promise.all([
      client.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
      client.readContract({ address: t, abi: erc20Abi, functionName: "decimals" }),
      client.readContract({ address: t, abi: erc20Abi, functionName: "symbol" }),
    ]);
    console.log(`${sym}: ${formatUnits(bal, dec)}`);
  }
}

main().catch((e) => { console.error("HATA:", e.message); process.exit(1); });
```

```bash
npm run faucet
```

Her faucet 10.000 token veriyor.

Burada bir kalıp var, aklında tut: `simulateContract` sonra `writeContract`. Simülasyon, işlemi zincire göndermeden önce kuru kuruya çalıştırıyor. Revert edecekse gas harcamadan öğreniyorsun. Bunu atlayıp doğrudan `writeContract` çağırabilirsin ama her başarısız işlemde para yakarsın.

Faucet'ler cooldown uygular. `atlandi: ...` görürsen sorun yok, biraz bekle.

## Adım 6: Kendini whitelist'e ekle

İşte Agora'yı sıradan bir DEX'ten ayıran nokta.

Uniswap'te havuza kim isterse swap atar. Agora'da atamaz. `swapExactTokensForTokens` çağrısı, cüzdanının pair kontratı üzerinde `APPROVED_SWAPPER` rolüne sahip olup olmadığını kontrol ediyor. Yoksa işlem `AddressIsNotRole("APPROVED_SWAPPER")` ile revert ediyor ve gas'ın yanıyor.

Sebebi teknik değil, düzenleyici. AUSD kurumsal bir stablecoin; rezervleri gerçek bir varlık yöneticisinde, gerçek bir saklama bankasında duruyor. Bu yapının ayakta kalması için kimin işlem yaptığının bilinmesi gerekiyor. **Mainnet'te bu rol KYC'den geçiyor.**

Testnet'te ise Agora bir `Whitelister` kontratı deploy etmiş. Bu kontrat tüm pair'lerde `WHITELISTER_ROLE`'a sahip ve `setApprovedSwapper` fonksiyonu herkese açık. Yani kendini yetkilendirebiliyorsun. Adres tüm test ağlarında aynı.

`src/whitelist.ts`:

```ts
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, stableSwapAbi, whitelisterAbi } from "./config.js";

const check = () => client.readContract({
  address: ADDRESSES.pair, abi: stableSwapAbi, functionName: "hasRole",
  args: ["APPROVED_SWAPPER", account.address],
});

async function main() {
  if (await check()) {
    console.log("Zaten whitelist'tesin.");
    return;
  }

  console.log("setApprovedSwapper cagriliyor...");
  const { request } = await client.simulateContract({
    address: ADDRESSES.whitelister, abi: whitelisterAbi,
    functionName: "setApprovedSwapper", args: [account.address],
  });
  const hash = await client.writeContract(request);
  console.log("  tx:", explorerTx(hash));
  await client.waitForTransactionReceipt({ hash });

  console.log(await check() ? "Whitelist basarili." : "Tx gecti ama rol yok, kontrol et.");
}

main().catch((e) => { console.error("HATA:", e.message); process.exit(1); });
```

```bash
npm run whitelist
```

Buradaki üç `check()` çağrısına dikkat et. Başta kontrol ediyoruz ki gereksiz gas harcamayalım. Sonda tekrar kontrol ediyoruz çünkü **işlem `success` dönmesi rolün gerçekten verildiği anlamına gelmiyor.** Zincire yazdıktan sonra okuyup doğrulamak, alışkanlık haline getirmen gereken bir şey.

Bu arada, `check()` fonksiyonunun `await` ile çağrıldığına dikkat et. Bu detay göründüğünden önemli, birazdan döneceğim.

## Adım 7: Swap

`src/swap.ts`:

```ts
import { formatUnits, parseUnits } from "viem";
import { client, account, explorerTx } from "./client.js";
import { ADDRESSES, stableSwapAbi, erc20Abi } from "./config.js";

const PAIR = ADDRESSES.pair;
const SLIPPAGE_BPS = 50n; // %0.5

async function main() {
  const humanAmount = process.argv[2] ?? "100";

  // 1. On kontroller
  const [whitelisted, paused] = await Promise.all([
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "hasRole",
      args: ["APPROVED_SWAPPER", account.address] }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "isPaused" }),
  ]);
  if (paused) throw new Error("Pair paused.");
  if (!whitelisted) throw new Error("Whitelist'te degilsin. Once: npm run whitelist");

  // 2. Yonu zincirden oku
  const [name, token0, token1] = await Promise.all([
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "name" }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "token0" }),
    client.readContract({ address: PAIR, abi: stableSwapAbi, functionName: "token1" }),
  ]);
  const [sym0, rest] = (name as string).split("/");
  const sym1 = rest?.split("-")[0] ?? "";

  // AUSD -> CTK yonunde gidiyoruz
  const path = (sym0 === "AUSD" ? [token0, token1] : [token1, token0]) as [`0x${string}`, `0x${string}`];
  const [tokenIn, tokenOut] = path;
  console.log(`Pair: ${name}\nYon : AUSD -> ${sym0 === "AUSD" ? sym1 : sym0}`);

  const [decIn, decOut] = await Promise.all([
    client.readContract({ address: tokenIn, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: tokenOut, abi: erc20Abi, functionName: "decimals" }),
  ]);
  const amountIn = parseUnits(humanAmount, decIn);

  // 3. Teklif al, slippage payi birak
  const amounts = await client.readContract({
    address: PAIR, abi: stableSwapAbi, functionName: "getAmountsOut", args: [amountIn, [...path]],
  }) as readonly bigint[];
  const quoted = amounts[1];
  const amountOutMin = (quoted * (10_000n - SLIPPAGE_BPS)) / 10_000n;

  console.log(`Girdi    : ${formatUnits(amountIn, decIn)}`);
  console.log(`Teklif   : ${formatUnits(quoted, decOut)}`);
  console.log(`Min kabul: ${formatUnits(amountOutMin, decOut)}`);

  // 4. Approve (sadece gerekiyorsa)
  const allowance = await client.readContract({
    address: tokenIn, abi: erc20Abi, functionName: "allowance", args: [account.address, PAIR],
  });
  if (allowance < amountIn) {
    const { request } = await client.simulateContract({
      address: tokenIn, abi: erc20Abi, functionName: "approve", args: [PAIR, amountIn],
    });
    const hash = await client.writeContract(request);
    console.log("Approve tx:", explorerTx(hash));
    await client.waitForTransactionReceipt({ hash });
  }

  // 5. Swap
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 300);
  const { request } = await client.simulateContract({
    address: PAIR, abi: stableSwapAbi, functionName: "swapExactTokensForTokens",
    args: [amountIn, amountOutMin, [...path], account.address, deadline],
  });
  const hash = await client.writeContract(request);
  console.log("Swap tx:", explorerTx(hash));
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log("status:", receipt.status, "gas:", receipt.gasUsed);
}

main().catch((e) => { console.error("HATA:", e.shortMessage ?? e.message); process.exit(1); });
```

```bash
npm run swap        # 100 AUSD
npm run swap -- 250 # farkli miktar
```

Çıktı:

```
Pair: CTK/AUSD
Yon : AUSD -> CTK
Girdi    : 100
Teklif   : 100
Min kabul: 99.5
Approve tx: https://sepolia.etherscan.io/tx/0x43bea2d7...
Swap tx: https://sepolia.etherscan.io/tx/0xfd3500b7...
status: success gas: 104388
```

Tebrikler, izinli bir stablecoin protokolünde ilk swap'ını attın.

---

## Yolda karşılaştığın dört tuzak

### 1. Approve, swap'ın parçası değil, ayrı bir işlem

ERC-20 kontratları, sen açıkça izin vermeden başka bir kontratın tokenlarını çekmesine izin vermez. Pair kontratının senin AUSD'ni alabilmesi için önce `approve` çağrısı gerekiyor.

Yani her yeni token için **iki işlem**: bir approve, bir swap. Scriptte mevcut `allowance`'ı okuyup yeterliyse approve'u atlıyoruz, çünkü ikinci kez aynı token'ı swaplarken bu adım gereksiz.

Bazı arayüzler "sonsuz approve" (`type(uint256).max`) verir, kullanıcı bir daha uğraşmasın diye. Kolaylık sağlar ama kontrat ele geçirilirse tüm bakiyen risk altında olur. Ödünleşme senin.

### 2. Sabit fiyat gerçekten sabit

Teklif 100 CTK dedi, tam 100 CTK aldık. 99.97 değil.

Uniswap gibi bir sabit çarpım AMM'inde bu imkansız. Orada fiyat havuzdaki oranla belirlenir ve senin işlemin kendisi o oranı değiştirir. Ne kadar büyük işlem, o kadar kötü fiyat. Buna slippage diyoruz.

Agora fiyatı havuzdan değil, bir oracle'dan alıyor. Rezervler işlemin **sığıp sığmadığını** belirliyor, **kaça mal olacağını** değil. Alışkanlıkla bıraktığımız %0.5 slippage payına hiç dokunulmadı.

Yine de o payı bırakmakta fayda var: fiyat oracle'dan geldiği için teklifi aldığın blok ile işlemin madenlendiği blok arasında güncellenebilir. Teklifi doğrudan `amountOutMin` olarak verirsen, en ufak oynamada `InsufficientOutputAmount()` alır ve gas'ını yakarsın.

### 3. getPrice() bozuk değil, sen ham birimlere bakıyorsun

`1000000000000` gördün ve muhtemelen bir şeyin yanlış olduğunu düşündün.

Bu sayı 10^12. Ve 10^12, iki tokenin decimal farkının tam karşılığı: CTK 18 decimal, AUSD 6 decimal, fark 12.

Kontrat fiyatı ham birim cinsinden tutuyor: "1 ham AUSD kaç ham CTK eder". 1 AUSD = 10^6 ham birim, 1 CTK = 10^18 ham birim. Oran 10^12. Ekonomik olarak fiyat 1'e 1.

Kontratta bunu okunur halde veren `getPriceNormalized()` fonksiyonu var, o `1.0` döndürür.

**Buradaki asıl tehlike şu:** miktarı yanlış tokenin decimal'iyle ölçeklersen 10^12 kat sapma yaparsın. `1000 * 10^18` ile `1000 * 10^6` arasında bin milyar kat fark var. Testnet'te ders olur, mainnet'te felaket.

Kural: `parseUnits` ve `formatUnits` kullan, elle çarpma yapma. Ve decimal'i her zaman ilgili tokenin kendisinden oku.

### 4. Token sırasını asla varsayma

Pair'in `name()` fonksiyonu `"CTK/AUSD"` döndürüyor. İlk sembol token0, ikincisi token1.

AUSD bu protokolün ana varlığı, doğal olarak token0 olmasını beklersin. Değil. Sıra ekonomik önemle değil, adres sıralamasıyla belirleniyor.

`swapPath` her zaman `[girdiToken, çıktıToken]` olmalı ve tam 2 adres içermeli, yoksa `InvalidPath()` alırsın.

Bu yüzden scriptte adresleri sabit yazmak yerine `name()`, `token0()` ve `token1()` fonksiyonlarından okuyup yönü kendimiz kuruyoruz. Kod biraz uzuyor ama yanlış yöne swap atma ihtimalin sıfırlanıyor.

Bir de şu var: `hasRole` gibi kontrol fonksiyonlarını çağırırken `await` yazmayı unutma. Unutursan fonksiyon bir `Promise` döndürür, `Promise` her zaman truthy'dir, ve `if (!kontrol)` bloğun **hiçbir zaman** çalışmaz. Kontrolün var sanırsın, aslında yoktur. Bu hatayı yakalaması zor çünkü kod sorunsuz çalışıyor gibi görünür.

---

## Yaygın hatalar

| Hata | Sebep |
|---|---|
| `AddressIsNotRole("APPROVED_SWAPPER")` | Whitelist adımını atladın |
| `InsufficientOutputAmount()` | Fiyat oynadı, slippage payını artır |
| `InvalidPath()` / `InvalidPathLength()` | swapPath tam 2 adres ve pair'in tokenları olmalı |
| `InsufficientLiquidity()` | Havuzda yeterli rezerv yok, miktarı düşür |
| `Expired()` | Deadline geçti, süreyi uzat |
| `PairIsPaused()` | Pair duraklatılmış, yapacak bir şey yok |

## Bundan sonra

Birkaç fikir:

**Ters yönde swap dene.** Scriptte `path` kurulumunu değiştirip CTK'dan AUSD'ye git. Faucet'ten zaten CTK çekmiştin.

**Fixed-output swap yaz.** `swapTokensForExactTokens` ile "tam 100 CTK almak istiyorum, kaç AUSD gerekirse" mantığını kur. `getAmountsOut` yerine `getAmountsIn` kullanacaksın.

**Başka bir ağa geç.** Factory, Pair ve Whitelister adresleri tüm testnetlerde aynı, çünkü CREATE3 ile deterministik deploy edilmişler. `client.ts` içindeki `sepolia`'yı `avalancheFuji` ile değiştirmen yeterli. Kodun geri kalanı aynen çalışır.

**Faucet'i otomatikleştir.** Cooldown süresini okuyup bekleyen bir script yaz.

AUSD şu an 16'dan fazla zincirde ve hepsinde aynı adrese sahip: `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a`. Solana, Sui ve Injective üzerinde de var.

## Kaynaklar

- [Agora Stable Swaps dokümantasyonu](https://docs.agora.finance/stable-swaps)
- [Pair kontrat referansı](https://docs.agora.finance/stable-swaps/smart-contracts/pair-contract)
- [Kontrat adresleri (mainnet + testnet)](https://docs.agora.finance/developer/contract-deployments)
- [viem dokümantasyonu](https://viem.sh)

Dokümantasyonun `/llms.txt` endpoint'i var, herhangi bir sayfanın sonuna `.md` ekleyerek markdown halini alabiliyorsun. AI araçlarıyla çalışıyorsan işini kolaylaştırır.

---

*Bu yazıdaki tüm işlemler Ethereum Sepolia test ağında gerçekleştirildi. Testnet varlıklarının parasal değeri yoktur. Mainnet'te işlem yapmadan önce kodunu iyice test et ve private key'ini asla paylaşma.*
