<script>
  import { ethers } from 'ethers';
  import { contractStore, accountStore, contractReadyStore } from '../stores/contract.js';
  
  // store 구독
  $: contract = $contractStore;
  $: account = $accountStore;
  $: contractReady = $contractReadyStore;
  
  let dividends = [];
  let investorInfo = null;
  let loading = false;
  let txHash = '';
  let message = '';

  async function loadDividends() {
    if (!contract || !contractReady) return;
    try {
      // 배당 카운터 조회 (실제로는 이벤트에서 가져와야 함)
      const dividendCounter = Number(await contract.dividendCounter());
      const list = [];
      for (let i = 1; i <= dividendCounter; i++) {
        try {
          const dividend = await contract.getDividendInfo(i);
          list.push({
            id: i,
            quarter: Number(dividend[0]),
            totalAmount: ethers.formatEther(dividend[1]),
            distributedAmount: ethers.formatEther(dividend[2]),
            timestamp: Number(dividend[3]),
            isDistributed: dividend[4]
          });
        } catch (e) {
          console.error('배당 조회 에러:', i, e);
        }
      }
      dividends = list;
    } catch (e) {
      console.error('배당 정보 조회 실패:', e);
      message = '배당 정보 조회 실패';
    }
  }

  async function loadInvestorInfo() {
    if (!contract || !account || !contractReady) return;
    try {
      const info = await contract.getInvestorInfo(account);
      investorInfo = {
        subscribedAmount: Number(info[0]),
        allocatedAmount: Number(info[1]),
        hasPaid: info[2],
        isVerified: info[3],
        votingPower: Number(info[4]),
        lastDividendClaim: Number(info[5])
      };
    } catch (e) {
      console.error('투자자 정보 조회 실패:', e);
      message = '투자자 정보 조회 실패';
    }
  }

  async function claimDividend(dividendId) {
    if (!contract || !account || !contractReady) {
      message = '지갑을 연결하세요.';
      return;
    }
    if (!investorInfo || !investorInfo.hasPaid) {
      message = '납입이 완료된 투자자만 배당을 수령할 수 있습니다.';
      return;
    }
    loading = true;
    message = '';
    try {
      const tx = await contract.claimDividend(dividendId);
      txHash = tx.hash;
      await tx.wait();
      message = '배당 수령이 완료되었습니다!';
      await loadInvestorInfo(); // 정보 갱신
    } catch (e) {
      console.error('배당 수령 에러:', e);
      message = e.reason || e.message || '트랜잭션 실패';
    }
    loading = false;
  }

  // 컴포넌트 마운트 시 정보 로드
  $: if (contract && account && contractReady) {
    try {
      loadInvestorInfo();
      loadDividends();
    } catch (e) {
      console.error('컴포넌트 로드 에러:', e);
    }
  }
</script>

<div class="space-y-4">
  {#if investorInfo}
    <div class="bg-blue-50 p-4 rounded-lg">
      <h3 class="font-bold mb-2">내 투자 정보</h3>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div>배정 구좌: <span class="font-mono">{investorInfo.allocatedAmount}</span></div>
        <div>납입 상태: <span class="font-mono">{investorInfo.hasPaid ? '완료' : '미완료'}</span></div>
        <div>마지막 배당 수령: <span class="font-mono">{investorInfo.lastDividendClaim}</span></div>
      </div>
    </div>
  {/if}

  {#if dividends.length > 0}
    <div class="space-y-3">
      <h3 class="font-bold">배당 정보</h3>
      {#each dividends as dividend}
        <div class="border rounded-lg p-3">
          <div class="flex justify-between items-center mb-2">
            <div class="font-bold">Q{dividend.quarter} 배당</div>
            <div class="text-sm text-gray-600">{new Date(dividend.timestamp * 1000).toLocaleDateString()}</div>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm mb-2">
            <div>총 배당: <span class="font-mono">{dividend.totalAmount}</span> ETH</div>
            <div>분배 상태: <span class="font-mono">{dividend.isDistributed ? '분배됨' : '미분배'}</span></div>
          </div>
          {#if dividend.isDistributed && investorInfo && investorInfo.hasPaid && investorInfo.lastDividendClaim < dividend.id}
            <button 
              on:click={() => claimDividend(dividend.id)}
              class="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-bold shadow transition disabled:opacity-50" 
              disabled={loading}
            >
              {loading ? '수령 중...' : '배당 수령'}
            </button>
          {:else if dividend.isDistributed && investorInfo && investorInfo.lastDividendClaim >= dividend.id}
            <div class="text-center text-green-600 font-bold">수령 완료</div>
          {:else if !dividend.isDistributed}
            <div class="text-center text-gray-500">분배 대기 중</div>
          {:else}
            <div class="text-center text-gray-500">납입 필요</div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center text-gray-600">등록된 배당이 없습니다.</div>
  {/if}

  {#if txHash}
    <div class="text-xs text-gray-500 break-all">Tx: {txHash}</div>
  {/if}
  {#if message}
    <div class="text-sm text-red-600">{message}</div>
  {/if}
</div> 