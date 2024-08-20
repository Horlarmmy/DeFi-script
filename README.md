# Advance DeFi Script

## Overview of Script
This script performs a series of DeFi operations on the Ethereum Sepolia testnet. It leverages multiple protocols to execute token swaps, lending, and borrowing functions. Below is a detailed description of what the script does:

- **Token Swap using Uniswap V3**: The script initiates a swap from USDC to LINK via the Uniswap V3 protocol. It retrieves the necessary pool information for the USDC-LINK pair, approves the USDC tokens, and then performs the swap.
- **Supply LINK to Aave**: After receiving LINK from the swap, the script supplies the LINK tokens to Aave, a decentralized lending protocol. This step involves approving LINK for Aave and then executing the supply function on Aave’s Lending Pool contract.
- **Borrow DAI from Aave**:
Using the supplied LINK as collateral, the script borrows DAI from Aave. The amount borrowed is 50% of the initial USDC swap amount, making sure the user’s collateral remains safe.


## Diagram Illustration


## Code Explanation
The code is divided into several key functions, each handling a specific aspect of the process.

1. `approveToken(tokenAddress, tokenABI, amount, wallet, spender, decimals)`:
This function approves a specified amount of tokens for a particular spender (contract) on behalf of the user.
It ensures that the tokens can be used by the contract (e.g., Uniswap or Aave) for subsequent operations.

    Input Parameters:
    - tokenAddress: Address of the token to be approved.
    - tokenABI: ABI of the token contract.
    - amount: The amount of tokens to be approved.
    - wallet: The wallet of the user.
    - spender: The contract address that will spend the tokens.
    - decimals: Number of decimals of the token.
2. `getPoolInfo(factoryContract, tokenIn, tokenOut)`:
Retrieves information about the pool corresponding to the token pair (USDC and LINK) from the Uniswap V3 factory contract.
The function returns the pool contract along with the tokens and fee structure.
3. `prepareSwapParams(poolContract, signer, amountIn)`:
Prepares the parameters needed for executing the swap on Uniswap V3.
These parameters include the token addresses, fee, recipient, and the amount of tokens to be swapped.
4. `executeSwap(swapRouter, params, signer)`:
    - This function handles the actual token swap using Uniswap's exactInputSingle function.
    - It computes the amount of LINK received from the swap by comparing the user’s LINK balance before and after the swap.
    - Returns: The amount of LINK received.
5. `getLinkTokenBalance(tokenAddress, wallet)`:
    - Fetches the balance of LINK tokens in the user's wallet.
    - The function formats the balance according to the token's decimal places for accurate representation.
6. `supplyLinkToAave(amountOut)`:
    - This function supplies the received LINK tokens to Aave’s Lending Pool as collateral.
    - It first ensures the LINK tokens are approved for use by Aave and then executes the supply function on Aave’s Lending Pool contract.
7. `borrowDaiFromAave(usdcAmount)`:
    - This function borrows DAI from Aave using the supplied LINK as collateral.
    - The borrowing amount is set to 50% of the initial USDC amount, ensuring a conservative collateralization ratio.
8. `main(swapAmount)`: The main function orchestrates the entire process flow.
    - It starts with approving USDC, executes the swap, supplies LINK to Aave, and finally borrows DAI.
    - The swapAmount parameter defines the amount of USDC to be swapped in the process.

## Project Setup ⚙️

1. Clone the repository
    ```bash
    git clone https://github.com/clement-stackup/token_swap.git
    ```

2. Navigate to the project directory:
    ```bash
    cd token_swap
    ```

3. Install the necessary dependencies & libraries
    ```bash
    npm install --save
    ```
4. Run the script
    ```bash
    node script.js
    ```

## Example Output

## Conclusion
This script demonstrates how to interact with multiple DeFi protocols in a single workflow, from token swaps to lending and borrowing. By modularizing the functions and following best practices for approval management and error handling, the script offers a robust foundation for more advanced DeFi operations.
