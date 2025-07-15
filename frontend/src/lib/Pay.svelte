<script>
  import { contractStore, accountStore, contractReadyStore } from '../stores/contract.js';
  
  // store 구독
  $: contract = $contractStore;
  $: account = $accountStore;
  $: contractReady = $contractReadyStore;
  
  let investorInfo = null;
  let loading = false;
  let txHash = '';
  let message = '';

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

  async function pay() {
    if (!contract || !account || !contractReady) {
      message = '지갑을 연결하세요.';
      return;
    }
    if (!investorInfo || investorInfo.allocatedAmount === 0) {
      message = '배정된 구좌가 없습니다.';
      return;
    }
    if (investorInfo.hasPaid) {
      message = '이미 납입이 완료되었습니다.';
      return;
    }
    loading = true;
    message = '';
    try {
      const requiredPayment = investorInfo.allocatedAmount * 1000000; // 1,000,000원 per 구좌
      const tx = await contract.paySubscription({ value: BigInt(requiredPayment) });
      txHash = tx.hash;
      await tx.wait();
      message = '납입이 완료되었습니다!';
      await loadInvestorInfo(); // 정보 갱신
    } catch (e) {
      console.error('납입 에러:', e);
      message = e.reason || e.message || '트랜잭션 실패';
    }
    loading = false;
  }

  // 컴포넌트 마운트 시 투자자 정보 로드
  $: if (contract && account && contractReady) {
    try {
      loadInvestorInfo();
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
        <div>청약 구좌: <span class="font-mono">{investorInfo.subscribedAmount}</span></div>
        <div>배정 구좌: <span class="font-mono">{investorInfo.allocatedAmount}</span></div>
        <div>납입 상태: <span class="font-mono">{investorInfo.hasPaid ? '완료' : '미완료'}</span></div>
        <div>투표권: <span class="font-mono">{investorInfo.votingPower}</span></div>
      </div>
    </div>
  {/if}

  {#if investorInfo && investorInfo.allocatedAmount > 0 && !investorInfo.hasPaid}
    <div class="bg-yellow-50 p-4 rounded-lg">
      <h3 class="font-bold mb-2">납입 정보</h3>
      <div class="text-sm">
        <div>배정 구좌: <span class="font-mono">{investorInfo.allocatedAmount}</span>구좌</div>
        <div>납입 금액: <span class="font-mono">{investorInfo.allocatedAmount * 1000000}</span>원 (ETH)</div>
      </div>
    </div>
    <button on:click={pay} class="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 font-bold shadow transition disabled:opacity-50" disabled={loading}>
      {loading ? '납입 중...' : '납입하기'}
    </button>
  {:else if investorInfo && investorInfo.hasPaid}
    <div class="bg-green-50 p-4 rounded-lg text-center">
      <div class="text-green-800 font-bold">납입 완료</div>
    </div>
  {:else if investorInfo && investorInfo.allocatedAmount === 0}
    <div class="bg-gray-50 p-4 rounded-lg text-center">
      <div class="text-gray-600">배정된 구좌가 없습니다.</div>
    </div>
  {/if}

  {#if txHash}
    <div class="text-xs text-gray-500 break-all">Tx: {txHash}</div>
  {/if}
  {#if message}
    <div class="text-sm text-red-600">{message}</div>
  {/if}
</div> 