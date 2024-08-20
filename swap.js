import { ethers } from "ethers";
import FACTORY_ABI from "./abis/factory.json" assert { type: "json" };
import SWAP_ROUTER_ABI from "./abis/swaprouter.json" assert { type: "json" };
import POOL_ABI from "./abis/pool.json" assert { type: "json" };
import TOKEN_IN_ABI from "./abis/token.json" assert { type: "json" };
import AAVE_ABI from "./abis/aave.json" assert { type: "json" };

import dotenv from "dotenv";
dotenv.config();

const POOL_FACTORY_CONTRACT_ADDRESS =
  "0x0227628f3F023bb0B980b67D528571c95c6DaC1c";
const SWAP_ROUTER_CONTRACT_ADDRESS =
  "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E";
const AAVE_LENDING_POOL_ADDRESS = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951"; // Replace with the actual Aave lending pool address

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const factoryContract = new ethers.Contract(
  POOL_FACTORY_CONTRACT_ADDRESS,
  FACTORY_ABI,
  provider
);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const USDC = {
  chainId: 11155111,
  address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  decimals: 6,
  symbol: "USDC",
  name: "USD//C",
  isToken: true,
  isNative: true,
  wrapped: false,
};

const LINK = {
  chainId: 11155111,
  address: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
  decimals: 18,
  symbol: "LINK",
  name: "Chainlink",
  isToken: true,
  isNative: true,
  wrapped: false,
};

const DAI = {
  chainId: 11155111,
  address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  decimals: 18,
  symbol: "DAI",
  name: "Dai Stablecoin",
  isToken: true,
  isNative: true,
  wrapped: false,
};

// Function A: Approve Token
async function approveToken(tokenAddress, tokenABI, amount, wallet, spender, decimals) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);
    const approveAmount = ethers.parseUnits(amount.toString(), decimals);
    const approveTransaction = await tokenContract.approve.populateTransaction(
      spender,
      approveAmount
    );
    const transactionResponse = await wallet.sendTransaction(
      approveTransaction
    );
    console.log(`-------------------------------`);
    console.log(`Sending Approval Transaction...`);
    console.log(`-------------------------------`);
    console.log(`Transaction Sent: ${transactionResponse.hash}`);
    console.log(`-------------------------------`);
    const receipt = await transactionResponse.wait();
    console.log(
      `Approval Transaction Confirmed! https://sepolia.etherscan.io/txn/${receipt.hash}`
    );
  } catch (error) {
    console.error("An error occurred during token approval:", error);
    throw new Error("Token approval failed");
  }
}

// Function B: Get Pool Info
async function getPoolInfo(factoryContract, tokenIn, tokenOut) {
  const poolAddress = await factoryContract.getPool(
    tokenIn.address,
    tokenOut.address,
    3000
  );
  console.log(poolAddress);
  if (!poolAddress) {
    throw new Error("Failed to get pool address");
  }
  const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ]);
  return { poolContract, token0, token1, fee };
}

// Function C: Prepare Swap Params
async function prepareSwapParams(poolContract, signer, amountIn) {
  return {
    tokenIn: USDC.address,
    tokenOut: LINK.address,
    fee: await poolContract.fee(),
    recipient: signer.address,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };
}

// Function D: Execute Swap
async function executeSwap(swapRouter, params, signer) {
  const transaction = await swapRouter.exactInputSingle.populateTransaction(
    params
  );

  const receipt = await signer.sendTransaction(transaction);
  console.log(`-------------------------------`);
  console.log(`Receipt: https://sepolia.etherscan.io/tx/${receipt.hash}`);
  console.log(`-------------------------------`);

  // Wait for the transaction to be mined
  const txReceipt = await receipt.wait();
  console.log(txReceipt.logs);

  // Decode the logs to get the amount of LINK received
  const iface = new ethers.Interface(SWAP_ROUTER_ABI);
  const logs = txReceipt.logs.map(log => iface.parseLog(log));
  console.log(logs)
  //const amountOut = logs.find(log => log.name === 'Swap').args.amount1;

  console.log(`Amount of LINK received: ${ethers.formatUnits(amountOut, LINK.decimals)}`);
  return amountOut;
}

