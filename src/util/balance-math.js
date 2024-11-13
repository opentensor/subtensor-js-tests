import BigNumber from "bignumber.js";

const weiPerEther = new BigNumber("1000000000000000000"); // 10^18
const raoPerTao = new BigNumber("1000000000"); // 10^9

// Convert Ether to Wei
export function convertEtherToWei(ether) {
  return new BigNumber(ether).multipliedBy(weiPerEther);
}

// Convert Wei to Ether
export function convertWeiToEther(wei) {
  return new BigNumber(wei).dividedBy(weiPerEther);
}

// Convert TAO to Rao
export function convertTaoToRao(tao) {
  return new BigNumber(tao).multipliedBy(raoPerTao);
}

// Convert Rao to TAO
export function convertRaoToTao(rao) {
  return new BigNumber(rao).dividedBy(raoPerTao);
}
