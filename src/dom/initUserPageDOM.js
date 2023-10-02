import { createDivBox, createDOM, createInput } from "./createDOM";
import { download1, download2 } from "../download";
import { clacSize } from "../get";

/**
 * @param {string[]} contentIds 
 * @param {string} userName 
 */
export const initUserPageDOM = (contentIds, userName) => {
  const selectList = contentIds.map(p => {
    return {
      id: p,
      isDown: false,
      input: undefined
    };
  });
  selectList.reverse();
  const tipDom = createDivBox();
  const div = createDivBox();
  tipDom.id = "tipDom";
  addDOM(tipDom, div, selectList);

  let isCheck = true;
  let isDown = false;
  tipDom.appendChild(createDOM("勾选后点下载,默认为最高画质"));
  tipDom.appendChild(createDOM("全部勾选/取消勾选", () => {
    selectList.forEach((p) => {
      p.isDown = isCheck;
      p.input.checked = isCheck;
    });
    isCheck = !isCheck;
  }));

  const down = async (downloadType) => {
    if (isDown) {
      alert("已经在下载中");
      return;
    }
    isDown = true;

    const isList = selectList.filter((p) => p.isDown);
    if (!isList.length) {
      alert("未选择视频");
      return;
    }
    const { fun, remove } = createProgressDOM(isList.length);
    try {
      if (downloadType === 1) {
        await download1(isList, "", fun);
      } else {
        await download2(isList, `${userName}.zip`, fun);
      }
      isDown = false;
    } catch (error) {
      console.log(error);
      remove(3000);
    }
  };

  div.appendChild(createDOM("下载1 (会跳过已下载的文件)", () => {
    down(1);
  }));

  div.appendChild(createDOM("下载2 (压缩包)", () => {
    down(2);
  }));
};

const addDOM = (tipDom, dom, selectList) => {
  const publishedContentDOM = [...document.querySelectorAll(".min-h-screen")];
  /** @type {HTMLDivElement} */
  const DOM = publishedContentDOM[publishedContentDOM.length - 1].firstChild.firstChild;
  const listDOM = DOM.children[1]?.children[1];
  const firstDOM = DOM.children[1];

  if (DOM.nodeName !== "DIV") {
    setTimeout(() => {
      addDOM(tipDom, dom, selectList);
    }, 250);
    return;
  }

  DOM.insertBefore(tipDom, firstDOM);
  DOM.insertBefore(dom, firstDOM);

  listAddCheck([...listDOM.children], selectList);
};
/** 
 * @param {HTMLDivElement[]} listDOM
 * @param {{isDown:boolean; id:number; input:HTMLInputElement}[]} selectList
 */
const listAddCheck = (listDOM, selectList) => {
  listDOM.forEach((dom, index) => {
    const input = createInput("checkbox");
    input.onchange = () => { selectList[index].isDown = input.checked; };
    selectList[index].input = input;
    dom.appendChild(input);
  });
};


const createProgressDOM = (len) => {
  const DOM = document.getElementById("tipDom");
  const div = createDOM("");
  DOM.appendChild(div);

  const remove = (time = 5500) => {
    setTimeout(() => {
      DOM.removeChild(div);
    }, time);
  };

  let i = 0;
  let size = 0;

  div.innerHTML = `下载中 ${0} / ${len} (0)`;

  return {
    fun: () => {

      const updateProgress = (value) => {
        size += value;
        div.innerHTML = `下载中 ${i} / ${len} (${clacSize(size)})`;
      };

      const updateIndex = () => {
        i += 1;
        updateProgress(0);
      };

      const skip = () => {
        --i;
        --len;
      };

      const downloaded = () => {
        div.innerHTML = `下载完成 ${i} / ${len} (${clacSize(size)})`;
        remove();
      };

      const err = () => {
        div.innerHTML = `下载失败!`;
        remove();
      };

      return {
        updateProgress, end: () => { }, skip, downloaded, updateIndex, err
      };
    },
    remove
  };
};