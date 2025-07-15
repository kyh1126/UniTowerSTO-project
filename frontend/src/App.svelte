<script>
  import { ethers } from "ethers";
  import abi from './UniTowerSTO.abi.json';
  import Subscribe from './lib/Subscribe.svelte';
  import Pay from './lib/Pay.svelte';
  import Dividend from './lib/Dividend.svelte';
  import Vote from './lib/Vote.svelte';
  import Info from './lib/Info.svelte';
  import { contractStore, accountStore, contractReadyStore } from './stores/contract.js';

  // (1) 배포된 컨트랙트 주소 입력
  const CONTRACT_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318"; // 배포된 UniTowerSTO 컨트랙트 주소

  // (2) 상태 변수
  let provider;
  let signer;
  let account = "";
  let contract = null;
  let contractReady = false;

  // 탭 상태
  let tab = 'info';
  const tabs = [
    { id: 'info', label: '내 투자 정보' },
    { id: 'subscribe', label: '청약 신청' },
    { id: 'pay', label: '납입' },
    { id: 'dividend', label: '배당 수령' },
    { id: 'vote', label: 'DAO 투표' },
  ];

  // (3) 지갑 연결
  async function connectWallet() {
    try {
      if (!window['ethereum']) {
        alert("MetaMask를 설치해 주세요!");
        return;
      }
      provider = new ethers.BrowserProvider(window['ethereum']);
      await provider.send("eth_requestAccounts", []);
      signer = await provider.getSigner();
      account = ""; // 강제로 초기화
      account = await signer.getAddress();
      contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      contractReady = true;
      // store 업데이트
      contractStore.set(contract);
      accountStore.set(account);
      contractReadyStore.set(true);
      console.log('지갑 연결 성공:', account);
    } catch (e) {
      console.error('지갑 연결 에러:', e);
      alert('지갑 연결 중 오류 발생: ' + (e.message || e));
    }
  }

  function disconnectWallet() {
    account = "";
    contract = null;
    provider = null;
    signer = null;
    contractReady = false;
    // store 초기화
    contractStore.set(null);
    accountStore.set('');
    contractReadyStore.set(false);
    tab = 'info';
    alert("앱에서 로그아웃되었습니다. MetaMask에서 완전히 연결을 해제하려면 MetaMask 확장 프로그램에서 직접 연결 해제하세요.");
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-2xl w-full mx-auto p-8 rounded-2xl shadow-2xl bg-white space-y-6">
    <h1 class="text-3xl font-extrabold mb-6 text-blue-800 text-center">UniTower STO 대시보드</h1>
    {#if !account}
      <button
        on:click={connectWallet}
        type="button"
        class="w-full bg-blue-600 hover:bg-blue-800 text-white rounded-xl py-3 font-bold shadow-lg transition mb-2"
      >
        지갑 연결 (MetaMask)
      </button>
    {:else}
      <button
        on:click={disconnectWallet}
        type="button"
        class="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-xl py-2 font-bold shadow transition mb-4"
      >
        지갑 연결 해제 / 뒤로가기
      </button>
      <div class="text-xs text-gray-500 text-center mb-4 break-all">
        <span class="font-bold text-blue-700">지갑:</span> {account}
      </div>
      <!-- 탭 메뉴 -->
      <div class="flex space-x-2 mb-6">
        {#each tabs as t}
          <button
            class="flex-1 py-2 rounded-lg font-bold transition text-sm
              {tab === t.id ? 'bg-blue-600 text-white shadow' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}"
            on:click={() => tab = t.id}
          >
            {t.label}
          </button>
        {/each}
      </div>
      <!-- 탭별 내용 -->
      <div class="bg-gray-50 rounded-xl p-6 min-h-[200px]">
        {#if tab === 'info'}
          <Info />
        {:else if tab === 'subscribe'}
          <Subscribe />
        {:else if tab === 'pay'}
          <Pay />
        {:else if tab === 'dividend'}
          <Dividend />
        {:else if tab === 'vote'}
          <Vote />
        {/if}
      </div>
    {/if}
  </div>
</div>
