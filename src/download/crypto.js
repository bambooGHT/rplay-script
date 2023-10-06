import { CryptoJS } from '../package';
/** 解密
 * @param {ArrayBuffer} m3u8Data 
 * @param {ArrayBuffer} key 
 * @requires Uint8Array
 */
export const decrypt = (m3u8Data, key) => {
  const { lib, mode, pad, AES } = CryptoJS;

  const encryptedData = new Uint8Array(m3u8Data);
  const ciphertext = lib.WordArray.create(encryptedData);
  const Key = lib.WordArray.create(key);
  const ops = {
    iv: lib.WordArray.create(16),
    mode: mode.CBC,
    padding: pad.Pkcs7
  };
  const decrypted = AES.decrypt({ ciphertext }, Key, ops);

  return wordArrayToUint8Array(decrypted);
};
/**
 * @param {string[]} wordArray - url数组
 */
function wordArrayToUint8Array(wordArray) {
  const len = wordArray.sigBytes;
  const words = wordArray.words;
  const uint8Array = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    uint8Array[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return uint8Array;
}