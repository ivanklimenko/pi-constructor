/* ============================================================
   PR — промт подтверждения. Компонент дизайн-кита.

   PR.confirm({host, title, note, ok, cancel, tone}) -> Promise<bool>

   host — элемент, которому принадлежит вопрос (деталка). Затемнение
   накрывает только его прямоугольник; без host — всё окно.
   tone: 'neutral' (по умолчанию) фокус на главной кнопке,
         'danger' — красная главная, фокус на отмене.
   ============================================================ */
window.PR=(function(){

  function place(scrim,host){
    if(!host){scrim.style.inset='0';return}
    var r=host.getBoundingClientRect();
    scrim.style.left=r.left+'px';scrim.style.top=r.top+'px';
    scrim.style.width=r.width+'px';scrim.style.height=r.height+'px';
    scrim.style.right='auto';scrim.style.bottom='auto';
  }

  function confirm(o){
    o=o||{};
    return new Promise(function(resolve){
      var prev=document.activeElement,
          danger=o.tone==='danger',
          scrim=document.createElement('div');
      scrim.className='pr-scrim';
      scrim.innerHTML='<div class="pr'+(danger?' danger':'')+'" role="dialog" aria-modal="true" aria-labelledby="pr-t">'+
        '<h4 id="pr-t"></h4>'+(o.note?'<p class="note"></p>':'')+
        '<div class="acts">'+
          '<button type="button" data-pr="no"></button>'+
          '<button type="button" class="pri" data-pr="yes"></button>'+
        '</div></div>';
      var box=scrim.firstChild;
      box.querySelector('h4').textContent=o.title||'Подтвердите действие';
      if(o.note)box.querySelector('.note').innerHTML=o.note;   /* разметку «было → станет» готовит вызывающий */
      var no=box.querySelector('[data-pr="no"]'),yes=box.querySelector('[data-pr="yes"]');
      no.textContent=o.cancel||'Отмена';
      yes.textContent=o.ok||'Подтвердить';

      function close(v){
        window.removeEventListener('resize',reposition);
        window.removeEventListener('scroll',reposition,true);
        scrim.remove();
        if(prev&&prev.isConnected)prev.focus();          /* фокус возвращается туда, откуда позвали */
        resolve(v);
      }
      function reposition(){place(scrim,o.host)}

      scrim.addEventListener('click',function(e){
        var b=e.target.closest('[data-pr]');
        if(b){close(b.dataset.pr==='yes');return}
        if(e.target===scrim)close(false);               /* клик мимо окна — отказ */
      });
      scrim.addEventListener('keydown',function(e){
        /* клавиши не уходят наружу: Esc в промте не должен заодно
           закрывать деталку, над которой промт открыт */
        if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(false);return}
        if(e.key!=='Tab')return;
        e.stopPropagation();
        /* ловушка фокуса: по кругу между двумя кнопками */
        var f=[no,yes],i=f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i+(e.shiftKey?f.length-1:1))%f.length].focus();
      });

      document.body.appendChild(scrim);
      place(scrim,o.host);
      window.addEventListener('resize',reposition);
      window.addEventListener('scroll',reposition,true);
      (danger?no:yes).focus();
    });
  }

  return {confirm:confirm};
})();
