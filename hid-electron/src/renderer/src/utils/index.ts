/** 等待 */
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 *
 * @param hexValue 返回的角度值转 0xE2-0xFF 表示（-30,-1）｜ 0x00-0x1E 表示 (0, 30)
 * @returns
 */
export function mapHexToRange(hexValue: number) {
  // 检查输入值是否在有效范围内
  if (hexValue >= 0xE2 && hexValue <= 0xFF) {
    // 映射 0xE2-0xFF 到 (-30, -1)
    return -30 + (hexValue - 0xE2);
  } else if (hexValue >= 0x00 && hexValue <= 0x1E) {
    // 映射 0x00-0x1E 到 (0, 30)
    return (hexValue / 0x1E) * 30;
  } else {
    throw new Error("输入值超出有效范围 (0x00-0x1E 或 0xE2-0xFF)");
  }
}

/**
 *
 * @param hexValue 转16进制返回角度值 0xE2-0xFF 表示（-30,-1）｜ 0x00-0x1E 表示 (0, 30)
 * @returns
 */
export function mapRangeToHex(degree: number) {
  // 检查输入值是否在有效范围内
  if (degree >= -30 && degree <= -1) {
    // 映射 (-30, -1) 到 0xE2-0xFF
    return 0xE2 + (degree + 30);
  } else if (degree >= 0 && degree <= 30) {
    // 映射 (0, 30) 到 0x00-0x1E
    return Math.round((degree / 30) * 0x1E);
  } else {
    throw new Error("输入值超出有效范围 (-30 到 -1 或 0 到 30)");
  }
}

/**
 * 获取一个数的 低8位 和 高8位
 * @param {number} num - 输入的整数
 * @returns {array} [低8位, 高8位]
 */
export function getLowAndHigh8Bits(num: number) {
  return [
    num & 0xFF,         // 提取低 8 位
    (num >> 8) & 0xFF  // 提取高 8 位
  ]
}

/**
 * 获取 低8位 和 高8位 的一个整数
 * @param {array} - 输入 低8位 和 高8位
 * @returns {number} num - 整数
 */
export function combineLowAndHigh8Bits(low8Bits: number, high8Bits: number): number {
  return (high8Bits << 8) | low8Bits;
}

export function insertAt9th(str: string, char: string) {
  if (str.length < 8) return str + char;
  return str.slice(0, 8) + char + str.slice(8);
}

export function removeAt9th(str: string) {
  if (str.length < 9) return str;
  return str.slice(0, 8) + str.slice(9);
}

export function jsonToBase64(jsonObj: object) {
  const jsonString = JSON.stringify(jsonObj);
  return btoa(unescape(encodeURIComponent(jsonString)));
}

export function base64ToJson(base64Str: string) {
  const jsonString = decodeURIComponent(escape(atob(base64Str)));
  return JSON.parse(jsonString);
}


/**
 *
 * @param base64
 * @returns 检查base64配置文件是否有效
 */
export function checkProfile(base64: string): Boolean {
  if (base64) {
    try {
      const profile = base64ToJson(base64)
      // @todo: check if profile is valid
      if (['Left', 'Right', 'Wheel', 'Forward', 'Back', 'dpi', 'angle_slider'].every(key => Object.keys(profile).includes(key))) {
        return profile
      }
    } catch (e) {}
  }
  return false
}

/**
 *
 * @param str 将字符串转换为 Uint8Array
 * @returns
 */
export function encodeStringToArrayBuffer(str: string) {
  const encoder = new TextEncoder();  // 创建 TextEncoder 实例
  return encoder.encode(str);  // 将字符串转换为 Uint8Array
}

/**
 *
 * @param arrayBuffer 将 Uint8Array 转换为字符串
 * @returns
 */
export function decodeArrayBufferToString(arrayBuffer: Uint8Array) {
  const decoder = new TextDecoder();  // 创建 TextDecoder 实例
  return decoder.decode(arrayBuffer);  // 解码 Uint8Array 为字符串
}


/**
 * 删除数组中的某一项，并返回被删除的项
 * @param arr
 * @param index
 * @returns
 */
export function removeItem<T>(arr: T[], index: number): T | undefined {
  if (index < 0 || index >= arr.length) {
      return undefined; // 索引超出范围时返回 undefined
  }
  return arr.splice(index, 1)[0]; // splice 返回一个数组，取第一个元素
}


export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
