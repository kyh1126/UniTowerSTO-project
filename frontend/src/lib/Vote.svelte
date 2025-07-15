<script>
  import { contractStore, accountStore, contractReadyStore } from '../stores/contract.js';
  
  // store 구독
  $: contract = $contractStore;
  $: account = $accountStore;
  $: contractReady = $contractReadyStore;
  
  let proposals = [];
  let investorInfo = null;
  let loading = false;
  let txHash = '';
  let message = '';

  async function loadProposals() {
    if (!contract || !contractReady) return;
    try {
      // 제안 카운터 조회
      const proposalCounter = await contract.proposalCounter();
      proposals = [];
      for (let i = 1; i <= proposalCounter; i++) {
        try {
          const proposal = await contract.getProposalInfo(i);
          proposals.push({
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
    } catch (e) {
      console.error('제안 정보 조회 실패:', e);
      message = '제안 정보 조회 실패';
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

  async function vote(proposalId, support) {
    if (!contract || !account || !contractReady) {
      message = '지갑을 연결하세요.';
      return;
    }
    if (!investorInfo || !investorInfo.hasPaid) {
      message = '납입이 완료된 투자자만 투표할 수 있습니다.';
      return;
    }
    loading = true;
    message = '';
    try {
      const tx = await contract.vote(proposalId, support);
      txHash = tx.hash;
      await tx.wait();
      message = '투표가 완료되었습니다!';
      await loadProposals(); // 제안 정보 갱신
    } catch (e) {
      console.error('투표 에러:', e);
      message = e.reason || e.message || '트랜잭션 실패';
    }
    loading = false;
  }

  function getVotingStatus(proposal) {
    const now = Math.floor(Date.now() / 1000);
    if (proposal.canceled) return '취소됨';
    if (proposal.executed) return '실행됨';
    if (now < proposal.startTime) return '대기 중';
    if (now > proposal.endTime) return '투표 종료';
    return '투표 중';
  }

  function getVoteResult(proposal) {
    if (proposal.forVotes > proposal.againstVotes) return '찬성';
    if (proposal.againstVotes > proposal.forVotes) return '반대';
    return '동점';
  }

  // 컴포넌트 마운트 시 정보 로드
  $: if (contract && account && contractReady) {
    try {
      loadInvestorInfo();
      loadProposals();
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
        <div>투표권: <span class="font-mono">{investorInfo.votingPower}</span></div>
        <div>납입 상태: <span class="font-mono">{investorInfo.hasPaid ? '완료' : '미완료'}</span></div>
      </div>
    </div>
  {/if}

  {#if proposals.length > 0}
    <div class="space-y-3">
      <h3 class="font-bold">DAO 제안 목록</h3>
      {#each proposals as proposal}
        <div class="border rounded-lg p-3">
          <div class="flex justify-between items-center mb-2">
            <div class="font-bold">제안 #{proposal.id}</div>
            <div class="text-sm text-gray-600">{getVotingStatus(proposal)}</div>
          </div>
          <div class="text-sm mb-2">{proposal.description}</div>
          <div class="grid grid-cols-2 gap-2 text-sm mb-2">
            <div>찬성: <span class="font-mono">{proposal.forVotes}</span></div>
            <div>반대: <span class="font-mono">{proposal.againstVotes}</span></div>
            <div>시작: <span class="font-mono">{new Date(proposal.startTime * 1000).toLocaleDateString()}</span></div>
            <div>종료: <span class="font-mono">{new Date(proposal.endTime * 1000).toLocaleDateString()}</span></div>
          </div>
          {#if getVotingStatus(proposal) === '투표 중' && investorInfo && investorInfo.hasPaid}
            <div class="flex space-x-2">
              <button 
                on:click={() => vote(proposal.id, true)}
                class="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg py-2 font-bold shadow transition disabled:opacity-50" 
                disabled={loading}
              >
                찬성
              </button>
              <button 
                on:click={() => vote(proposal.id, false)}
                class="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2 font-bold shadow transition disabled:opacity-50" 
                disabled={loading}
              >
                반대
              </button>
            </div>
          {:else if getVotingStatus(proposal) === '투표 종료'}
            <div class="text-center font-bold text-blue-600">결과: {getVoteResult(proposal)}</div>
          {:else}
            <div class="text-center text-gray-500">{getVotingStatus(proposal)}</div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center text-gray-600">등록된 제안이 없습니다.</div>
  {/if}

  {#if txHash}
    <div class="text-xs text-gray-500 break-all">Tx: {txHash}</div>
  {/if}
  {#if message}
    <div class="text-sm text-red-600">{message}</div>
  {/if}
</div> 