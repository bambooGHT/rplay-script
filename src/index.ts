import { listenReq, listenReqAtFetch } from "./listenReq";
import { creatorhomePage } from "./pageElement/creatorhomePage";
import { playPage } from "./pageElement/playPage";
import { purchasePage } from "./pageElement/purchasePage";

const initScript = () => {
  const scriptList = [
    "https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"
  ];

  scriptList.forEach((p) => {
    const script = document.createElement("script");
    script.setAttribute('type', 'text/javascript');
    script.src = p;
    document.body.appendChild(script);
  });
};

const initCss = () => {
  const style = document.createElement("style");
  style.textContent = `
  .video-item1 {
    position: relative;
  }

  .checkbox-input {
    position: absolute;
    width: 20px;
    height: 20px;
    top: 0;
    left: 0;
    margin: 7px 7px;
    z-index: 101;
  }
`;
  document.head.appendChild(style);
};

initScript();
initCss();

window.userData = (() => {
  const { AccountModule: data } = JSON.parse(localStorage.getItem("vuex") || `{}`);
  if (!data.token) {
    alert("需要登录账号,登录后刷新页面");
    throw new Error("需要登录账号,登录后刷新页面");
  }
  const { userInfo: { oid }, token } = data;
  return {
    oid,
    token
  };
})();

listenReq([
  { value: "content?contentOid", callback: playPage },
  {
    value: (url) => {
      return url.includes("getuser?userOid") && url.split("?")[1].split("&")[0].split("=")[1] !== userData.oid;
    },
    callback: creatorhomePage
  },
]);
listenReqAtFetch([
  { value: "bulk?requestFormQueue", callback: purchasePage }
]);