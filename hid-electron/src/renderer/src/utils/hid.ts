const packetSize = 64;

function checkSum(data: number[]) {
  const checksum_v = data.reduce((accumulator, currentValue) => accumulator + currentValue, 0);
  return checksum_v & 0xFF;
}


export function generateHidSendData(data: number[]) {
  const fillLength = packetSize - data.length - 1
  const checksum = checkSum(data)
  return[...data, ...(Array.from({ length: fillLength }, () => 0)), checksum]
}
