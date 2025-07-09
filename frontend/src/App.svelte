<script>
  import { ethers } from "ethers";

  // (1) 배포된 컨트랙트 정보 입력
  const CONTRACT_ADDRESS = "여기에_배포된_컨트랙트_주소";
  import abi from './MySTOToken.abi.json'; // ABI 파일을 src 폴더에 저장하세요

  // (2) 상태 변수
  let account = "";
  let contract;
  let provider;
  let signer;
  let decimals = 18;

  let balance = "0";
  let totalSupply = "0";
  let transferTo = "";
  let transferAmount = "";
  let mintTo = "";
  let mintAmount = "";
  let burnAmount = "";

  let txHash = "";

  // (3) 지갑 연결
  async function connectWallet() {
    if (!window.ethereum) {
      alert("MetaMask를 설치해 주세요!");
      return;
    }
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = await provider.getSigner();
    account = await signer.getAddress();

    contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    decimals = await contract.decimals();

    await refreshInfo();
  }

  // (4) 지갑 연결 해제(로그아웃)
  function disconnectWallet() {
    account = "";
    contract = null;
    provider = null;
    signer = null;
    balance = "0";
    totalSupply = "0";
    transferTo = "";
    transferAmount = "";
    mintTo = "";
    mintAmount = "";
    burnAmount = "";
    txHash = "";
    
    // 사용자에게 MetaMask에서 직접 연결을 해제하도록 안내
    alert("앱에서 로그아웃되었습니다.\n\nMetaMask에서 완전히 연결을 해제하려면:\n1. MetaMask 확장 프로그램을 열어주세요\n2. 연결된 사이트 목록에서 이 사이트를 찾아주세요\n3. '연결 해제' 버튼을 클릭해주세요");
  }

  // (5) 정보 갱신
  async function refreshInfo() {
    if (contract && account) {
      balance = ethers.formatUnits(await contract.balanceOf(account), decimals);
      totalSupply = ethers.formatUnits(await contract.totalSupply(), decimals);
    }
  }

  // (6) 전송
  async function sendTransfer() {
    if (contract && transferTo && transferAmount) {
      const tx = await contract.transfer(
        transferTo,
        ethers.parseUnits(transferAmount, decimals)
      );
      txHash = tx.hash;
      await tx.wait();
      await refreshInfo();
    }
  }

  // (7) Mint (owner만)
  async function mint() {
    if (contract && mintTo && mintAmount) {
      const tx = await contract.mint(
        mintTo,
        ethers.parseUnits(mintAmount, decimals)
      );
      txHash = tx.hash;
      await tx.wait();
      await refreshInfo();
    }
  }

  // (8) Burn
  async function burn() {
    if (contract && burnAmount) {
      const tx = await contract.burn(
        ethers.parseUnits(burnAmount, decimals)
      );
      txHash = tx.hash;
      await tx.wait();
      await refreshInfo();
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="max-w-lg w-full mx-auto p-8 rounded-2xl shadow-2xl bg-white space-y-6">
    <h1 class="text-3xl font-extrabold mb-6 text-blue-800 text-center">STO Sample DApp<br /><span class="text-xl font-bold">(자유롭게 수정하세요)</span></h1>
    
    {#if !account}
      <button
        on:click={connectWallet}
        type="button"
        class="w-full bg-blue-600 hover:bg-blue-800 text-white rounded-xl py-3 font-bold shadow-lg transition mb-2"
      >
        지갑 연결 (MetaMask)
      </button>
    {:else}
      <!-- 지갑 해제 버튼 -->
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
      <div class="grid grid-cols-2 gap-3 text-center mb-6">
        <div class="bg-blue-50 p-3 rounded-lg">
          내 잔액<br /><span class="font-mono text-lg">{balance}</span>
        </div>
        <div class="bg-blue-50 p-3 rounded-lg">
          총발행량<br /><span class="font-mono text-lg">{totalSupply}</span>
        </div>
      </div>

      <!-- Transfer -->
      <div class="space-y-1 mb-6">
        <div class="font-bold text-gray-700 mb-1">전송 (Transfer)</div>
        <input placeholder="받는 주소" bind:value={transferTo}
          class="border border-gray-300 px-3 py-2 rounded-xl w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <input type="number" placeholder="수량" bind:value={transferAmount}
          class="border border-gray-300 px-3 py-2 rounded-xl w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        <button on:click={sendTransfer}
          class="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2 font-bold shadow transition">전송</button>
      </div>

      <!-- Mint -->
      <div class="space-y-1 mb-6">
        <div class="font-bold text-gray-700 mb-1">토큰 발행 (Mint, 소유자 전용)</div>
        <input placeholder="수령 주소" bind:value={mintTo}
          class="border border-gray-300 px-3 py-2 rounded-xl w-full mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        <input type="number" placeholder="수량" bind:value={mintAmount}
          class="border border-gray-300 px-3 py-2 rounded-xl w-full mb-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        <button on:click={mint}
          class="w-full bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl py-2 font-bold shadow transition">Mint</button>
      </div>

      <!-- Burn -->
      <div class="space-y-1 mb-4">
        <div class="font-bold text-gray-700 mb-1">소각 (Burn)</div>
        <input type="number" placeholder="소각 수량" bind:value={burnAmount}
          class="border border-gray-300 px-3 py-2 rounded-xl w-full mb-2 focus:outline-none focus:ring-2 focus:ring-red-400" />
        <button on:click={burn}
          class="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl py-2 font-bold shadow transition">Burn</button>
      </div>

      {#if txHash}
        <div class="mt-2 text-xs text-gray-500 break-all">Tx: {txHash}</div>
      {/if}

      <button on:click={refreshInfo}
        class="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl py-2 font-bold transition">정보 새로고침</button>
    {/if}
  </div>
</div>
