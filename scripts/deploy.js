const hre = require("hardhat");

async function main() {
  // 테스트용 시간 설정 (충분한 청약 기간)
  const now = Math.floor(Date.now() / 1000);
  const subscriptionStartTime = now - 100; // 100초 전부터 시작 (이미 시작됨)
  const subscriptionEndTime = now + 300;   // 300초 후에 종료 (5분 후)
  const paymentDueTime = now + 10000;      // 10000초 후 (약 2.8시간 후)
  const allocationAnnouncementTime = now + 20000; // 20000초 후 (약 5.6시간 후)

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
