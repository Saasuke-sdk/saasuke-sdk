import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";  // Import path module
import { getCompiledCode } from "./utils";

dotenv.config();

async function main() {
  const rpcEndpoint = process.env.RPC_ENDPOINT;
  const deployerAddress = process.env.DEPLOYER_ADDRESS;
  const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!rpcEndpoint || !deployerAddress || !deployerPrivateKey) {
    console.error("Missing required environment variables.");
    process.exit(1);
  }

  const provider = new RpcProvider({
    nodeUrl: rpcEndpoint,
  });

  console.log("ACCOUNT_ADDRESS=", deployerAddress);
  console.log("ACCOUNT_PRIVATE_KEY=", deployerPrivateKey);

  const account0 = new Account(provider, deployerAddress, deployerPrivateKey);
  console.log("Account connected.\n");

  let sierraCode, casmCode;

  try {
    ({ sierraCode, casmCode } = await getCompiledCode("contract_Counter"));
  } catch (error: any) {
    console.log("Failed to read contract files:", error);
    process.exit(1);
  }

  const initialCounter = 100;
  const initialOwner = deployerAddress;

  if (typeof initialCounter !== 'number') {
    console.error("initial_counter should be a number");
    process.exit(1);
  }

  if (typeof initialOwner !== 'string' || !initialOwner) {
    console.error("initial_owner should be a valid non-empty string");
    process.exit(1);
  }

  const myCallData = new CallData(sierraCode.abi);

  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    salt: stark.randomAddress(),
  });

  const contractAddress = deployResponse.deploy.contract_address;
  console.log(`✅ Contract has been deployed with the address: ${contractAddress}`);

  // Log the absolute file path
  const filePath = path.resolve(__dirname, "../../client/global/constant.js");
  console.log(`Attempting to write contract address to: ${filePath}`);

  const fileContent = `export const contractAddress = "${contractAddress}";\n`;

  try {
    fs.writeFileSync(filePath, fileContent, "utf8");
    console.log(`✅ Contract address saved to ${filePath}`);
  } catch (error) {
    console.error("Failed to write contract address to file:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
