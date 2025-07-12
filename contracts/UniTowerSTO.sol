// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UniTowerSTO is ReentrancyGuard, Ownable {
    // STO 기본 정보
    string public constant PROJECT_NAME = "UniTower STO";
    string public constant PROJECT_SYMBOL = "UNITOWER";
    uint256 public constant TOTAL_SUPPLY = 3000; // 3,000주
    uint256 public constant TOKEN_PRICE = 1000000; // 1,000,000원 (wei 단위)
    uint256 public constant MAX_SUBSCRIPTION_PER_PERSON = 50; // 1인당 최대 50구좌
    uint256 public constant MIN_SUBSCRIPTION = 1; // 최소 1구좌

    // 청약 기간
    uint256 public subscriptionStartTime;
    uint256 public subscriptionEndTime;
    uint256 public paymentDueTime;
    uint256 public allocationAnnouncementTime;

    // 투자자 정보
    struct Investor {
        uint256 subscribedAmount;
        uint256 allocatedAmount;
        bool hasPaid;
        bool isVerified;
        uint256 votingPower;
        uint256 lastDividendClaim;
    }

    // 배당 정보
    struct DividendInfo {
        uint256 quarter;
        uint256 totalAmount;
        uint256 distributedAmount;
        uint256 timestamp;
        bool isDistributed;
    }

    // DAO 투표 정보
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool canceled;
    }

    // 상태 변수
    mapping(address => Investor) public investors;
    mapping(uint256 => DividendInfo) public dividends;
    mapping(uint256 => Proposal) public proposals;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    
    uint256 private proposalCounter;
    uint256 private dividendCounter;

    // 이벤트
    event Subscription(address indexed investor, uint256 amount);
    event Allocation(address indexed investor, uint256 amount);
    event Payment(address indexed investor, uint256 amount);
    event DividendDistributed(uint256 quarter, uint256 totalAmount);
    event DividendClaimed(address indexed investor, uint256 amount);
    event ProposalCreated(uint256 proposalId, string description);
    event Voted(uint256 proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 proposalId);
    event EmergencyOperatorChanged(address indexed oldOperator, address indexed newOperator);

    // 수수료 관련
    uint256 public platformFeeRate = 15; // 1.5% (150 basis points)
    uint256 public daoFeeRate = 3; // 0.3% (30 basis points)
    uint256 public constant FEE_DENOMINATOR = 1000;

    // 투명성 및 보안
    bool public emergencyPaused;
    address public emergencyOperator;
    uint256 public totalCollectedFees;

    // 상수 및 제한
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000; // description 최대 길이
    uint256 public constant MIN_PROPOSAL_DURATION = 1 days; // 최소 제안 기간
    uint256 public constant MAX_PROPOSAL_DURATION = 30 days; // 최대 제안 기간

    // [보안] emergencyOperator 권한 오남용 주의 필요
    modifier onlyEmergencyOperator() {
        require(msg.sender == emergencyOperator, "Not emergency operator");
        _;
    }

    // [보안] 비상정지 상태에서 함수 실행 제한
    modifier whenNotPaused() {
        require(!emergencyPaused, "Contract is paused");
        _;
    }

    // [보안] 0 address 검증
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }

    // [보안] proposal 존재 여부 검증
    modifier proposalExists(uint256 proposalId) {
        require(proposalId > 0 && proposalId <= proposalCounter, "Proposal does not exist");
        _;
    }

    // [보안] dividend 존재 여부 검증
    modifier dividendExists(uint256 dividendId) {
        require(dividendId > 0 && dividendId <= dividendCounter, "Dividend does not exist");
        _;
    }

    constructor(
        uint256 _subscriptionStartTime,
        uint256 _subscriptionEndTime,
        uint256 _paymentDueTime,
        uint256 _allocationAnnouncementTime
    ) Ownable(msg.sender) {
        // [보안] 시간 순서 검증
        require(_subscriptionStartTime < _subscriptionEndTime, "Invalid subscription period");
        require(_subscriptionEndTime < _paymentDueTime, "Invalid payment due time");
        require(_paymentDueTime < _allocationAnnouncementTime, "Invalid allocation time");
        
        subscriptionStartTime = _subscriptionStartTime;
        subscriptionEndTime = _subscriptionEndTime;
        paymentDueTime = _paymentDueTime;
        allocationAnnouncementTime = _allocationAnnouncementTime;
        emergencyOperator = msg.sender;
    }

    // 청약 신청
    function subscribe(uint256 amount) external whenNotPaused {
        // [보안] 입력값 검증 및 1인 한도 체크
        require(block.timestamp >= subscriptionStartTime, "Subscription not started");
        require(block.timestamp <= subscriptionEndTime, "Subscription ended");
        require(amount >= MIN_SUBSCRIPTION, "Below minimum subscription");
        require(amount <= MAX_SUBSCRIPTION_PER_PERSON, "Exceeds maximum subscription");
        require(investors[msg.sender].subscribedAmount + amount <= MAX_SUBSCRIPTION_PER_PERSON, "Exceeds personal limit");

        investors[msg.sender].subscribedAmount += amount;
        emit Subscription(msg.sender, amount);
    }

    // 배정 처리 (관리자만)
    function allocateTokens(address investor, uint256 amount) external onlyOwner validAddress(investor) {
        // [보안] onlyOwner로 접근제어, 입력값 검증
        require(block.timestamp > subscriptionEndTime, "Subscription period not ended");
        require(investors[investor].subscribedAmount >= amount, "Invalid allocation amount");
        require(amount > 0, "Allocation amount must be positive");

        investors[investor].allocatedAmount = amount;
        investors[investor].votingPower = amount;
        emit Allocation(investor, amount);
    }

    // 납입 처리
    function paySubscription() external payable whenNotPaused {
        // [보안] 재진입 방지 필요 없음(상태변수 먼저 변경), 입력값 검증
        require(block.timestamp <= paymentDueTime, "Payment period ended");
        require(investors[msg.sender].allocatedAmount > 0, "No allocation");
        require(!investors[msg.sender].hasPaid, "Already paid");

        uint256 requiredPayment = investors[msg.sender].allocatedAmount * TOKEN_PRICE;
        require(msg.value >= requiredPayment, "Insufficient payment");

        investors[msg.sender].hasPaid = true;
        emit Payment(msg.sender, requiredPayment);
    }

    // 배당 등록 (관리자만)
    function registerDividend(uint256 quarter, uint256 totalAmount) external onlyOwner {
        // [보안] onlyOwner로 접근제어, 입력값 검증
        require(totalAmount > 0, "Invalid dividend amount");
        require(quarter > 0, "Invalid quarter");
        
        dividendCounter++;
        uint256 dividendId = dividendCounter;
        
        dividends[dividendId] = DividendInfo({
            quarter: quarter,
            totalAmount: totalAmount,
            distributedAmount: 0,
            timestamp: block.timestamp,
            isDistributed: false
        });

        emit DividendDistributed(quarter, totalAmount);
    }

    // 배당 수령
    function claimDividend(uint256 dividendId) external nonReentrant whenNotPaused dividendExists(dividendId) {
        // [보안] 재진입 공격 방지 (nonReentrant)
        require(investors[msg.sender].hasPaid, "Not a paid investor");
        require(dividends[dividendId].isDistributed, "Dividend not distributed");
        require(investors[msg.sender].lastDividendClaim < dividendId, "Already claimed");

        uint256 investorShare = (investors[msg.sender].allocatedAmount * dividends[dividendId].totalAmount) / TOTAL_SUPPLY;
        require(investorShare > 0, "No dividend to claim");

        // 수수료 계산
        uint256 platformFee = (investorShare * platformFeeRate) / FEE_DENOMINATOR;
        uint256 daoFee = (investorShare * daoFeeRate) / FEE_DENOMINATOR;
        uint256 netDividend = investorShare - platformFee - daoFee;

        totalCollectedFees += platformFee + daoFee;
        investors[msg.sender].lastDividendClaim = dividendId;

        // [보안] call 사용 시 reentrancy 주의, 상태변수 먼저 변경 후 call
        (bool success, ) = payable(msg.sender).call{value: netDividend}("");
        require(success, "Dividend transfer failed");

        emit DividendClaimed(msg.sender, netDividend);
    }

    // DAO 제안 생성
    function createProposal(string memory description, uint256 duration) external onlyOwner {
        // [보안] onlyOwner로 접근제어, description 길이 제한 필요할 수 있음
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description too long");
        require(duration >= MIN_PROPOSAL_DURATION, "Duration too short");
        require(duration <= MAX_PROPOSAL_DURATION, "Duration too long");
        
        proposalCounter++;
        uint256 proposalId = proposalCounter;

        proposals[proposalId] = Proposal({
            id: proposalId,
            description: description,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + duration,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(proposalId, description);
    }

    // 투표
    function vote(uint256 proposalId, bool support) external whenNotPaused proposalExists(proposalId) {
        // [보안] 1인 1표 제한, proposalId 유효성 체크 필요
        require(investors[msg.sender].hasPaid, "Not a paid investor");
        require(!hasVoted[msg.sender][proposalId], "Already voted");
        require(block.timestamp >= proposals[proposalId].startTime, "Voting not started");
        require(block.timestamp <= proposals[proposalId].endTime, "Voting ended");
        require(!proposals[proposalId].canceled, "Proposal canceled");

        hasVoted[msg.sender][proposalId] = true;

        if (support) {
            proposals[proposalId].forVotes += investors[msg.sender].votingPower;
        } else {
            proposals[proposalId].againstVotes += investors[msg.sender].votingPower;
        }

        emit Voted(proposalId, msg.sender, support);
    }

    // 제안 실행
    function executeProposal(uint256 proposalId) external onlyOwner proposalExists(proposalId) {
        // [보안] onlyOwner로 접근제어, 투표결과 검증
        require(proposals[proposalId].forVotes + proposals[proposalId].againstVotes > 0, "No votes cast");
        require(proposals[proposalId].forVotes > proposals[proposalId].againstVotes, "Proposal not passed");
        require(!proposals[proposalId].executed, "Already executed");
        require(block.timestamp > proposals[proposalId].endTime, "Voting not ended");

        proposals[proposalId].executed = true;
        emit ProposalExecuted(proposalId);
    }

    // 비상 정지
    function emergencyPause() external onlyEmergencyOperator {
        // [보안] 비상정지 권한 오남용 주의
        emergencyPaused = true;
    }

    // 비상 정지 해제
    function emergencyUnpause() external onlyEmergencyOperator {
        emergencyPaused = false;
    }

    // 수수료 수령 (관리자만)
    function withdrawFees() external onlyOwner {
        // [보안] call 사용, 상태변수 먼저 변경 후 call
        uint256 amount = totalCollectedFees;
        require(amount > 0, "No fees to withdraw");
        
        totalCollectedFees = 0;
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "Fee withdrawal failed");
    }

    // 투자자 정보 조회
    function getInvestorInfo(address investor) external view validAddress(investor) returns (
        uint256 subscribedAmount,
        uint256 allocatedAmount,
        bool hasPaid,
        bool isVerified,
        uint256 votingPower,
        uint256 lastDividendClaim
    ) {
        Investor memory investorInfo = investors[investor];
        return (
            investorInfo.subscribedAmount,
            investorInfo.allocatedAmount,
            investorInfo.hasPaid,
            investorInfo.isVerified,
            investorInfo.votingPower,
            investorInfo.lastDividendClaim
        );
    }

    // 제안 정보 조회
    function getProposalInfo(uint256 proposalId) external view proposalExists(proposalId) returns (
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 startTime,
        uint256 endTime,
        bool executed,
        bool canceled
    ) {
        Proposal memory proposal = proposals[proposalId];
        return (
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.startTime,
            proposal.endTime,
            proposal.executed,
            proposal.canceled
        );
    }

    // 배당 정보 조회
    function getDividendInfo(uint256 dividendId) external view dividendExists(dividendId) returns (
        uint256 quarter,
        uint256 totalAmount,
        uint256 distributedAmount,
        uint256 timestamp,
        bool isDistributed
    ) {
        DividendInfo memory dividend = dividends[dividendId];
        return (
            dividend.quarter,
            dividend.totalAmount,
            dividend.distributedAmount,
            dividend.timestamp,
            dividend.isDistributed
        );
    }

    // 컨트랙트 잔액 조회
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // 수수료율 설정 (관리자만)
    function setFeeRates(uint256 _platformFeeRate, uint256 _daoFeeRate) external onlyOwner {
        // [보안] onlyOwner로 접근제어, 상한 제한
        require(_platformFeeRate <= 50, "Platform fee too high"); // 최대 5%
        require(_daoFeeRate <= 10, "DAO fee too high"); // 최대 1%
        require(_platformFeeRate + _daoFeeRate <= 60, "Total fee too high"); // 총 수수료 최대 6%
        
        platformFeeRate = _platformFeeRate;
        daoFeeRate = _daoFeeRate;
    }

    // 비상 운영자 변경
    function setEmergencyOperator(address _newOperator) external onlyOwner validAddress(_newOperator) {
        // [보안] onlyOwner로 접근제어, 0 address 방지 필요
        address oldOperator = emergencyOperator;
        emergencyOperator = _newOperator;
        emit EmergencyOperatorChanged(oldOperator, _newOperator);
    }

    // 컨트랙트가 ETH를 받을 수 있도록
    receive() external payable {}
} 