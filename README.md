# 2025 BCMD Starter Project

블록체인 기반 STO(Security Token Offering) 토큰 DApp 프로젝트입니다. Hardhat을 사용한 스마트 컨트랙트 개발 환경과 Svelte를 사용한 프론트엔드로 구성되어 있습니다.

## 프로젝트 구조

```
UniTowerSTO-project/
├── contracts/          # 스마트 컨트랙트
│   ├── Lock.sol            # 예제 컨트랙트
│   └── UniTowerSTO.sol     # STO 토큰 컨트랙트
├── frontend/          # Svelte 프론트엔드 애플리케이션
├── scripts/           # 배포 및 유틸리티 스크립트
├── test/              # 스마트 컨트랙트 테스트
└── docs/              # 기획서 및 보안 검토 문서
```

## 주요 기능

### UniTowerSTO 컨트랙트
- 청약(Subscribe) - 투자자가 원하는 구좌 수만큼 청약 신청
- 배정(Allocate) - 관리자가 투자자에게 구좌 배정
- 납입(Pay) - 배정받은 구좌에 대해 ETH로 납입
- 배당(Dividend) - 관리자가 배당 등록, 투자자가 지분 비율대로 수령
- DAO 투표(Vote) - 토큰 보유자가 프로젝트 주요 안건에 투표

## 시작하기

### 필수 요구사항
- Node.js (v16 이상)
- npm 또는 yarn

### 설치

1. 프로젝트 클론
```bash
git clone https://github.com/kyh1126/UniTowerSTO-project.git
cd UniTowerSTO-project
```

2. 의존성 설치
```bash
npm install
```

3. 프론트엔드 의존성 설치
```bash
cd frontend
npm install
cd ..
```

### 개발 환경 실행

1. 로컬 블록체인 노드 실행
```bash
npm run node
```

2. 스마트 컨트랙트 컴파일
```bash
npm run compile:all
```

3. 프론트엔드 개발 서버 실행
```bash
npm run dapp
```

## 사용 가능한 명령어

### 루트 디렉토리
- `npm run node` - Hardhat 로컬 노드 실행
- `npm run compile` - 스마트 컨트랙트 컴파일
- `npm run copy-abi` - ABI 파일을 프론트엔드로 복사
- `npm run compile:all` - 컴파일 및 ABI 복사
- `npm run dapp` - 프론트엔드 개발 서버 실행

### Hardhat 명령어
```bash
npx hardhat help                # 도움말
npx hardhat test                # 테스트 실행
REPORT_GAS=true npx hardhat test # 가스 리포트와 함께 테스트
npx hardhat node                # 로컬 노드 실행
npx hardhat run scripts/deploy.js --network localhost  # 컨트랙트 배포
```

## 환경 설정

`.env` 파일을 생성하여 환경 변수 설정:
```
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key_here
```
