const hre = require("hardhat");

async function main() {
  const Token = await hre.ethers.getContractFactory("MySTOToken");
  const token = await Token.deploy(1000000);
  console.log("Deployed to:", token.target); // Hardhat v3 기준 (.target)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
