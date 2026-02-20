import { expect } from "chai";
import { ethers } from "hardhat";
import { UniTowerSTO } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UniTowerSTO", function () {
  let sto: UniTowerSTO;
  let owner: SignerWithAddress;
  let investor1: SignerWithAddress;
  let investor2: SignerWithAddress;
  let investor3: SignerWithAddress;
  let emergencyOperator: SignerWithAddress;

  // 테스트용 시간 설정
  let now: number;
  let subscriptionStartTime: number;
  let subscriptionEndTime: number;
  let paymentDueTime: number;
  let allocationAnnouncementTime: number;

  // 시간 관리 유틸리티 함수들
  const timeTravel = async (seconds: number) => {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine", []);
  };

  const setTime = async (timestamp: number) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine", []);
  };

  const getCurrentTime = async () => {
    const block = await ethers.provider.getBlock("latest");
    return block!.timestamp;
  };

  // 더 안정적인 시간 기반 테스트 패턴
  const advanceToSubscriptionPeriod = async () => {
    const currentTime = await getCurrentTime();
    if (currentTime < subscriptionStartTime) {
      await timeTravel(subscriptionStartTime - currentTime + 10);
    }
  };

  const advanceToAllocationPeriod = async () => {
    const currentTime = await getCurrentTime();
    if (currentTime < subscriptionEndTime) {
      await timeTravel(subscriptionEndTime - currentTime + 10);
    }
  };

  const advanceToPaymentPeriod = async () => {
    const currentTime = await getCurrentTime();
    if (currentTime < paymentDueTime) {
      await timeTravel(paymentDueTime - currentTime + 10);
    }
  };

  beforeEach(async function () {
    [owner, investor1, investor2, investor3, emergencyOperator] = await ethers.getSigners();

    // 각 테스트마다 새로운 시간 설정 - 더 안정적인 방법
    now = await getCurrentTime();
    subscriptionStartTime = now + 100; // 100초 후 시작
    subscriptionEndTime = now + 200;   // 200초 후 종료
    paymentDueTime = now + 300;        // 300초 후 납입 마감
    allocationAnnouncementTime = now + 400; // 400초 후 배정 공고

    const UniTowerSTOFactory = await ethers.getContractFactory("UniTowerSTO");
    sto = await UniTowerSTOFactory.deploy(
      subscriptionStartTime,
      subscriptionEndTime,
      paymentDueTime,
      allocationAnnouncementTime
    );
  });

  // 각 테스트 후 상태 초기화 (선택적)
  afterEach(async function () {
    // 필요시에만 사용 - 테스트 간 격리가 필요한 경우
    // await ethers.provider.send("hardhat_reset", []);
  });

  describe("초기화", function () {
    it("올바른 초기값으로 배포되어야 함", async function () {
      expect(await sto.PROJECT_NAME()).to.equal("UniTower STO");
      expect(await sto.PROJECT_SYMBOL()).to.equal("UNITOWER");
      expect(await sto.TOTAL_SUPPLY()).to.equal(3000);
      expect(await sto.TOKEN_PRICE()).to.equal(ethers.parseEther("1")); // 1 ETH per 구좌
      expect(await sto.MAX_SUBSCRIPTION_PER_PERSON()).to.equal(50);
      expect(await sto.MIN_SUBSCRIPTION()).to.equal(1);
    });

    it("시간 설정이 올바르게 되어야 함", async function () {
      expect(await sto.subscriptionStartTime()).to.equal(subscriptionStartTime);
      expect(await sto.subscriptionEndTime()).to.equal(subscriptionEndTime);
      expect(await sto.paymentDueTime()).to.equal(paymentDueTime);
      expect(await sto.allocationAnnouncementTime()).to.equal(allocationAnnouncementTime);
    });

    it("owner와 emergencyOperator가 올바르게 설정되어야 함", async function () {
      expect(await sto.owner()).to.equal(owner.address);
      expect(await sto.emergencyOperator()).to.equal(owner.address);
    });
  });

  describe("청약 기능", function () {
    beforeEach(async function () {
      // 시간을 청약 기간으로 설정 - 더 안정적인 방법
      await timeTravel(110); // subscriptionStartTime + 10
    });

    it("정상적인 청약이 성공해야 함", async function () {
      await sto.connect(investor1).subscribe(10);
      const investorInfo = await sto.getInvestorInfo(investor1.address);
      expect(investorInfo.subscribedAmount).to.equal(10);
    });

    it("최소 청약량 미만이면 실패해야 함", async function () {
      await expect(sto.connect(investor1).subscribe(0))
        .to.be.revertedWith("Below minimum subscription");
    });

    it("최대 청약량 초과하면 실패해야 함", async function () {
      await expect(sto.connect(investor1).subscribe(51))
        .to.be.revertedWith("Exceeds maximum subscription");
    });

    it("개인 한도 초과하면 실패해야 함", async function () {
      await sto.connect(investor1).subscribe(25);
      await expect(sto.connect(investor1).subscribe(26))
        .to.be.revertedWith("Exceeds personal limit");
    });

    it("청약 기간 외에는 실패해야 함", async function () {
      // 청약 시작 전
      await setTime(subscriptionStartTime - 10);
      await expect(sto.connect(investor1).subscribe(10))
        .to.be.revertedWith("Subscription not started");

      // 청약 종료 후
      await setTime(subscriptionEndTime + 10);
      await expect(sto.connect(investor1).subscribe(10))
        .to.be.revertedWith("Subscription ended");
    });
  });

  describe("배정 기능", function () {
    beforeEach(async function () {
      // 청약 기간에 청약
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(20);
      await sto.connect(investor2).subscribe(15);
      
      // 청약 기간 종료 후
      await timeTravel(100); // subscriptionEndTime + 10
    });

    it("owner만 배정할 수 있어야 함", async function () {
      await expect(sto.connect(investor1).allocateTokens(investor1.address, 10))
        .to.be.revertedWithCustomError(sto, "OwnableUnauthorizedAccount");
    });

    it("청약 기간 종료 후에만 배정 가능해야 함", async function () {
      await setTime(subscriptionEndTime - 10);
      await expect(sto.connect(owner).allocateTokens(investor1.address, 10))
        .to.be.revertedWith("Subscription period not ended");
    });

    it("청약량을 초과한 배정은 실패해야 함", async function () {
      await expect(sto.connect(owner).allocateTokens(investor1.address, 25))
        .to.be.revertedWith("Invalid allocation amount");
    });

    it("정상적인 배정이 성공해야 함", async function () {
      await sto.connect(owner).allocateTokens(investor1.address, 15);
      const investorInfo = await sto.getInvestorInfo(investor1.address);
      expect(investorInfo.allocatedAmount).to.equal(15);
      expect(investorInfo.votingPower).to.equal(15);
    });

    it("0 address로 배정하면 실패해야 함", async function () {
      await expect(sto.connect(owner).allocateTokens(ethers.ZeroAddress, 10))
        .to.be.revertedWith("Invalid address");
    });

    it("0 또는 음수 배정량은 실패해야 함", async function () {
      await expect(sto.connect(owner).allocateTokens(investor1.address, 0))
        .to.be.revertedWith("Allocation amount must be positive");
    });
  });

  describe("납입 기능", function () {
    beforeEach(async function () {
      // 청약 및 배정
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
    });

    it("정상적인 납입이 성공해야 함", async function () {
      const requiredPayment = 10n * BigInt(await sto.TOKEN_PRICE());
      await sto.connect(investor1).paySubscription({ value: requiredPayment });
      
      const investorInfo = await sto.getInvestorInfo(investor1.address);
      expect(investorInfo.hasPaid).to.be.true;
    });

    it("배정받지 않은 투자자는 납입할 수 없어야 함", async function () {
      const requiredPayment = 10n * BigInt(await sto.TOKEN_PRICE());
      await expect(sto.connect(investor2).paySubscription({ value: requiredPayment }))
        .to.be.revertedWith("No allocation");
    });

    it("이미 납입한 투자자는 재납입할 수 없어야 함", async function () {
      const requiredPayment = 10n * BigInt(await sto.TOKEN_PRICE());
      await sto.connect(investor1).paySubscription({ value: requiredPayment });
      
      await expect(sto.connect(investor1).paySubscription({ value: requiredPayment }))
        .to.be.revertedWith("Already paid");
    });

    it("납입 기간이 지나면 납입할 수 없어야 함", async function () {
      await timeTravel(110); // paymentDueTime + 10
      const requiredPayment = 10n * BigInt(await sto.TOKEN_PRICE());
      
      await expect(sto.connect(investor1).paySubscription({ value: requiredPayment }))
        .to.be.revertedWith("Payment period ended");
    });

    it("부족한 금액으로 납입하면 실패해야 함", async function () {
      const requiredPayment = 10n * BigInt(await sto.TOKEN_PRICE());
      const insufficientPayment = requiredPayment - BigInt(100000);
      
      await expect(sto.connect(investor1).paySubscription({ value: insufficientPayment }))
        .to.be.revertedWith("Insufficient payment");
    });
  });

  describe("배당 기능", function () {
    beforeEach(async function () {
      // 청약, 배정, 납입 완료
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
      await sto.connect(investor1).paySubscription({ value: 10n * BigInt(await sto.TOKEN_PRICE()) });
    });

    it("owner만 배당을 등록할 수 있어야 함", async function () {
      await expect(sto.connect(investor1).registerDividend(1, ethers.parseEther("100"), { value: ethers.parseEther("100") }))
        .to.be.revertedWithCustomError(sto, "OwnableUnauthorizedAccount");
    });

    it("정상적인 배당 등록이 성공해야 함", async function () {
      await sto.connect(owner).registerDividend(1, ethers.parseEther("100"), { value: ethers.parseEther("100") });
      const dividendInfo = await sto.getDividendInfo(1);
      expect(dividendInfo.quarter).to.equal(1);
      expect(dividendInfo.totalAmount).to.equal(ethers.parseEther("100"));
    });

    it("0 또는 음수 배당액은 등록할 수 없어야 함", async function () {
      await expect(sto.connect(owner).registerDividend(1, 0))
        .to.be.revertedWith("Invalid dividend amount");
    });

    it("0 또는 음수 분기는 등록할 수 없어야 함", async function () {
      await expect(sto.connect(owner).registerDividend(0, ethers.parseEther("100"), { value: ethers.parseEther("100") }))
        .to.be.revertedWith("Invalid quarter");
    });

    it("납입하지 않은 투자자는 배당을 수령할 수 없어야 함", async function () {
      await sto.connect(owner).registerDividend(1, ethers.parseEther("100"), { value: ethers.parseEther("100") });
      await expect(sto.connect(investor2).claimDividend(1))
        .to.be.revertedWith("Not a paid investor");
    });

    it("존재하지 않는 배당을 수령하려 하면 실패해야 함", async function () {
      await expect(sto.connect(investor1).claimDividend(999))
        .to.be.revertedWith("Dividend does not exist");
    });
  });

  describe("DAO 기능", function () {
    beforeEach(async function () {
      // 청약, 배정, 납입 완료
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await sto.connect(investor2).subscribe(5);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
      await sto.connect(owner).allocateTokens(investor2.address, 5);
      await sto.connect(investor1).paySubscription({ value: 10n * BigInt(await sto.TOKEN_PRICE()) });
      await sto.connect(investor2).paySubscription({ value: 5n * BigInt(await sto.TOKEN_PRICE()) });
    });

    it("owner만 제안을 생성할 수 있어야 함", async function () {
      await expect(sto.connect(investor1).createProposal("Test proposal", 7 * 24 * 3600))
        .to.be.revertedWithCustomError(sto, "OwnableUnauthorizedAccount");
    });

    it("정상적인 제안 생성이 성공해야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      const proposalInfo = await sto.getProposalInfo(1);
      expect(proposalInfo.description).to.equal("Test proposal");
    });

    it("빈 description으로 제안 생성하면 실패해야 함", async function () {
      await expect(sto.connect(owner).createProposal("", 7 * 24 * 3600))
        .to.be.revertedWith("Description cannot be empty");
    });

    it("너무 긴 description으로 제안 생성하면 실패해야 함", async function () {
      const longDescription = "a".repeat(1001);
      await expect(sto.connect(owner).createProposal(longDescription, 7 * 24 * 3600))
        .to.be.revertedWith("Description too long");
    });

    it("너무 짧은 기간으로 제안 생성하면 실패해야 함", async function () {
      await expect(sto.connect(owner).createProposal("Test", 12 * 3600)) // 12시간
        .to.be.revertedWith("Duration too short");
    });

    it("너무 긴 기간으로 제안 생성하면 실패해야 함", async function () {
      await expect(sto.connect(owner).createProposal("Test", 31 * 24 * 3600)) // 31일
        .to.be.revertedWith("Duration too long");
    });

    it("납입하지 않은 투자자는 투표할 수 없어야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await expect(sto.connect(investor3).vote(1, true))
        .to.be.revertedWith("Not a paid investor");
    });

    it("존재하지 않는 제안에 투표하면 실패해야 함", async function () {
      await expect(sto.connect(investor1).vote(999, true))
        .to.be.revertedWith("Proposal does not exist");
    });

    it("정상적인 투표가 성공해야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await sto.connect(investor1).vote(1, true);
      await sto.connect(investor2).vote(1, false);
      
      const proposalInfo = await sto.getProposalInfo(1);
      expect(proposalInfo.forVotes).to.equal(10);
      expect(proposalInfo.againstVotes).to.equal(5);
    });

    it("중복 투표는 실패해야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await sto.connect(investor1).vote(1, true);
      
      await expect(sto.connect(investor1).vote(1, false))
        .to.be.revertedWith("Already voted");
    });

    it("투표 기간 외에는 투표할 수 없어야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await timeTravel(8 * 24 * 3600); // now + 8일
      await expect(sto.connect(investor1).vote(1, true))
        .to.be.revertedWith("Voting ended");
    });

    it("owner만 제안을 실행할 수 있어야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await sto.connect(investor1).vote(1, true);
      await timeTravel(8 * 24 * 3600); // now + 8일
      
      await expect(sto.connect(investor1).executeProposal(1))
        .to.be.revertedWithCustomError(sto, "OwnableUnauthorizedAccount");
    });

    it("투표가 없는 제안은 실행할 수 없어야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await timeTravel(8 * 24 * 3600); // now + 8일
      
      await expect(sto.connect(owner).executeProposal(1))
        .to.be.revertedWith("No votes cast");
    });

    it("부결된 제안은 실행할 수 없어야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await sto.connect(investor1).vote(1, false);
      await timeTravel(8 * 24 * 3600); // now + 8일
      
      await expect(sto.connect(owner).executeProposal(1))
        .to.be.revertedWith("Proposal not passed");
    });

    it("정상적인 제안 실행이 성공해야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await sto.connect(investor1).vote(1, true);
      await timeTravel(8 * 24 * 3600); // now + 8일
      
      await sto.connect(owner).executeProposal(1);
      const proposalInfo = await sto.getProposalInfo(1);
      expect(proposalInfo.executed).to.be.true;
    });
  });

  describe("비상 정지 기능", function () {
    it("emergencyOperator만 비상정지할 수 있어야 함", async function () {
      await expect(sto.connect(investor1).emergencyPause())
        .to.be.revertedWith("Not emergency operator");
    });

    it("정상적인 비상정지가 성공해야 함", async function () {
      await sto.connect(owner).emergencyPause();
      expect(await sto.emergencyPaused()).to.be.true;
    });

    it("비상정지 상태에서는 함수가 실행되지 않아야 함", async function () {
      await sto.connect(owner).emergencyPause();
      await timeTravel(110); // subscriptionStartTime + 10
      await expect(sto.connect(investor1).subscribe(10))
        .to.be.revertedWith("Contract is paused");
    });

    it("비상정지 해제가 성공해야 함", async function () {
      await sto.connect(owner).emergencyPause();
      await sto.connect(owner).emergencyUnpause();
      expect(await sto.emergencyPaused()).to.be.false;
    });
  });

  describe("수수료 기능", function () {
    beforeEach(async function () {
      // 배당 등록 및 수령
      await sto.connect(owner).registerDividend(1, ethers.parseEther("100"), { value: ethers.parseEther("100") });
      // 배당 수령을 위한 설정 (실제로는 더 복잡한 설정 필요)
    });

    it("owner만 수수료율을 변경할 수 있어야 함", async function () {
      await expect(sto.connect(investor1).setFeeRates(10, 2))
        .to.be.revertedWithCustomError(sto, "OwnableUnauthorizedAccount");
    });

    it("정상적인 수수료율 변경이 성공해야 함", async function () {
      await sto.connect(owner).setFeeRates(10, 2);
      expect(await sto.platformFeeRate()).to.equal(10);
      expect(await sto.daoFeeRate()).to.equal(2);
    });

    it("너무 높은 수수료율은 설정할 수 없어야 함", async function () {
      await expect(sto.connect(owner).setFeeRates(60, 2))
        .to.be.revertedWith("Platform fee too high");
      
      await expect(sto.connect(owner).setFeeRates(10, 15))
        .to.be.revertedWith("DAO fee too high");
    });

    it("총 수수료가 너무 높으면 설정할 수 없어야 함", async function () {
      await expect(sto.connect(owner).setFeeRates(35, 30))
        .to.be.revertedWith("DAO fee too high");
    });
  });

  describe("EmergencyOperator 변경", function () {
    it("owner만 emergencyOperator를 변경할 수 있어야 함", async function () {
      await expect(sto.connect(investor1).setEmergencyOperator(investor2.address))
        .to.be.revertedWithCustomError(sto, "OwnableUnauthorizedAccount");
    });

    it("0 address로 변경하면 실패해야 함", async function () {
      await expect(sto.connect(owner).setEmergencyOperator(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("정상적인 emergencyOperator 변경이 성공해야 함", async function () {
      await sto.connect(owner).setEmergencyOperator(investor1.address);
      expect(await sto.emergencyOperator()).to.equal(investor1.address);
    });

    it("emergencyOperator 변경 시 이벤트가 발생해야 함", async function () {
      await expect(sto.connect(owner).setEmergencyOperator(investor1.address))
        .to.emit(sto, "EmergencyOperatorChanged")
        .withArgs(owner.address, investor1.address);
    });
  });

  describe("조회 기능", function () {
    beforeEach(async function () {
      // 기본 데이터 설정
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
      await sto.connect(owner).registerDividend(1, ethers.parseEther("100"), { value: ethers.parseEther("100") });
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
    });

    it("투자자 정보 조회가 정상적으로 작동해야 함", async function () {
      const investorInfo = await sto.getInvestorInfo(investor1.address);
      expect(investorInfo.subscribedAmount).to.equal(10);
      expect(investorInfo.allocatedAmount).to.equal(10);
    });

    it("0 address로 투자자 정보 조회하면 실패해야 함", async function () {
      await expect(sto.getInvestorInfo(ethers.ZeroAddress))
        .to.be.revertedWith("Invalid address");
    });

    it("제안 정보 조회가 정상적으로 작동해야 함", async function () {
      const proposalInfo = await sto.getProposalInfo(1);
      expect(proposalInfo.description).to.equal("Test proposal");
    });

    it("존재하지 않는 제안 조회하면 실패해야 함", async function () {
      await expect(sto.getProposalInfo(999))
        .to.be.revertedWith("Proposal does not exist");
    });

    it("배당 정보 조회가 정상적으로 작동해야 함", async function () {
      const dividendInfo = await sto.getDividendInfo(1);
      expect(dividendInfo.quarter).to.equal(1);
      expect(dividendInfo.totalAmount).to.equal(ethers.parseEther("100"));
    });

    it("존재하지 않는 배당 조회하면 실패해야 함", async function () {
      await expect(sto.getDividendInfo(999))
        .to.be.revertedWith("Dividend does not exist");
    });

    it("컨트랙트 잔액 조회가 정상적으로 작동해야 함", async function () {
      const balance = await sto.getContractBalance();
      expect(balance).to.equal(ethers.parseEther("100")); // 배당 등록으로 100 ETH 보유
    });
  });

  describe("이벤트 발생", function () {
    it("청약 시 이벤트가 발생해야 함", async function () {
      await timeTravel(110); // subscriptionStartTime + 10
      await expect(sto.connect(investor1).subscribe(10))
        .to.emit(sto, "Subscription")
        .withArgs(investor1.address, 10);
    });

    it("배정 시 이벤트가 발생해야 함", async function () {
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      
      await expect(sto.connect(owner).allocateTokens(investor1.address, 10))
        .to.emit(sto, "Allocation")
        .withArgs(investor1.address, 10);
    });

    it("납입 시 이벤트가 발생해야 함", async function () {
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
      
      const requiredPayment = 10n * BigInt(await sto.TOKEN_PRICE());
      await expect(sto.connect(investor1).paySubscription({ value: requiredPayment }))
        .to.emit(sto, "Payment")
        .withArgs(investor1.address, requiredPayment);
    });

    it("배당 등록 시 이벤트가 발생해야 함", async function () {
      await expect(sto.connect(owner).registerDividend(1, ethers.parseEther("100"), { value: ethers.parseEther("100") }))
        .to.emit(sto, "DividendDistributed")
        .withArgs(1, ethers.parseEther("100"));
    });

    it("제안 생성 시 이벤트가 발생해야 함", async function () {
      await expect(sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600))
        .to.emit(sto, "ProposalCreated")
        .withArgs(1, "Test proposal");
    });

    it("투표 시 이벤트가 발생해야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
      await sto.connect(investor1).paySubscription({ value: 10n * BigInt(await sto.TOKEN_PRICE()) });
      
      await expect(sto.connect(investor1).vote(1, true))
        .to.emit(sto, "Voted")
        .withArgs(1, investor1.address, true);
    });

    it("제안 실행 시 이벤트가 발생해야 함", async function () {
      await sto.connect(owner).createProposal("Test proposal", 7 * 24 * 3600);
      await timeTravel(110); // subscriptionStartTime + 10
      await sto.connect(investor1).subscribe(10);
      await timeTravel(100); // subscriptionEndTime + 10
      await sto.connect(owner).allocateTokens(investor1.address, 10);
      await sto.connect(investor1).paySubscription({ value: 10n * BigInt(await sto.TOKEN_PRICE()) });
      await sto.connect(investor1).vote(1, true);
      await timeTravel(8 * 24 * 3600); // now + 8일
      
      await expect(sto.connect(owner).executeProposal(1))
        .to.emit(sto, "ProposalExecuted")
        .withArgs(1);
    });
  });
}); 