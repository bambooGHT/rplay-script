export const createDivBox = () => {
  const div = document.createElement("div");
  div.style.width = "100%";
  div.style.display = "flex";
  div.style.margin = "0.65rem 0";

  return div;
};
/**
  * @param {string} name 
  * @param {()=>void} fun 
  */
export const createDOM = (name, fun) => {
  const tempDOM = `
  <div
    class="plax-button cursor-pointer px-4 py-2 hover:opacity-75 mb-2 mr-2 h-8 whitespace-nowrap px-4 text-md  bg-plaxgray-170 text-plaxgray-90"
    style="border-radius: 6px; margin:0 8px 0 0;">
    ${name}
  </div>`;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = tempDOM;
  /** @type {HTMLDivElement} */
  const DOM = tempDiv.children[0];
  DOM.style.userSelect = "none";
  DOM.onclick = fun;
  
  return DOM;
};
/**
 * @param {import("../types").VideoUrls} urls
 * @param {number} selectIndex
 * @param {()=>void} fun
 */
export const createSelectDOM = (urls, selectIndex, fun) => {
  const select = document.createElement("select");
  select.style.backgroundColor = "rgba(31,31,35,var(--tw-bg-opacity))";
  select.style.height = "32px";
  select.style.outline = "0";
  select.style.margin = "0 8px 0 0";
  select.style.cursor = "pointer";

  select.innerHTML = urls.reduce((result, value, index) => {
    const [left, right] = value.resolution.split("x");
    result += `<option value="${index}" ${index === selectIndex ? "selected" : ""}>
      ${right}p
    </option>`;
    return result;
  }, "");
  select.onchange = fun;

  return select;
};

/**
 * 
 * @param {string} type 
 * @returns {HTMLInputElement}
 */
export const createInput = (type) => {
  const input = document.createElement("input");
  input.type = type;
  input.style.position = "absolute";
  input.style.width = "20px";
  input.style.height = "20px";
  input.style.top = "0";
  input.style.left = "0";
  input.style.margin = "7px 7px";
  input.style.zIndex = "99999";

  return input;
};