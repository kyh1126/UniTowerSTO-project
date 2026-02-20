<script>
  import { ethers } from 'ethers';
  import { contractStore, accountStore, contractReadyStore } from '../stores/contract.js';
  
  // store 구독
  $: contract = $contractStore;
  $: account = $accountStore;
  $: contractReady = $contractReadyStore;
  
  let investorInfo = null;
  let dividends = [];
  let proposals = [];
  let loading = false;
  let message = '';

  async function loadInvestorInfo() {
    if (!contract || !account || !contractReady) return;
    try {
      console.log('투자자 정보 조회 시작:', account);
      const info = await contract.getInvestorInfo(account);
      console.log('투자자 정보 조회 결과:', info);
      investorInfo = {
        subscribedAmount: Number(info[0]),
        allocatedAmount: Number(info[1]),
        hasPaid: info[2],
        isVerified: info[3],
        votingPower: Number(info[4]),
        lastDividendClaim: Number(info[5])
      };
      console.log('투자자 정보 파싱 완료:', investorInfo);
    } catch (e) {
      console.error('투자자 정보 조회 실패:', e);
      message = '투자자 정보 조회 실패: ' + e.message;
    }
  }

  async function loadDividends() {
    if (!contract || !contractReady || typeof contract.dividendCounter !== 'function') return;
    try {
      const dividendCounter = Number(await contract.dividendCounter());
      const dList = [];
      for (let i = 1; i <= dividendCounter; i++) {
        try {
          const dividend = await contract.getDividendInfo(i);
          dList.push({
            id: i,
            quarter: Number(dividend[0]),
            totalAmount: ethers.formatEther(dividend[1]),
            distributedAmount: ethers.formatEther(dividend[2]),
            timestamp: Number(dividend[3]),
            isDistributed: dividend[4]
          });
        } catch (e) {
          // 배당이 존재하지 않으면 건너뛰기
        }
      }
      dividends = dList;
    } catch (e) {
      console.error('배당 정보 조회 실패:', e);
    }
  }

  async function loadProposals() {
    if (!contract || !contractReady || typeof contract.proposalCounter !== 'function') return;
    try {
      const proposalCounter = Number(await contract.proposalCounter());
      const pList = [];
      for (let i = 1; i <= proposalCounter; i++) {
        try {
          const proposal = await contract.getProposalInfo(i);
          pList.push({
            id: i,
            description: proposal[0],
            forVotes: Number(proposal[1]),
            againstVotes: Number(proposal[2]),
            startTime: Number(proposal[3]),
            endTime: Number(proposal[4]),
            executed: proposal[5],
            canceled: proposal[6]
          });
        } catch (e) {
          // 제안이 존재하지 않으면 건너뛰기
        }
      }
      proposals = pList;
    } catch (e) {
      console.error('제안 정보 조회 실패:', e);
    }
  }

  function getInvestmentStatus() {
    if (!investorInfo) return '정보 없음';
    if (investorInfo.hasPaid) return '완료';
    if (investorInfo.allocatedAmount > 0) return '납입 대기';
    if (investorInfo.subscribedAmount > 0) return '배정 대기';
    return '청약 대기';
  }

  $: totalDividendAmount = (() => {
    if (!investorInfo || !dividends.length) return 0;
    return dividends
      .filter(d => d.isDistributed && investorInfo.hasPaid && investorInfo.lastDividendClaim >= d.id)
      .reduce((sum, d) => sum + (parseFloat(d.totalAmount) * investorInfo.allocatedAmount / 3000), 0);
  })();

  // 컴포넌트 마운트 시 정보 로드 - 안전한 방식으로 변경
  $: if (contract && account && contractReady) {
    console.log('컨트랙트 상태 확인:', { contract: !!contract, account, contractReady });
    try {
      loadInvestorInfo();
      // dividendCounter와 proposalCounter가 함수인지 확인 후 호출
      if (typeof contract.dividendCounter === 'function') {
        loadDividends();
      }
      if (typeof contract.proposalCounter === 'function') {
        loadProposals();
      }
    } catch (e) {
      console.error('컴포넌트 로드 에러:', e);
    }
  }