async function supplyLinkToAave(amountOut) {
  try {
    const lendingPool = new ethers.Contract(
      AAVE_LENDING_POOL_ADDRESS,
      AAVE_ABI,
      signer
    );

    const linkAmount = ethers.formatUnits(amountOut, LINK.decimals);
    
    // Approve LINK for Aave
    await approveToken(LINK.address, TOKEN_IN_ABI, linkAmount, signer, AAVE_LENDING_POOL_ADDRESS);

    // Deposit LINK to Aave
    const tx = await lendingPool.deposit(
      LINK.address,
      amountOut,
      signer.address,
      0 // Referral code
    );

    console.log(`Supplying ${linkAmount} LINK to Aave...`);
    const receipt = await tx.wait();
    console.log(`Supply confirmed: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("An error occurred during the supply to Aave:", error);
    throw new Error("Supply to Aave failed");
  }
}

async function borrowDaiFromAave(linkAmount) {
  try {
    const lendingPool = new ethers.Contract(
      AAVE_LENDING_POOL_ADDRESS,
      AAVE_ABI,
      signer
    );

    // Define the amount to borrow based on LINK collateral (e.g., 50% of LINK value)
    const amountToBorrow = linkAmount.div(2); // Adjust according to your risk preference
    const amountToBorrowInDAI = ethers.formatUnits(amountToBorrow, 18);

    const tx = await lendingPool.borrow(
      DAI_ADDRESS,
      amountToBorrow,
      1, // Stable interest rate mode
      0, // Referral code
      signer.address
    );

    console.log(`Borrowing ${amountToBorrowInDAI} DAI from Aave...`);
    const receipt = await tx.wait();
    console.log(`Borrow confirmed: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("An error occurred during the borrow from Aave:", error);
    throw new Error("Borrow from Aave failed");
  }
}

// Function E: Deposit ETH on Aave and Borrow DAI
async function depositETHAndBorrowDAI(ethAmount, daiAmount) {
  console.log(`Depositing ETH on Aave and borrowing DAI`);
  const aaveLendingPoolContract = new ethers.Contract(
    AAVE_LENDING_POOL_ADDRESS,
    AAVE_ABI,
    signer
  );

  // Approve ETH for deposit
  await approveToken(USDC.address, TOKEN_IN_ABI, ethAmount, signer, AAVE_LENDING_POOL_ADDRESS);

  // Deposit ETH into Aave
  await aaveLendingPoolContract.supply(USDC.address, ethAmount, signer.address, 0);

  // Borrow DAI against the ETH collateral
  await aaveLendingPoolContract.borrow(DAI.address, daiAmount, 2, 0, signer.address); // 2 is the interest rate mode (stable)
}

// Main Function
async function main(swapAmount) {
  const inputAmount = swapAmount;
  const amountIn = ethers.parseUnits(inputAmount.toString(), USDC.decimals);

  try {
    await approveToken(USDC.address, TOKEN_IN_ABI, inputAmount, signer, SWAP_ROUTER_CONTRACT_ADDRESS);
    const { poolContract } = await getPoolInfo(factoryContract, USDC, LINK);
    const params = await prepareSwapParams(poolContract, signer, amountIn);
    const swapRouter = new ethers.Contract(
      SWAP_ROUTER_CONTRACT_ADDRESS,
      SWAP_ROUTER_ABI,
      signer
    );
    
    // Execute the swap and get the amount of LINK received
    const amountOut = await executeSwap(swapRouter, params, signer);
    
    // Supply LINK to Aave
    await supplyLinkToAave(amountOut);

    // Borrow DAI from Aave using LINK as collateral
    await borrowDaiFromAave(amountOut);

  } catch (error) {
    console.error("An error occurred:", error.message);
  }
}


// Enter Swap Amount
main(1); // Example: swap 1 USDC
