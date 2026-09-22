/* ============================================================
   SK — состояния загрузки. Примитивы и правила показа.
   Геометрию конкретного экрана описывает сам экран: SK даёт
   плашки и пороги, а не знание о том, как устроен грид.
   ============================================================ */
window.SK=(function(){

  /* плашка заданной ширины: w — любая CSS-длина ('70%', '48px') */
  function sk(w,h,cls){
    return '<span class="sk'+(cls?' '+cls:'')+'" style="width:'+w+(h?';height:'+h:'')+'"></span>';
  }
  /* колонка из нескольких плашек — под многострочную ячейку */
  function stack(){
    var a=[].slice.call(arguments);
    return '<span class="sk-stack">'+a.map(function(w){return sk(w)}).join('')+'</span>';
  }
  function line(){
    var a=[].slice.call(arguments);
    return '<span class="sk-line">'+a.map(function(w){return sk(w)}).join('')+'</span>';
  }
  function dot(d){return sk(d||'16px',d||'16px','dot')}

  /* плашка в строчном боксе заданной высоты: box — высота строки текста,
     которую плашка замещает (17px основная строка, 15px вторичная) */
  function ln(w,h,box){
    return '<span class="sk-ln" style="height:'+(box||17)+'px">'+sk(w,(h||11)+'px')+'</span>';
  }
  /* колонка из строчных боксов — многострочная ячейка */
  function col(){return '<span class="sk-col">'+[].slice.call(arguments).join('')+'</span>'}

  /* неопределённый прогресс — когда данные уже на экране и обновляются */
  function bar(){return '<div class="skbar" role="progressbar" aria-label="Загрузка"><i></i></div>'}

  function spin(){return '<span class="skspin" aria-hidden="true"></span>'}

  /* содержимое вкладки drawer: заголовок + список строк */
  function tabBody(rows){
    var n=rows||4,out='<div style="padding:10px 2px" aria-busy="true">'+sk('120px','12px')+
      '<div style="height:10px"></div>';
    for(var i=0;i<n;i++){
      out+='<div style="display:grid;grid-template-columns:18px 1fr auto;gap:8px;align-items:center;padding:7px 0;'+
           'border-bottom:1px solid var(--line2)">'+dot('14px')+
           stack((62+((i*13)%26))+'%','40%')+sk('58px','10px')+'</div>';
    }
    return out+'</div>';
  }

  /* «дольше обычного» — подставляется поверх скелетона после 3 с */
  function late(text){return '<div class="sk-late">'+spin()+(text||'Ещё загружается')+'</div>'}

  function empty(text,btn){
    return '<div class="sk-empty"><b>'+(text||'Ничего не найдено')+'</b>'+
      '<span>Измените условия отбора или сбросьте фильтр</span>'+
      (btn?'<button type="button" data-sk="reset">'+btn+'</button>':'')+'</div>';
  }
  function error(text,btn){
    return '<div class="sk-error"><b>'+(text||'Не удалось загрузить данные')+'</b>'+
      '<span>Проверьте соединение и повторите запрос</span>'+
      (btn?'<button type="button" data-sk="retry">'+btn+'</button>':'')+'</div>';
  }

  /* ------------------------------------------------------------
     Пороги. Без них при задержке 0.3–1 с скелетон мигает.
       delay — не показывать раньше (по умолчанию 200 мс)
       min   — показавшись, держать не меньше (по умолчанию 400 мс)
       late  — через сколько признать, что долго (по умолчанию 3 с)
     Возвращает функцию завершения: вызвать, когда данные пришли.
     ------------------------------------------------------------ */
  function gate(show,hide,opts){
    opts=opts||{};
    var D=opts.delay==null?200:opts.delay,
        M=opts.min==null?400:opts.min,
        L=opts.late==null?3000:opts.late,
        shownAt=0,finished=false,
        tShow=setTimeout(function(){
          if(finished)return;
          shownAt=Date.now();show();
          if(opts.onLate)tLate=setTimeout(function(){if(!finished)opts.onLate()},L-D);
        },D),
        tLate=null;
    return function done(){
      if(finished)return;
      finished=true;clearTimeout(tShow);clearTimeout(tLate);
      if(!shownAt){hide();return}                     /* успели раньше порога — скелетона не было */
      var rest=M-(Date.now()-shownAt);
      if(rest>0)setTimeout(hide,rest);else hide();    /* показались — досидим минимум */
    };
  }

  return {sk:sk,stack:stack,line:line,dot:dot,ln:ln,col:col,bar:bar,spin:spin,
          tabBody:tabBody,late:late,empty:empty,error:error,gate:gate};
})();
