# 2025bcmd_starter
2025 bcmd 스마트컨트랙트 및 Dapp 개발 시작프로젝트입니다.


1. 전체 개발 절차 및 단계 요약
프로젝트 루트 디렉토리 생성

스마트컨트랙트 환경 구성 (Truffle + OpenZeppelin)

로컬 테스트 환경 구성 (Hardhat)

프론트엔드 환경 구성 (Svelte + TailwindCSS)

연동(통합) 환경 설정 (web3.js/ethers.js, ABI 연결 등)

개발/테스트/배포 및 프론트 통합

CI/CD 및 보안 점검, 최종 배포

2. 절차별 상세 설명
1) 프로젝트 루트 디렉토리 준비
bash
복사
편집
mkdir my-dapp-project
cd my-dapp-project
2) 스마트컨트랙트 환경 구축 (Truffle + OpenZeppelin)
bash
복사
편집
# Truffle 설치 및 프로젝트 초기화
npm init -y
npm install -g truffle
truffle init

# OpenZeppelin contracts 설치
npm install @openzeppelin/contracts

# (선택) 기타 툴: dotenv 등
npm install dotenv
contracts/ 폴더에 스마트컨트랙트 작성

OpenZeppelin의 ERC 표준(ERC20, ERC721 등) 베이스 컨트랙트 상속

3) 실행 및 테스트 환경 구축 (Hardhat)
bash
복사
편집
# Hardhat 로컬 개발환경 설치
npm install --save-dev hardhat
npx hardhat init
Hardhat의 네트워크(localhost, hardhat, ganache 등) 설정

Truffle의 artifacts/ABI를 활용해 Hardhat에서 테스트 가능

팁:
실제 배포와 테스트가 분리되어 있으면, 컨트랙트 코드를 /contracts에 두고, 테스트코드는 /test 내에 hardhat/mocha 스타일로 작성

4) 프론트엔드 환경(Svelte + TailwindCSS)
bash
복사
편집
# Svelte 템플릿(최신은 Vite 기반)
npm create vite@latest frontend -- --template svelte
cd frontend

# TailwindCSS 설치 및 기본설정
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init tailwind.config.js -p
tailwind.config.js와 src/app.css 연동

UI는 Svelte 컴포넌트로 제작

5) 스마트컨트랙트-프론트엔드 연동
프론트에서 ethers.js 혹은 web3.js 설치

bash
복사
편집
npm install ethers    # or npm install web3
Truffle/Hardhat에서 컴파일된 ABI(json) 파일을 프론트엔드 /src/contracts/ 디렉토리에 복사

Svelte에서 ethers/web3로 메서드 호출, 이벤트 구독 구현

6) 개발 및 테스트, 통합
스마트컨트랙트 코드 구현/테스트:

Hardhat/Truffle로 배포 & 테스트

Ganache/Hardhat 노드 구동, 메타마스크 연결

프론트엔드 개발:

스마트컨트랙트 배포 후, ABI & 주소 적용

지갑 연결, 컨트랙트 함수 호출 UI 구현

통합 테스트(프론트+컨트랙트)

7) 배포 및 운영환경 준비
스마트컨트랙트 메인넷/테스트넷 배포(Truffle/Hardhat deploy)

프론트엔드 Vercel, Netlify, S3 등 배포

CI/CD, 코드감사(OpenZeppelin Defender 등), Snyk 등 보안 점검

3. 실무 지향 폴더 구조 예시
text
복사
편집
my-dapp-project/
│
├─ contracts/               # 스마트컨트랙트 Solidity 파일
│    └─ MyToken.sol
├─ migrations/              # Truffle migration 스크립트
├─ test/                    # 컨트랙트 테스트 코드(Hardhat+Mocha)
│
├─ frontend/                # Svelte + Tailwind 프론트엔드
│    ├─ src/
│    │    ├─ contracts/     # ABI, 주소 등 컨트랙트 연동용
│    │    ├─ lib/           # ethers/web3 연결 코드
│    │    └─ components/
│    └─ public/
│
├─ .env                     # 환경변수 관리
├─ truffle-config.js
├─ hardhat.config.js
├─ package.json
4. 노하우/실무 팁
Truffle, Hardhat 둘 다 설치해도 됨
실제 배포/관리(Truffle)와 테스트/유연성(Hardhat)을 병행

OpenZeppelin 코드 기반으로 새 컨트랙트 작성 시 반드시 상속 구조, modifier, role 등 보안 옵션 적극 사용

ABI 공유 자동화: ABI 생성 후 npm script 또는 symlink로 프론트에 자동 복사 설정

Svelte+Tailwind: shadcn/ui 등 미리 만들어진 Tailwind 컴포넌트도 적극 활용

테스트: Hardhat의 fixture, forked mainnet 환경 등으로 고급 테스트 적용

지갑 연결: viem, ethers, web3modal 등 활용해 지갑 UX 현대화

오픈소스 예제: scaffold-eth, svelte-web3-template 참고 추천
