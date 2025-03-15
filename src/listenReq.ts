type Condition = {
  value: string | ((url: string) => boolean);
  callback: Function;
};

export const listenReq = (conditions: Condition[]) => {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url as string;
    originalOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function () {
    const { _url } = this;
    for (const item of conditions) {
      const is = typeof item.value === "string" ? _url.includes(item.value) : item.value(_url);
      if (is) {
        this.addEventListener('load', function () {
          item.callback(JSON.parse(this.response));
        });
        break;
      }
    }

    originalSend.apply(this, arguments as any);
  };
}; 