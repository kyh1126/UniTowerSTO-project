<script>
  import { contractStore, accountStore, contractReadyStore } from '../stores/contract.js';
  
  // store 구독
  $: contract = $contractStore;
  $: account = $accountStore;
  $: contractReady = $contractReadyStore;
  
  let amount = 1;
  let txHash = '';
  let loading = false;
  let message = '';

  async function subscribe() {
    if (!contract || !account || !contractReady) {
      message = '지갑을 연결하세요.';
      return;
    }
    if (!amount || isNaN(amount) || amount < 1) {
      message = '1구좌 이상 입력하세요.';
      return;
    }
    loading = true;
    message = '';
    try {
      const tx = await contract.subscribe(BigInt(amount));
      txHash = tx.hash;
      await tx.wait();
      message = '청약 신청이 완료되었습니다!';
    } catch (e) {
      console.error('청약 신청 에러:', e);
      message = e.reason || e.message || '트랜잭션 실패';
    }
    loading = false;
  }
</script>

<div class="space-y-4">
  <div>
    <label for="amount" class="block font-bold mb-1">신청 구좌 수</label>
    <input id="amount" type="number" min="1" max="50" bind:value={amount}
      class="border border-gray-300 px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
  </div>
  <button on:click={subscribe} class="w-full bg-blue-600 hover:bg-blue-800 text-white rounded-xl py-2 font-bold shadow transition disabled:opacity-50" disabled={loading}>
    {loading ? '신청 중...' : '청약 신청'}
  </button>
  {#if txHash}
    <div class="text-xs text-gray-500 break-all">Tx: {txHash}</div>
  {/if}
  {#if message}
    <div class="text-sm text-red-600">{message}</div>
  {/if}
</div> 