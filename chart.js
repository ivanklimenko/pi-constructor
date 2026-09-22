/* ============================================================
   CH — график динамики по статусам. Компонент дизайн-кита.

   CH.mount(host, cfg) -> контроллер {render, cfg}
   cfg: {
     series:[{key,label,color,points:[число,...]}],  точки по времени
     endAt: Date,        время последней точки
     stepMin: 1,         шаг ряда в минутах
     minutes,            текущий диапазон
     ranges:[{label,minutes}],
     onRange(minutes), onClose()
   }

   Единый график: все статусы в одних осях, шкала считается по
   ВИДИМЫМ рядам. Скрыл лишние — оставшиеся растянулись на всю
   высоту, и конкретный статус виден крупно без отдельного экрана.

   Цвет: палитра статусов, та же, что в лейне. Девять рядов в одних
   осях по цвету полностью не разводятся (соседние пары в зелёном
   и сером ниже порога различимости), поэтому идентичность держат
   не только цвет: легенда, подпись конца линии при <= 4 видимых
   рядах и подсказка с названиями под перекрестием.
   ============================================================ */
window.CH=(function(){

  var W=1000,H=200,L=46,R=8,T=10,B=20;        /* система координат графика */

  var STEPS=[1,1.2,1.5,2,2.5,3,4,5,6,8,10];
  function niceMax(v){
    if(v<=4)return 4;
    var p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;
    for(var i=0;i<STEPS.length;i++)if(f<=STEPS[i]+1e-9)return Math.round(STEPS[i]*p*100)/100;
    return 10*p;
  }
  /* на 1000 единиц ширины больше ~600 точек не читается */
  function thin(pts,to){
    var n=pts.length;if(n<=to)return pts;
    var out=[],st=(n-1)/(to-1);
    for(var i=0;i<to;i++)out.push(pts[Math.round(i*st)]);
    return out;
  }
  function p2(n){return String(n).padStart(2,'0')}
  function hhmm(d){return p2(d.getHours())+':'+p2(d.getMinutes())}
  function dmhm(d){return p2(d.getDate())+'.'+p2(d.getMonth()+1)+' '+hhmm(d)}

  function mount(host,cfg){
    var hidden={},                       /* ключи скрытых рядов */
        tip=document.createElement('div');
    tip.className='ch-tip';document.body.appendChild(tip);

    function shown(){return cfg.series.filter(function(s){return !hidden[s.key]})}
    function timeAt(i){
      var n=cfg.series[0].points.length;
      return new Date(cfg.endAt.getTime()-(n-1-i)*cfg.stepMin*60000);
    }
    function fmt(d){return cfg.minutes>1440?dmhm(d):hhmm(d)}
    function maxOf(vis){
      return niceMax(Math.max.apply(null,vis.map(function(s){return Math.max.apply(null,s.points)})));
    }

    function plot(){
      var vis=shown();
      if(!vis.length)return '<div class="ch-none">Не выбрано ни одного статуса</div>';
      var max=maxOf(vis),iw=W-L-R,ih=H-T-B,n=cfg.series[0].points.length,
          lab=vis.length<=4;               /* при немногих рядах подписываем концы */

      var gl='',ax='';
      [0,.5,1].forEach(function(f){
        var y=(T+ih-f*ih).toFixed(1);
        gl+='<path class="gl" d="M'+L+' '+y+' L'+(L+iw)+' '+y+'"/>';
        ax+='<text class="ax" x="'+(L-6)+'" y="'+(+y+3.5)+'" text-anchor="end">'+Math.round(max*f)+'</text>';
      });
      [0,.25,.5,.75,1].forEach(function(f){
        var x=(L+f*iw).toFixed(1),i=Math.round(f*(n-1));
        ax+='<text class="ax" x="'+x+'" y="'+(H-5)+'" text-anchor="'+(f?f===1?'end':'middle':'start')+'">'+fmt(timeAt(i))+'</text>';
      });

      var lines=vis.map(function(s){
        var t=thin(s.points,600),m=t.length,
            d=t.map(function(v,i){
              return (i?'L':'M')+(L+(m>1?i/(m-1)*iw:0)).toFixed(1)+' '+(T+ih-v/max*ih).toFixed(1);
            }).join(' ');
        var ey=(T+ih-s.points[n-1]/max*ih);
        return '<path class="ln" style="stroke:'+s.color+'" d="'+d+'"/>'+
          (lab?'<text class="endlab" x="'+(L+iw-4)+'" y="'+(ey-7).toFixed(1)+'" text-anchor="end" style="fill:'+s.color+'">'+s.label+'</text>':'');
      }).join('');

      var knobs=vis.map(function(s){
        return '<circle class="knob" data-k="'+s.key+'" r="4" cx="-99" cy="-99" fill="'+s.color+'" stroke="var(--paper)" stroke-width="2"/>';
      }).join('');

      return '<svg class="ch-svg" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" role="img" '+
        'aria-label="Количество документов по статусам во времени">'+gl+ax+lines+
        '<path class="cross" d="M-99 '+T+' L-99 '+(T+ih)+'"/>'+knobs+'</svg>';
    }

    function legend(){
      return '<div class="ch-leg">'+cfg.series.map(function(s){
        var on=!hidden[s.key];
        return '<button type="button" class="lg" data-k="'+s.key+'" aria-pressed="'+on+'" '+
          'data-tip="Клик — показать или скрыть · Shift — оставить только этот">'+
          '<span class="dot" style="background:'+(on?s.color:'var(--line)')+'"></span>'+
          s.label+'<b>'+s.points[s.points.length-1]+'</b></button>';
      }).join('')+
      '<button type="button" class="lg all" data-all>Показать все</button></div>';
    }

    function tableHtml(){
      var n=cfg.series[0].points.length,step=Math.max(1,Math.round(n/12)),rows='';
      for(var i=n-1;i>=0;i-=step){
        rows+='<tr><th>'+fmt(timeAt(i))+'</th>'+
          cfg.series.map(function(s){return '<td>'+s.points[i]+'</td>'}).join('')+'</tr>';
      }
      return '<details class="ch-tbl"><summary>Таблица значений</summary><table>'+
        '<thead><tr><th>Время</th>'+cfg.series.map(function(s){return '<td>'+s.label+'</td>'}).join('')+'</tr></thead>'+
        '<tbody>'+rows+'</tbody></table></details>';
    }

    function render(){
      host.className='ch';
      host.innerHTML=
        '<div class="ch-head"><h3>Динамика по статусам</h3>'+
          '<span class="sub">шаг 1 мин · данные отстают до минуты</span>'+
          '<span class="sp"><span class="at">'+(cfg.busy?'<span class="skspin" aria-label="Обновление"></span>':'на '+hhmm(cfg.endAt))+'</span>'+
            '<span class="ch-range">'+cfg.ranges.map(function(r){
              return '<button type="button" data-r="'+r.minutes+'" aria-pressed="'+(r.minutes===cfg.minutes)+'">'+r.label+'</button>'}).join('')+'</span>'+
            '<button type="button" class="ch-x" data-close aria-label="Закрыть график">✕</button></span></div>'+
        '<div class="ch-plot">'+plot()+'</div>'+legend()+tableHtml();
    }

    /* Перекрестие: вертикаль, точки на видимых линиях и подсказка
       с названиями — идентичность ряда не держится на одном цвете. */
    function scrub(e){
      var svg=host.querySelector('.ch-svg');if(!svg)return;
      var r=svg.getBoundingClientRect();
      if(e.clientY<r.top-4||e.clientY>r.bottom+4){clear();return}
      var vis=shown();if(!vis.length)return;
      var iw=W-L-R,ih=H-T-B,n=cfg.series[0].points.length,max=maxOf(vis),
          fx=(e.clientX-r.left)/r.width*W;
      if(fx<L)fx=L;
      if(fx>L+iw)fx=L+iw;
      var i=Math.round((fx-L)/iw*(n-1));
      host.classList.add('hover');
      svg.querySelector('.cross').setAttribute('d','M'+fx.toFixed(1)+' '+T+' L'+fx.toFixed(1)+' '+(T+ih));
      vis.forEach(function(s){
        var k=svg.querySelector('.knob[data-k="'+s.key+'"]');if(!k)return;
        k.setAttribute('cx',fx.toFixed(1));
        k.setAttribute('cy',(T+ih-s.points[i]/max*ih).toFixed(1));
      });
      tip.innerHTML='<i>'+fmt(timeAt(i))+'</i>'+vis.slice().sort(function(a,b){
          return b.points[i]-a.points[i]}).map(function(s){
          return '<span><em style="background:'+s.color+'"></em>'+s.label+'<b>'+s.points[i]+'</b></span>'}).join('');
      tip.classList.add('on');
      var tw=tip.offsetWidth,th=tip.offsetHeight,ty=e.clientY-th-12;
      /* не хватает места сверху — уводим под курсор, иначе подсказка
         накрывает шапку графика и лейн */
      if(ty<8)ty=Math.min(innerHeight-th-8,e.clientY+18);
      tip.style.left=Math.max(8,Math.min(innerWidth-tw-8,e.clientX+14))+'px';
      tip.style.top=ty+'px';
    }
    function clear(){host.classList.remove('hover');tip.classList.remove('on')}

    host.addEventListener('mousemove',scrub);
    host.addEventListener('mouseleave',clear);
    host.addEventListener('click',function(e){
      if(e.target.closest('[data-close]')){host.innerHTML='';host.className='';tip.remove();
        if(cfg.onClose)cfg.onClose();return}
      if(e.target.closest('[data-all]')){hidden={};render();return}
      var r=e.target.closest('[data-r]');
      if(r){cfg.minutes=+r.dataset.r;if(cfg.onRange)cfg.onRange(cfg.minutes);render();return}
      var lg=e.target.closest('.lg[data-k]');
      if(lg){
        var k=lg.dataset.k;
        /* Shift — оставить только этот статус: частый сценарий «посмотреть один» */
        if(e.shiftKey){hidden={};cfg.series.forEach(function(s){if(s.key!==k)hidden[s.key]=1})}
        else hidden[k]=!hidden[k];
        render();
      }
    });

    render();
    return {render:render,cfg:cfg};
  }

  return {mount:mount,niceMax:niceMax,thin:thin};
})();
