// scripts/copy-abi.js
const fs = require('fs');
const path = require('path');

const artifactPath = path.join(__dirname, '../artifacts/contracts/UniTowerSTO.sol/UniTowerSTO.json');
const abiDest = path.join(__dirname, '../frontend/src/UniTowerSTO.abi.json'); // 프론트엔드 src 폴더

const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
fs.writeFileSync(abiDest, JSON.stringify(artifact.abi, null, 2));
console.log('✅ ABI 복사 완료:', abiDest);
