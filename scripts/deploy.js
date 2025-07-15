const hre = require("hardhat");

async function main() {
  // 테스트용 시간 설정 (현재 시간 기준)
  const now = Math.floor(Date.now() / 1000);
  const subscriptionStartTime = now; // 지금부터 시작
  const subscriptionEndTime = now + (10 * 24 * 60 * 60); // 10일 후
  const paymentDueTime = now + (12 * 24 * 60 * 60); // 12일 후
  const allocationAnnouncementTime = now + (13 * 24 * 60 * 60); // 13일 후

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
