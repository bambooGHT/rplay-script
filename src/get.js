import { userData } from "./data";

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
 * @returns {import("./types").VideoUrls}
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

/**
 * @param { string } s3Key 
 * @returns { string }
 */
export const getM3u8Url = (s3Key) => {
  const [type, num, hash] = s3Key.split("/");
  return `https://api.rplay.live/content/hlsstream?s3key=kr/${type}/${num}/${hash}/${hash}.m3u8&token=${userData.token}&userOid=${userData.oid}&contentOid=6515cda280c7fc6b98065cbe&loginType=plax&abr=false`;
};

export const getContentData = async (contentId) => {
  const url = `https://api.rplay.live/content?contentOid=${contentId}&status=published&withComments=true&withContentMetadata=false&requestCanView=true&lang=jp&requestorOid=${userData.oid}&loginType=plax`;
  const data = await (await fetch(url)).json();
  const { title, subtitles, modified, streamables } = data;
  const title1 = Object.values(subtitles || {});
  const { s3key } = streamables[0];
  const { m3u8Data, urls } = await getm3u8data(s3key);

  return {
    title: formatTitle((title1[title1.length - 1] || title), modified),
    url: urls[urls.length - 1].url,
    m3u8Data
  };
};

export const getm3u8data = async (s3Key) => {
  const m3u8Data = await (await fetch(getM3u8Url(s3Key))).text();
  const urls = getResolutionUrls(m3u8Data);
  return { m3u8Data, urls };
};

export const formatTitle = (title, modified) => {
  if (modified) modified = `[${modified.slice(0, 10)}]`;
  return `${modified} ${title.replaceAll(":", ".")}.ts`.replace(/[<>/\\? \*]/g, "");
};