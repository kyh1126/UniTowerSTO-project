const hre = require("hardhat");

async function main() {
  // STO 기획서에 따른 시간 설정
  // 청약기일: 2025년 8월 1일 ~ 2025년 8월 10일
  // 납입기일: 2025년 8월 12일
  // 배정공고일: 2025년 8월 13일
  
  // Unix timestamp로 변환 (2025년 기준)
  const subscriptionStartTime = Math.floor(new Date('2025-08-01T00:00:00Z').getTime() / 1000);
  const subscriptionEndTime = Math.floor(new Date('2025-08-10T23:59:59Z').getTime() / 1000);
  const paymentDueTime = Math.floor(new Date('2025-08-12T23:59:59Z').getTime() / 1000);
  const allocationAnnouncementTime = Math.floor(new Date('2025-08-13T00:00:00Z').getTime() / 1000);

  console.log("🚀 UniTower STO 배포 시작...");
  console.log("📅 청약 시작일:", new Date(subscriptionStartTime * 1000).toISOString());
  console.log("📅 청약 종료일:", new Date(subscriptionEndTime * 1000).toISOString());
  console.log("📅 납입 마감일:", new Date(paymentDueTime * 1000).toISOString());
  console.log("📅 배정 공고일:", new Date(allocationAnnouncementTime * 1000).toISOString());

  const UniTowerSTO = await hre.ethers.getContractFactory("UniTowerSTO");
  const sto = await UniTowerSTO.deploy(
    subscriptionStartTime,
    subscriptionEndTime,
    paymentDueTime,
    allocationAnnouncementTime
  );

  await sto.waitForDeployment();
  
  console.log("✅ UniTower STO 배포 완료!");
  console.log("📍 컨트랙트 주소:", sto.target);
  console.log("🏢 프로젝트명: UniTower STO");
  console.log("💰 총 모집가액: 3,000,000,000원");
  console.log("📊 총 주식수: 3,000주");
  console.log("💵 단위당 가격: 1,000,000원");
  console.log("👥 1인당 최대 청약: 50구좌");
}

main().catch((error) => {
  console.error("❌ 배포 실패:", error);
  process.exitCode = 1;
});
