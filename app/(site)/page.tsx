import { readdirSync } from "node:fs";
import { join } from "node:path";
import FilmStage from "@/components/FilmStage";
import LeadPanel from "@/components/LeadPanel";
import SiteSections from "@/components/SiteSections";
import { FILM, type MediaAvailability } from "@/content/film";

// Наличие медиафайлов проверяется на сервере: сцена без файлов не рендерит
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
  const media: MediaAvailability = {};
  for (const act of FILM) {
    for (const scene of act.scenes) {
      const mp4 = scene.videoSrc.split("/").pop() ?? "";
      const poster = scene.posterSrc.split("/").pop() ?? "";
      media[scene.id] = {
        mp4: videos.has(mp4),
        webm: videos.has(mp4.replace(/\.mp4$/, ".webm")),
        poster: posters.has(poster),
      };
    }
  }
  return media;
}

// Выполняется при парсинге SSR-разметки, до гидрации: выставляет opacity и
// transform по уже восстановленной позиции скролла, чтобы перезагрузка в середине
// фильма не показывала пролог. Firefox/Safari восстанавливают скролл после load,
// поэтому расчёт повторяется по одноразовому scroll-слушателю, который снимает
// себя, как только rAF-цикл FilmStage берёт управление (атрибут data-film-live).
// Дублирует формулы осей из FilmStage — синхронизировать. Вставлен через
// dangerouslySetInnerHTML обёртки: React не рендерит сам <script>-элемент
// (иначе dev-ворнинг), а браузер исполняет его из SSR-разметки при парсинге.
const preHydration = `(function(){
var w=document.querySelector('[data-film-total]');if(!w)return;
var rm=false;try{rm=matchMedia('(prefers-reduced-motion: reduce)').matches}catch(_){}
function c(v){return Math.min(1,Math.max(0,v))}
function A(){
if(!w.isConnected||w.getAttribute('data-film-live')){removeEventListener('scroll',A);return}
var u=w.offsetHeight/+w.getAttribute('data-film-total');if(!u)return;
var y=Math.max(0,window.scrollY)/u;
var els=w.querySelectorAll('[data-seg]');
var n=els.length,p=n,i,s,l;
for(i=0;i<n;i++){s=+els[i].getAttribute('data-start-vh');l=+els[i].getAttribute('data-len-vh');
if(y<s+l){p=i+Math.max(0,y-s)/l;break;}}
for(i=0;i<n;i++){var e=els[i],d=p-i,k=e.getAttribute('data-seg'),a=e.getAttribute('data-axis');
var hf=+(e.getAttribute('data-hold-from')||0),ht=+(e.getAttribute('data-hold-to')||0);
var da=d<hf?d-hf:d>ht?d-ht:0;
var o=0,t='',b=0;
if(k==='card'){o=c(Math.min(1+d/0.35,(1-d)/0.5));}
else if(a==='fall'){o=c(1-Math.abs(da)*1.35);t='scale('+(1+da*0.46)+')';b=(1-o)*7;}
else if(a==='lateral'){o=c(1-Math.abs(da)*1.1);t='translateX('+(-da*100)+'vw) scale(1.04)';}
else if(a==='rise'){o=c(1-Math.abs(da)*1.35);t='translateY('+(da*26)+'vh) scale('+(1-da*0.18)+')';b=(1-o)*5;}
else{o=c(1-Math.abs(da)*1.9);t='scale('+(1+da*0.06)+')';}
if(k==='scene'&&!rm&&d>-1.5&&d<ht+1.5){var v=e.querySelector('video');if(v)v.setAttribute('preload','auto');}
var cp=e.nextElementSibling;
if(cp&&cp.hasAttribute&&cp.hasAttribute('data-scene-copy')){
var co,cs;
if(ht>hf){co=c(Math.min((d-hf-0.04)/0.12,(ht-0.14-d)/0.12));cs=0;}
else{co=c(1-Math.abs(da)*2.1);cs=da*-34;}
cp.style.opacity=co;
cp.style.visibility=co<=0?'hidden':'visible';
cp.style.transform='translateY('+cs+'px)';}
if(o<=0){e.style.opacity='0';e.style.visibility='hidden';e.style.filter='';continue}
e.style.opacity=o;e.style.visibility='visible';e.style.transform=t;
e.style.filter=(o>=0.15&&b>0.05)?'blur('+b.toFixed(2)+'px)':'';}
var bd=w.querySelector('[data-film-backdrop]'),f=+w.getAttribute('data-white-from'),g=+w.getAttribute('data-white-to');
if(bd&&f>=0){bd.style.opacity=c(Math.min((p-(f+0.2))/0.3,(g+0.5-p)/0.3));}
var ch=document.querySelector('.chrome');
if(ch){ch.classList[(f>=0&&p>=f-0.15&&p<g-0.2)?'add':'remove']('chrome-light');
ch.classList[(window.scrollY>60)?'add':'remove']('chrome-scrolled');}
}
A();
addEventListener('scroll',A,{passive:true});
})();`;

export default function Home() {
  const media = buildMediaAvailability();
  return (
    <>
      <FilmStage film={FILM} media={media} />
      <div
        dangerouslySetInnerHTML={{ __html: `<script>${preHydration}</script>` }}
      />
      <SiteSections />
      <LeadPanel />
    </>
  );
}
