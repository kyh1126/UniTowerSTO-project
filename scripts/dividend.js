const hre = require("hardhat");

async function main() {
  // 환경변수에서 컨트랙트 주소 가져오기
  const fs = require('fs');
  let CONTRACT_ADDRESS;

  try {
    const envContent = fs.readFileSync('./frontend/.env', 'utf8');
    const match = envContent.match(/VITE_CONTRACT_ADDRESS=([^\n]+)/);
    CONTRACT_ADDRESS = match ? match[1] : "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  } catch (error) {
    CONTRACT_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";
  }

  console.log("💰 배당 등록 시작...");
  console.log("📍 컨트랙트 주소:", CONTRACT_ADDRESS);

  // 컨트랙트 인스턴스 생성
  const UniTowerSTO = await hre.ethers.getContractFactory("UniTowerSTO");
  const contract = UniTowerSTO.attach(CONTRACT_ADDRESS);

  try {
    // 배당 등록 (1분기, 총 1 ETH 배당)
    const quarter = 1;
    const dividendAmount = hre.ethers.parseEther("1");

    console.log("📊 배당 정보:");
    console.log("  - 분기:", quarter + "분기");
    console.log("  - 총 배당금:", hre.ethers.formatEther(dividendAmount), "ETH");

    const tx = await contract.registerDividend(quarter, dividendAmount, { value: dividendAmount });
    await tx.wait();

    console.log("✅ 배당 등록 완료!");
    console.log("📝 트랜잭션 해시:", tx.hash);

    // 배당 정보 확인
    const dividendInfo = await contract.getDividendInfo(1);
    console.log("📊 등록된 배당 정보:");
    console.log("  - 분기:", Number(dividendInfo[0]));
    console.log("  - 총 배당금:", hre.ethers.formatEther(dividendInfo[1]), "ETH");
    console.log("  - 분배 상태:", dividendInfo[4] ? "분배됨" : "미분배");

  } catch (error) {
    console.error("❌ 배당 등록 실패:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ 스크립트 실행 실패:", error);
  process.exitCode = 1;
});
