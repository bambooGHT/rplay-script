export const createDomBox = () => {
  const domBox = document.createElement("div");
  domBox.style.width = "100%";
  domBox.style.paddingTop = "5px";
  return domBox;
};

export const createButtonEl = (title: string) => {
  const tempEl = `
  <div class="plax-button cursor-pointer select-none px-4 py-2 hover:opacity-75 mr-2 h-8 whitespace-nowrap px-4 text-md  bg-plaxgray-170 text-plaxgray-90" data-v-55e34760="" style="border-radius: 6px;">
     ${title}
  </div>
  `;
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = tempEl;
  const DOM = tempDiv.children[0] as HTMLDivElement;
  DOM.style.userSelect = "none";
  DOM.style.width = "min-content";
  DOM.style.margin = "5px 6px 5px 0";
  return DOM;
};

export const createEl = (value: string) => {
  const dom = createButtonEl(value);
  dom.classList.remove("cursor-pointer");
  dom.classList.remove("hover:opacity-75");
  return dom;
};


export const createDownloadProgressEl = (value: string) => {
  const dom = createEl(value);
  dom.id = "downloadProgress";
  return dom;
};

export const createCheckbox = () => {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.classList.add("checkbox-input");
  return checkbox;
};

export const createDownloadElement = () => {
  const domBox = createDomBox();
  const domRow1 = document.createElement("div");

  const downButton = createButtonEl("筛选下载");
  const selectAllButton = createButtonEl("全选(反选)");
  const filterEl = createEl("0 / 0");

  domBox.style.paddingBottom = "5px";
  domRow1.style.display = "flex";
  domRow1.append(downButton, selectAllButton, filterEl);
  domBox.appendChild(domRow1);

  return { domBox, downButton, selectAllButton, filterEl };
};