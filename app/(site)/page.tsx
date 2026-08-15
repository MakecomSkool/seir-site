import FilmStage from "@/components/FilmStage";
import { FADE_VH, FILM, totalScrollVh } from "@/content/film";

// Выполняется при парсинге SSR-разметки, до гидрации: выставляет opacity по уже
// восстановленной позиции скролла, чтобы перезагрузка в середине фильма не
// показывала пролог. Дублирует формулу applyScroll из FilmStage.
const preHydration = `(function(){var w=document.querySelector('[data-film-total]');if(!w)return;var u=w.offsetHeight/${totalScrollVh(FILM)};if(!u)return;var y=Math.max(0,window.scrollY)/u;var els=w.querySelectorAll('[data-start-vh]');for(var i=0;i<els.length;i++){var o=Math.min(1,Math.max(0,1+(y-+els[i].getAttribute('data-start-vh'))/${FADE_VH}));els[i].style.opacity=o;els[i].style.visibility=o===0?'hidden':'visible';}})();`;

export default function Home() {
  return (
    <>
      <FilmStage film={FILM} />
      <script dangerouslySetInnerHTML={{ __html: preHydration }} />
    </>
  );
}
