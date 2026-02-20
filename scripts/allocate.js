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
  
  const INVESTOR_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  console.log("🔧 배정 처리 시작...");
  console.log("📍 컨트랙트 주소:", CONTRACT_ADDRESS);
  console.log("👤 투자자 주소:", INVESTOR_ADDRESS);

  // 컨트랙트 인스턴스 생성
  const UniTowerSTO = await hre.ethers.getContractFactory("UniTowerSTO");
  const contract = UniTowerSTO.attach(CONTRACT_ADDRESS);

  try {
    // 투자자 정보 확인
    const investorInfo = await contract.getInvestorInfo(INVESTOR_ADDRESS);
    console.log("📊 현재 투자자 정보:");
    console.log("  - 청약 구좌:", investorInfo[0].toString());
    console.log("  - 배정 구좌:", investorInfo[1].toString());
    console.log("  - 납입 상태:", investorInfo[2]);
    console.log("  - 검증 상태:", investorInfo[3]);

    // 배정 처리 (관리자만 가능)
    console.log("✅ 배정 처리 중...");
    const tx = await contract.allocateTokens(INVESTOR_ADDRESS, 5); // 5구좌 배정
    await tx.wait();
    
    console.log("✅ 배정 완료!");
    console.log("📝 트랜잭션 해시:", tx.hash);

    // 배정 후 투자자 정보 확인
    const updatedInfo = await contract.getInvestorInfo(INVESTOR_ADDRESS);
    console.log("📊 배정 후 투자자 정보:");
    console.log("  - 청약 구좌:", updatedInfo[0].toString());
    console.log("  - 배정 구좌:", updatedInfo[1].toString());
    console.log("  - 투표권:", updatedInfo[4].toString());

  } catch (error) {
    console.error("❌ 배정 처리 실패:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ 스크립트 실행 실패:", error);
  process.exitCode = 1;
}); 