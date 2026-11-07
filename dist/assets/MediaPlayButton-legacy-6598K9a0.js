(function(){System.register([`./store-legacy-gXFAoIWT.js`,`./tb-legacy-D3sEWR-W.js`,`./media_api-legacy-CdaZct3h.js`,`./OpenWithPlayer-legacy-CsLJ0DqJ.js`],function(e,t){var n,r,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v,y,b,x,S,C,w,T,E,D,O,k,A,j,M,N,P,F,I,L;return{setters:[function(e){n=e.Aa,r=e.An,i=e.Ki,a=e.On,o=e.Qi,s=e.Sa,c=e.St,l=e.Ta,u=e.Xi,d=e.Zi,f=e._a,p=e.aa,m=e.fa,h=e.ja,g=e.la,_=e.oa,v=e.ta,y=e.xa,b=e.yi},function(e){x=e.S,S=e.U,C=e._,w=e.h,T=e.m,E=e.p},function(e){D=e.J,O=e.U},function(e){k=e.a,A=e.n,j=e.r}],execute:function(){M=p(`<div style="position:absolute;top:calc(100% + 6px);left:0;z-index:1200;min-width:200px;max-height:340px;overflow-y:auto;padding:5px;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,0.35)">`),N=p(`<div style=position:relative;display:inline-flex><style>
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
      </style><div style=display:inline-flex;align-items:stretch;border-radius:8px;overflow:hidden;box-shadow:none><button class="media-split-btn media-split-btn--main"></button><button class="media-split-btn media-split-btn--caret"aria-label=选择播放器 title=选择播放器>`),P=p(`<span style=font-size:10px;opacity:0.8>（不支持）`),F=p(`<button style="width:100%;display:flex;align-items:center;gap:8px;padding:8px 10px;border:none;border-radius:7px;font-size:13px;text-align:left"><span style=flex:1>`),I=`media-play-target`,L=e=>{switch(e){case`browser`:return T;case`vlc`:return E;case`emby`:return x;default:return S}},e(`t`,e=>{let{colorMode:t}=b(),u=y(()=>t()===`dark`),p=()=>A(c()),x=(()=>{try{return localStorage.getItem(I)??`browser`}catch{return`browser`}})(),S=()=>[{id:`browser`,name:`浏览器播放`,browser:!0,disabled:!!e.browserUnsupported},...p().map(e=>({id:e.id,name:e.name,browser:!1,disabled:!1}))],[T,E]=l((e=>S().some(t=>t.id===e&&!t.disabled))(x)?x:S().find(e=>!e.browser&&!e.disabled)?.id??(e.browserUnsupported?``:`browser`)),[R,z]=l(!1),[B,V]=l(null),[H,U]=l(null),W=null,G,K=()=>p().find(e=>e.id===T()),q=()=>T()?T()===`browser`?e.browserUnsupported?`选择播放器`:`浏览器播放`:`播放器播放`:`选择播放器`,J=async()=>{if(e.path){let t=await O({path:e.path});return t.code!==200||!t.data?(a.error(t.message||`获取直链失败`),null):D(t.data.url)}if(!e.itemId)return a.error(`缺少媒体信息`),null;let t=await O({id:e.itemId,episode:e.episode});return t.code!==200||!t.data?(a.error(t.message||`获取直链失败`),null):D(t.data.url)},Y=async()=>{if(H())return H();try{let e=await(await fetch(`${r}/@emby/System/Info/Public`)).json();if(e?.Id)return U(String(e.Id)),String(e.Id)}catch{}return null},X=()=>{T()===`browser`||W||(W=T()===`emby`?Y().finally(()=>{W=null}):J().then(e=>(e&&V(e),e)).finally(()=>{W=null}))},Z=(t,n,r,i)=>{window.location.href=j(t,{durl:n,name:e.name??`media`,serverId:r,itemId:i})},Q=async()=>{if(T()===`browser`){if(e.browserUnsupported){a.error(e.unsupportedHint||`该文件无法在浏览器内播放，请选择本地播放器`),z(!0);return}e.onBrowserPlay();return}let t=K();if(!t){if(e.browserUnsupported){a.error(e.unsupportedHint||`没有可用的本地播放器，请先下载该文件`),z(!0);return}e.onBrowserPlay();return}if(t.id===`emby`){if(!e.itemId){a.error(`缺少媒体信息`);return}let n=H();if(n){Z(t.scheme,``,n,e.itemId);return}let r=await Y();if(!r){a.error(`无法获取 Emby 服务器 ID`);return}Z(t.scheme,``,r,e.itemId);return}let n=B();if(n){Z(t.scheme,n);return}let r=await J();r&&(V(r),Z(t.scheme,r))},$=t=>{let n=S().find(e=>e.id===t);if(!n||n.disabled)a.error(e.unsupportedHint||`该文件无法在浏览器内播放，请选择本地播放器`);else{E(t),V(null),z(!1);try{localStorage.setItem(I,t)}catch{}}};return h(()=>{let e=e=>{G&&!G.contains(e.target)&&z(!1)};document.addEventListener(`click`,e),n(()=>document.removeEventListener(`click`,e))}),(()=>{var e=N(),t=e.firstChild.nextSibling,n=t.firstChild,r=n.nextSibling,a=G;return typeof a==`function`?_(a,e):G=e,n.addEventListener(`focus`,X),n.addEventListener(`mouseenter`,X),n.$$click=Q,d(n,f(i,{get component(){return L(T())},size:17}),null),d(n,q,null),r.$$click=e=>{e.stopPropagation(),z(!R())},d(r,f(C,{size:15})),d(e,f(m,{get when(){return R()},get children(){var e=M();return d(e,f(g,{get each(){return S()},children:e=>(()=>{var t=F(),n=t.firstChild;return t.$$click=()=>$(e.id),d(t,f(i,{get component(){return L(e.id)},size:15}),n),d(n,()=>e.name),d(t,f(m,{get when(){return e.disabled},get children(){return P()}}),null),d(t,f(m,{get when(){return o(()=>T()===e.id)()&&!e.disabled},get children(){return f(w,{size:14})}}),null),s(n=>{var r=T()===e.id?u()?`rgba(255,255,255,0.08)`:`rgba(0,0,0,0.05)`:`transparent`,i=u()?`#e2e8f0`:`#1e293b`,a=e.disabled?`not-allowed`:`pointer`,o=e.disabled?.45:1;return r!==n.e&&v(t,`background`,n.e=r),i!==n.t&&v(t,`color`,n.t=i),a!==n.a&&v(t,`cursor`,n.a=a),o!==n.o&&v(t,`opacity`,n.o=o),n},{e:void 0,t:void 0,a:void 0,o:void 0}),t})()})),s(t=>{var n=u()?`rgba(20,26,40,0.98)`:`#fff`,r=`1px solid ${u()?`rgba(255,255,255,0.1)`:`rgba(0,0,0,0.08)`}`;return n!==t.e&&v(e,`background`,t.e=n),r!==t.t&&v(e,`border`,t.t=r),t},{e:void 0,t:void 0}),e}}),null),s(e=>v(t,`background`,k())),e})()}),u([`click`])}}})})();