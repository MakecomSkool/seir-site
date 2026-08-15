import FilmStage from "@/components/FilmStage";
import { FILM } from "@/content/film";

// Выполняется при парсинге SSR-разметки, до гидрации: выставляет opacity и
// transform по уже восстановленной позиции скролла, чтобы перезагрузка в середине
// фильма не показывала пролог. Firefox/Safari восстанавливают скролл после load,
// поэтому расчёт повторяется по одноразовому scroll-слушателю, который снимает
// себя, как только rAF-цикл FilmStage берёт управление (атрибут data-film-live).
// Дублирует формулы осей из FilmStage — синхронизировать.
const preHydration = `(function(){
var w=document.querySelector('[data-film-total]');if(!w)return;
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
var o=0,t='',b=0;
if(k==='card'){o=c(Math.min(1+d/0.35,(1-d)/0.5));}
else if(a==='fall'){o=c(1-Math.abs(d)*1.35);t='scale('+(1+d*0.46)+')';b=(1-o)*7;}
else if(a==='lateral'){o=c(1-Math.abs(d)*1.1);t='translateX('+(-d*100)+'vw) scale(1.04)';}
else if(a==='rise'){o=c(1-Math.abs(d)*1.35);t='translateY('+(d*26)+'vh) scale('+(1-d*0.18)+')';b=(1-o)*5;}
else{o=c(1-Math.abs(d)*1.9);t='scale('+(1+d*0.06)+')';}
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
  return (
    <>
      <FilmStage film={FILM} />
      <script dangerouslySetInnerHTML={{ __html: preHydration }} />
    </>
  );
}