</script>

<div class="space-y-6">
  {#if investorInfo}
    <!-- 투자 정보 요약 -->
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl">
      <h2 class="text-xl font-bold mb-4">내 투자 정보</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{investorInfo.subscribedAmount}</div>
          <div class="text-sm text-gray-600">청약 구좌</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{investorInfo.allocatedAmount}</div>
          <div class="text-sm text-gray-600">배정 구좌</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{investorInfo.votingPower}</div>
          <div class="text-sm text-gray-600">투표권</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{getInvestmentStatus()}</div>
          <div class="text-sm text-gray-600">투자 상태</div>
        </div>
      </div>
    </div>

    <!-- 상세 정보 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 투자 상세 -->
      <div class="bg-white border rounded-xl p-4">
        <h3 class="font-bold mb-3">투자 상세</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>청약 금액:</span>
            <span class="font-mono">{investorInfo.subscribedAmount} ETH</span>
          </div>
          <div class="flex justify-between">
            <span>배정 금액:</span>
            <span class="font-mono">{investorInfo.allocatedAmount} ETH</span>
          </div>
          <div class="flex justify-between">
            <span>납입 상태:</span>
            <span class="font-mono">{investorInfo.hasPaid ? '완료' : '미완료'}</span>
          </div>
          <div class="flex justify-between">
            <span>검증 상태:</span>
            <span class="font-mono">{investorInfo.isVerified ? '완료' : '미완료'}</span>
          </div>
          <div class="flex justify-between">
            <span>마지막 배당 수령:</span>
            <span class="font-mono">{investorInfo.lastDividendClaim}</span>
          </div>
        </div>
      </div>

      <!-- 배당 요약 -->
      <div class="bg-white border rounded-xl p-4">
        <h3 class="font-bold mb-3">배당 요약</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span>총 배당 수령:</span>
            <span class="font-mono">{totalDividendAmount.toFixed(6)} ETH</span>
          </div>
          <div class="flex justify-between">
            <span>등록된 배당:</span>
            <span class="font-mono">{dividends.length}개</span>
          </div>
          <div class="flex justify-between">
            <span>분배 완료:</span>
            <span class="font-mono">{dividends.filter(d => d.isDistributed).length}개</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 최근 배당 내역 -->
    {#if dividends.length > 0}
      <div class="bg-white border rounded-xl p-4">
        <h3 class="font-bold mb-3">최근 배당 내역</h3>
        <div class="space-y-2">
          {#each dividends.slice(-3) as dividend}
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded">
              <div>
                <div class="font-semibold">Q{dividend.quarter} 배당</div>
                <div class="text-sm text-gray-600">{new Date(dividend.timestamp * 1000).toLocaleDateString()}</div>
              </div>
              <div class="text-right">
                <div class="font-mono">{dividend.totalAmount} ETH</div>
                <div class="text-sm text-gray-600">{dividend.isDistributed ? '분배됨' : '대기 중'}</div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- 최근 제안 내역 -->
    {#if proposals.length > 0}
      <div class="bg-white border rounded-xl p-4">
        <h3 class="font-bold mb-3">최근 제안 내역</h3>
        <div class="space-y-2">
          {#each proposals.slice(-3) as proposal}
            <div class="p-2 bg-gray-50 rounded">
              <div class="flex justify-between items-center mb-1">
                <div class="font-semibold">제안 #{proposal.id}</div>
                <div class="text-sm text-gray-600">{new Date(proposal.startTime * 1000).toLocaleDateString()}</div>
              </div>
              <div class="text-sm text-gray-700 mb-1">{proposal.description}</div>
              <div class="flex justify-between text-sm">
                <span>찬성: {proposal.forVotes}</span>
                <span>반대: {proposal.againstVotes}</span>
                <span>{proposal.executed ? '실행됨' : proposal.canceled ? '취소됨' : '진행 중'}</span>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {:else}
    <div class="text-center text-gray-600">투자자 정보를 불러오는 중...</div>
  {/if}

  {#if message}
    <div class="text-sm text-red-600">{message}</div>
  {/if}
</div> 