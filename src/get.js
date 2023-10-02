/** @param {string} url */
export const getDownloadUrlListAndKey = async (url) => {
  const data = await (await fetch(url)).text();
  const key = await getKey(data);
  const urlList = data.replaceAll("\n", '').split(/#EXTINF:\d{1,3},/).slice(1);
  const urlListLast = urlList[urlList.length - 1];
  urlList[urlList.length - 1] = urlListLast.replace("#EXT-X-ENDLIST", '');
  return { urlList, key };
};

/**
 * @param {string} m3u8Data 
 * @returns {import("./download/types").videoUrls}
 */
export const getResolutionUrls = (m3u8Data) => {
  const urlArray = m3u8Data.split("\n").filter(s => s.includes("http")).slice(1);
  const RESOLUTIONS = m3u8Data.split("\n").filter(s => s.includes("RESOLUTION"));
  return RESOLUTIONS.reduce((result, p, index) => {
    const [resolution] = p.match(/(?<=RESOLUTION=).*?(?=,)/);
    result.push({
      resolution,
      url: urlArray[index]
    });
    return result;
  }, []);
};
/**
 * @param {string} m3u8Data 
 * @requires ArrayBuffer
 */
export const getKey = async (m3u8Data) => {
  const [url] = m3u8Data.match(/(?<=URI=")[^"]+(?=")/);
  return await (await fetch(url, {
    headers: {
      Age: String(Date.now()).slice(-4),
    }
  })).arrayBuffer();
};


export const clacSize = (size) => {
  const aMultiples = ['B', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
  const bye = 1024;

  if (size < bye) return size + aMultiples[0];
  let i = 0;

  for (var l = 0; l < 8; l++) {
    if (size / Math.pow(bye, l) < 1) break;
    i = l;
  }

  return `${(size / Math.pow(bye, i)).toFixed(2)}${aMultiples[i]}`;
};