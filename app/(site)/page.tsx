import { readdirSync } from "node:fs";
import { join } from "node:path";
import FilmStage from "@/components/FilmStage";
import LeadPanel from "@/components/LeadPanel";
import Loader from "@/components/Loader";
import SiteSections from "@/components/SiteSections";
import { SEGMENTS, type MediaAvailability } from "@/content/film";

// Наличие медиафайлов проверяется на сервере: сегмент без файлов не рендерит
// <video> и не делает ни одного сетевого запроса — остаётся градиент-заглушка.
// В dev файл, положенный в public/video/, подхватывается перезагрузкой
// страницы; в production наличие фиксируется на момент next build.
function listPublicDir(dir: string): Set<string> {
  try {
    return new Set(readdirSync(join(process.cwd(), "public", dir)));
  } catch {
    return new Set();
  }
}

function buildMediaAvailability(): MediaAvailability {
  const videos = listPublicDir("video");
  const posters = listPublicDir("poster");
  const mobiles = listPublicDir("video/mobile");
  const media: MediaAvailability = {};
  for (const segment of SEGMENTS) {
    const mp4 = segment.videoSrc.split("/").pop() ?? "";
    const poster = segment.posterSrc.split("/").pop() ?? "";
    const mobile = segment.mobileSrc.split("/").pop() ?? "";
    media[segment.id] = {
      mp4: videos.has(mp4),
      poster: posters.has(poster),
      mobile: mobiles.has(mobile),
    };
  }
  return media;
}

// Выполняется при парсинге SSR-разметки, до гидрации. Правило продукта:
// перезагрузка и возврат на страницу всегда начинают фильм СВЕРХУ —
// scrollRestoration=manual плюс явный scrollTo(0,0) до первого кадра
// (возврат из bfcache обрабатывает pageshow в FilmStage). Остальная
// машинерия — страховка на случай, если браузер всё же навязал позицию:
// слои и тексты приводятся к ней без показа пролога. Firefox/Safari
// восстанавливают скролл после load, поэтому расчёт повторяется по
// одноразовому scroll-слушателю, который снимает себя, как только rAF-цикл
// FilmStage берёт управление (атрибут data-film-live). Дублирует формулы
// таймлайна из FilmStage — синхронизировать. Вставлен через
// dangerouslySetInnerHTML обёртки: React не рендерит сам <script>-элемент
// (иначе dev-ворнинг), а браузер исполняет его из SSR-разметки при парсинге.
const preHydration = `(function(){
try{history.scrollRestoration='manual'}catch(_){}
if(window.scrollY>0)window.scrollTo(0,0);
var w=document.querySelector('[data-film-total]');if(!w)return;
var rm=false;try{rm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){}
function c(v){return Math.min(1,Math.max(0,v))}
function A(){
if(!w.isConnected||w.getAttribute('data-film-live')){removeEventListener('scroll',A);return}
var st=w.firstElementChild;if(!st)return;
var total=+w.getAttribute('data-film-total');
var unit=(w.offsetHeight-st.offsetHeight)/total;if(!unit)return;
var pos=Math.max(0,Math.min(total,window.scrollY/unit));
var segs=w.querySelectorAll('[data-seg]');
var n=segs.length,act=n-1,t=0,i,e;
for(i=0;i<n;i++){e=segs[i];
var vs=+e.getAttribute('data-vh-start'),vl=+e.getAttribute('data-len-vh');
var ts=+e.getAttribute('data-t-start'),du=+e.getAttribute('data-duration');
t=ts+du;
if(pos<vs+vl){act=i;t=ts+Math.max(0,(pos-vs)/vl)*du;break}}
for(i=0;i<n;i++){e=segs[i];var on=i===act;
e.style.visibility=on?'visible':'hidden';e.style.opacity=on?'1':'0';
if(!rm&&i>=act-1&&i<=act+2){var v=e.querySelector('video');if(v)v.setAttribute('preload','auto')}}
var cps=document.querySelectorAll('[data-copy-block]');
for(i=0;i<cps.length;i++){var b=cps[i];
var f=+b.getAttribute('data-from-t'),g=+b.getAttribute('data-to-t');
var o=c(Math.min((t-f)/0.5,(g-t)/0.5));
b.style.opacity=o;b.style.visibility=o<=0?'hidden':'visible';
b.style.transform='translateY('+((1-o)*16).toFixed(1)+'px)';}
var ch=document.querySelector('.chrome');
if(ch){var lf=+w.getAttribute('data-light-from'),lt=+w.getAttribute('data-light-to');
ch.classList[(t>=lf&&t<lt)?'add':'remove']('chrome-light');
ch.classList[(window.scrollY>60)?'add':'remove']('chrome-scrolled');}
}
A();
addEventListener('scroll',A,{passive:true});
})();`;

export default function Home() {
  const media = buildMediaAvailability();
  return (
    <>
      <FilmStage media={media} />
      <div
        dangerouslySetInnerHTML={{ __html: `<script>${preHydration}</script>` }}
      />
      <SiteSections />
      <LeadPanel />
      <Loader />
    </>
  );
}
