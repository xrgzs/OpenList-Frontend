import{Aa as e,An as t,Ki as n,On as r,Qi as i,Sa as a,St as o,Ta as s,Xi as c,Zi as l,_a as u,aa as d,fa as f,ja as p,la as m,oa as h,ta as g,xa as _,yi as v}from"./store-17yOqYIP.js";import{S as y,U as b,_ as x,h as S,m as C,p as w}from"./tb-DqBnqqet.js";import{J as T,U as E}from"./media_api-CtfuIS3z.js";import{a as D,n as O,r as k}from"./OpenWithPlayer-DhvID01D.js";var A=d(`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:1200;min-width:200px;max-height:340px;overflow-y:auto;padding:5px;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,0.35)">`),j=d(`<div style=position:relative;display:inline-flex><style>
        .media-split-btn {
          appearance: none;
          -webkit-appearance: none;
          border: 0;
          margin: 0;
          background: transparent;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: none;
          outline: none;
        }
        .media-split-btn:hover,
        .media-split-btn:focus,
        .media-split-btn:active {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: none;
          outline: none;
        }
        .media-split-btn--main {
          gap: 8px;
          padding: 10px 18px;
        }
        .media-split-btn--caret {
          width: 26px;
          flex: 0 0 26px;
          padding: 0;
          border-left: 1px solid rgba(255, 255, 255, 0.22);
        }
      </style><div style=display:inline-flex;align-items:stretch;border-radius:8px;overflow:hidden;box-shadow:none><button class="media-split-btn media-split-btn--main"></button><button class="media-split-btn media-split-btn--caret"aria-label=选择播放器 title=选择播放器>`),M=d(`<span style=font-size:10px;opacity:0.8>（不支持）`),N=d(`<button style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border:none;border-radius:7px;font-size:13px;text-align:left"><span style=flex:1>`),P=`media-play-target`,F=e=>{switch(e){case`browser`:return C;case`vlc`:return w;case`emby`:return y;default:return b}},I=c=>{let{colorMode:d}=v(),y=_(()=>d()===`dark`),b=()=>O(o()),C=(()=>{try{return localStorage.getItem(P)??`browser`}catch{return`browser`}})(),w=()=>[{id:`browser`,name:`浏览器播放`,browser:!0,disabled:!!c.browserUnsupported},...b().map(e=>({id:e.id,name:e.name,browser:!1,disabled:!1}))],[I,L]=s((e=>w().some(t=>t.id===e&&!t.disabled))(C)?C:w().find(e=>!e.browser&&!e.disabled)?.id??(c.browserUnsupported?``:`browser`)),[R,z]=s(!1),[B,V]=s(null),[H,U]=s(null),W=null,G,K=()=>b().find(e=>e.id===I()),q=()=>I()?I()===`browser`?c.browserUnsupported?`选择播放器`:`浏览器播放`:`播放器播放`:`选择播放器`,J=async()=>{if(c.path){let e=await E({path:c.path});return e.code!==200||!e.data?(r.error(e.message||`获取直链失败`),null):T(e.data.url)}if(!c.itemId)return r.error(`缺少媒体信息`),null;let e=await E({id:c.itemId,episode:c.episode});return e.code!==200||!e.data?(r.error(e.message||`获取直链失败`),null):T(e.data.url)},Y=async()=>{if(H())return H();try{let e=await(await fetch(`${t}/@emby/System/Info/Public`)).json();if(e?.Id)return U(String(e.Id)),String(e.Id)}catch{}return null},X=()=>{I()===`browser`||W||(W=I()===`emby`?Y().finally(()=>{W=null}):J().then(e=>(e&&V(e),e)).finally(()=>{W=null}))},Z=(e,t,n,r)=>{window.location.href=k(e,{durl:t,name:c.name??`media`,serverId:n,itemId:r})},Q=async()=>{if(I()===`browser`){if(c.browserUnsupported){r.error(c.unsupportedHint||`该文件无法在浏览器内播放，请选择本地播放器`),z(!0);return}c.onBrowserPlay();return}let e=K();if(!e){if(c.browserUnsupported){r.error(c.unsupportedHint||`没有可用的本地播放器，请先下载该文件`),z(!0);return}c.onBrowserPlay();return}if(e.id===`emby`){if(!c.itemId){r.error(`缺少媒体信息`);return}let t=H();if(t){Z(e.scheme,``,t,c.itemId);return}let n=await Y();if(!n){r.error(`无法获取 Emby 服务器 ID`);return}Z(e.scheme,``,n,c.itemId);return}let t=B();if(t){Z(e.scheme,t);return}let n=await J();n&&(V(n),Z(e.scheme,n))},$=e=>{let t=w().find(t=>t.id===e);if(!t||t.disabled)r.error(c.unsupportedHint||`该文件无法在浏览器内播放，请选择本地播放器`);else{L(e),V(null),z(!1);try{localStorage.setItem(P,e)}catch{}}};return p(()=>{let t=e=>{G&&!G.contains(e.target)&&z(!1)};document.addEventListener(`click`,t),e(()=>document.removeEventListener(`click`,t))}),(()=>{var e=j(),t=e.firstChild.nextSibling,r=t.firstChild,o=r.nextSibling,s=G;return typeof s==`function`?h(s,e):G=e,r.addEventListener(`focus`,X),r.addEventListener(`mouseenter`,X),r.$$click=Q,l(r,u(n,{get component(){return F(I())},size:17}),null),l(r,q,null),o.$$click=e=>{e.stopPropagation(),z(!R())},l(o,u(x,{size:15})),l(e,u(f,{get when(){return R()},get children(){var e=A();return l(e,u(m,{get each(){return w()},children:e=>(()=>{var t=N(),r=t.firstChild;return t.$$click=()=>$(e.id),l(t,u(n,{get component(){return F(e.id)},size:15}),r),l(r,()=>e.name),l(t,u(f,{get when(){return e.disabled},get children(){return M()}}),null),l(t,u(f,{get when(){return i(()=>I()===e.id)()&&!e.disabled},get children(){return u(S,{size:14})}}),null),a(n=>{var r=I()===e.id?y()?`rgba(255,255,255,0.08)`:`rgba(0,0,0,0.05)`:`transparent`,i=y()?`#e2e8f0`:`#1e293b`,a=e.disabled?`not-allowed`:`pointer`,o=e.disabled?.45:1;return r!==n.e&&g(t,`background`,n.e=r),i!==n.t&&g(t,`color`,n.t=i),a!==n.a&&g(t,`cursor`,n.a=a),o!==n.o&&g(t,`opacity`,n.o=o),n},{e:void 0,t:void 0,a:void 0,o:void 0}),t})()})),a(t=>{var n=y()?`rgba(20,26,40,0.98)`:`#fff`,r=`1px solid ${y()?`rgba(255,255,255,0.1)`:`rgba(0,0,0,0.08)`}`;return n!==t.e&&g(e,`background`,t.e=n),r!==t.t&&g(e,`border`,t.t=r),t},{e:void 0,t:void 0}),e}}),null),a(e=>g(t,`background`,D())),e})()};c([`click`]);export{I as t};