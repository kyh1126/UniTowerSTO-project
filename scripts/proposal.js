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

  console.log("🗳️  DAO 투표 제안 등록 시작...");
  console.log("📍 컨트랙트 주소:", CONTRACT_ADDRESS);

  // 컨트랙트 인스턴스 생성
  const UniTowerSTO = await hre.ethers.getContractFactory("UniTowerSTO");
  const contract = UniTowerSTO.attach(CONTRACT_ADDRESS);

  try {
    const description = "건물 1층 카페 임대 계약 승인";
    const duration = 86400; // 1일 (최소 제안 기간)

    console.log("📊 제안 정보:");
    console.log("  - 내용:", description);
    console.log("  - 투표 기간:", duration / 3600, "시간");

    const tx = await contract.createProposal(description, duration);
    await tx.wait();

    console.log("✅ 제안 등록 완료!");
    console.log("📝 트랜잭션 해시:", tx.hash);

    // 제안 정보 확인
    const proposalInfo = await contract.getProposalInfo(1);
    console.log("📊 등록된 제안 정보:");
    console.log("  - 설명:", proposalInfo[0]);
    console.log("  - 찬성:", Number(proposalInfo[1]));
    console.log("  - 반대:", Number(proposalInfo[2]));

  } catch (error) {
    console.error("❌ 제안 등록 실패:", error.message);
  }
}

main().catch((error) => {
  console.error("❌ 스크립트 실행 실패:", error);
  process.exitCode = 1;
});
