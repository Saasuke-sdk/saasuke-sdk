import { Account, CallData, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { getCompiledCode } from "./utils";
import * as process from "process";

dotenv.config();

async function main() {
  const args = process.argv.slice(2);

  let constructorValue: string | null = null;
  if (args.length > 0) {
    constructorValue = args[1];
    console.log("Forwarded Argument (constructor value):", constructorValue);
  } else {
    console.error("No valid constructor value was provided. Exiting.");
    process.exit(1);
  }

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

  const account0 = new Account(provider, deployerAddress, deployerPrivateKey);
  console.log("Account connected.\n");

  let sierraCode, casmCode;

  try {
    ({ sierraCode, casmCode } = await getCompiledCode(`game_{{Caironame}}`));
  } catch (error: any) {
    console.log("Failed to read contract files:", error);
    process.exit(1);
  }

  const deployResponse = await account0.declareAndDeploy({
    contract: sierraCode,
    casm: casmCode,
    salt: stark.randomAddress(),
    constructorCalldata: CallData.compile([constructorValue]),
  });

  const contractAddress = deployResponse.deploy.contract_address;
  console.log(`✅ Contract has been deployed with the address: ${contractAddress}`);
  console.log(`🔗 View the contract on Sepolia Voyager: https://sepolia.voyager.online/contract/${contractAddress}`);


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