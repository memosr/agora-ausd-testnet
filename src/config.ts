/**
 * Agora Stable Swaps - Ethereum Sepolia addresses and ABIs.
 * Source: https://docs.agora.finance/stable-swaps/guides/executing-swap
 */

// ---------------------------------------------------------------------------
// Addresses (Ethereum Sepolia)
// ---------------------------------------------------------------------------
export const ADDRESSES = {
  factory: "0x8468587Af422ad440F58a57E955eCA6A970b5375",
  pair: "0x1Aa8958Aa34cEC8096EF4381cb335effe977b0ae", // CTK / AUSD
  whitelister: "0x7c10F56d6f04a51376393a1C3670e966863F6BD5",
  ausd: "0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC", // 6 decimals
  ctk: "0x7BEb5D9DB0d85cBEa543C04f0dE8c23c2176cd9D", // 18 decimals
  ausdFaucet: "0xd236c18D274E54FAccC3dd9DDA4b27965a73ee6C",
  ctkFaucet: "0xf8A143b3406faF59FD9A34891076104B10200B1D",
} as const satisfies Record<string, `0x${string}`>;

export const APPROVED_SWAPPER = "APPROVED_SWAPPER";

// ---------------------------------------------------------------------------
// ABIs (only the functions these scripts use)
// ---------------------------------------------------------------------------
export const stableSwapAbi = [
  {
    type: "function",
    name: "hasRole",
    inputs: [
      { name: "_role", type: "string" },
      { name: "_address", type: "address" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "token0", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token1", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "token0Decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "token1Decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "reserve0", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "reserve1", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getPrice", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getPriceNormalized", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "token0PurchaseFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "token1PurchaseFee", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "getAmountsOut",
    inputs: [
      { name: "_amountIn", type: "uint256" },
      { name: "_path", type: "address[]" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAmountsIn",
    inputs: [
      { name: "_amountOut", type: "uint256" },
      { name: "_path", type: "address[]" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    inputs: [
      { name: "_amountIn", type: "uint256" },
      { name: "_amountOutMin", type: "uint256" },
      { name: "_path", type: "address[]" },
      { name: "_to", type: "address" },
      { name: "_deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "swapTokensForExactTokens",
    inputs: [
      { name: "_amountOut", type: "uint256" },
      { name: "_amountInMax", type: "uint256" },
      { name: "_path", type: "address[]" },
      { name: "_to", type: "address" },
      { name: "_deadline", type: "uint256" },
    ],
    outputs: [{ type: "uint256[]" }],
    stateMutability: "nonpayable",
  },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
] as const;

export const faucetAbi = [
  {
    type: "function",
    name: "requestFunds",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const whitelisterAbi = [
  {
    type: "function",
    name: "setApprovedSwapper",
    inputs: [{ name: "swapper", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;
