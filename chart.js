/* ============================================================
   CH — график динамики по статусам. Компонент дизайн-кита.

   CH.mount(host, cfg) -> контроллер {setRange, update, destroy}
   cfg: {
     series:[{key,label,color,points:[число,...]}],  точки в порядке времени
     endAt: Date,      время последней точки
     stepMin: 1,       шаг ряда в минутах
     ranges:[{key,label,minutes}],
     onRange(minutes)  запрос данных под диапазон
   }

   Форма: малые кратные. Статусы различаются на порядки, поэтому
   у каждого своя шкала; общая ось спрятала бы мелкие статусы в ноль,
   а логарифм в операционном интерфейсе читается неверно.

   Цвет: палитра статусов, не категориальная. Каждая линия одна в своей
   панели и подписана заголовком, поэтому значима не различимость пар,
   а контраст линии к фону — он проверен, все девять >= 3:1.
   ============================================================ */
window.CH=(function(){

  var VB_W=200,VB_H=46;   /* система координат панели; штрих не масштабируется */

  /* Лесенка частая: на грубой (1-2-5-10) линия садится на 40% высоты
     панели и перестаёт показывать форму. */
  var STEPS=[1,1.2,1.5,2,2.5,3,4,5,6,8,10];
  function niceMax(v){
    if(v<=4)return 4;
    var p=Math.pow(10,Math.floor(Math.log10(v))),f=v/p;
    for(var i=0;i<STEPS.length;i++)if(f<=STEPS[i]+1e-9)return Math.round(STEPS[i]*p*100)/100;
    return 10*p;
  }
  /* для маленькой панели больше ~200 точек ничего не добавляет:
     ширина системы координат 200 единиц */
  function thin(pts,to){
    var n=pts.length;if(n<=to)return pts;
    var out=[],st=(n-1)/(to-1);
    for(var i=0;i<to;i++)out.push(pts[Math.round(i*st)]);
    return out;
  }
  function path(pts,max){
    var n=pts.length,dx=n>1?VB_W/(n-1):0;
    return pts.map(function(v,i){
      return (i?'L':'M')+(i*dx).toFixed(2)+' '+(VB_H-(max?v/max*VB_H:0)).toFixed(2);
    }).join(' ');
  }
  function hhmm(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
  function timeAt(cfg,i){
    var n=cfg.series[0].points.length;
    return new Date(cfg.endAt.getTime()-(n-1-i)*cfg.stepMin*60000);
  }

  function mount(host,cfg){
    var open=null,           /* ключ развёрнутой панели */
        tip=document.createElement('div');
    tip.className='ch-tip';document.body.appendChild(tip);

    function panelHtml(s){
      var max=niceMax(Math.max.apply(null,s.points)),last=s.points[s.points.length-1];
      return '<div class="ch-p" role="button" tabindex="0" data-k="'+s.key+'" aria-label="'+s.label+', динамика; текущее значение '+last+'">'+
        '<div class="t"><span class="dot" style="background:'+s.color+'"></span>'+
          '<span class="nm">'+s.label+'</span><span class="v" data-v>'+last+'</span></div>'+
        '<svg viewBox="0 0 '+VB_W+' '+VB_H+'" preserveAspectRatio="none" aria-hidden="true">'+
          '<path class="base" d="M0 '+VB_H+' L'+VB_W+' '+VB_H+'"/>'+
          '<path class="ln" style="stroke:'+s.color+'" d="'+path(thin(s.points,200),max)+'"/>'+
          '<path class="cross" d="M0 0 L0 '+VB_H+'"/>'+
          '<circle class="knob" r="3.5" cx="0" cy="0" fill="'+s.color+'" stroke="var(--paper)" stroke-width="2"/>'+
        '</svg>'+
        '<span class="mx">макс '+max+'</span></div>';
    }

    function bigHtml(s){
      var max=niceMax(Math.max.apply(null,s.points)),n=s.points.length,
          W=1000,H=210,L=44,B=18,iw=W-L-8,ih=H-B-8;
      var d=s.points.map(function(v,i){
        return (i?'L':'M')+(L+(n>1?i/(n-1)*iw:0)).toFixed(1)+' '+(8+ih-v/max*ih).toFixed(1);
      }).join(' ');
      var gl='',lab='';
      [0,.5,1].forEach(function(f){
        var y=(8+ih-f*ih).toFixed(1);
        gl+='<path class="gl" d="M'+L+' '+y+' L'+(L+iw)+' '+y+'"/>';
        lab+='<text class="ax" x="'+(L-6)+'" y="'+(+y+3)+'" text-anchor="end">'+Math.round(max*f)+'</text>';
      });
      var tk='';
      [0,.25,.5,.75,1].forEach(function(f){
        var i=Math.round(f*(n-1)),x=(L+f*iw).toFixed(1);
        tk+='<text class="ax" x="'+x+'" y="'+(H-4)+'" text-anchor="'+(f===0?'start':f===1?'end':'middle')+'">'+hhmm(timeAt(cfg,i))+'</text>';
      });
      return '<div class="ch-big" data-k="'+s.key+'">'+
        '<button type="button" class="ch-back" data-back>← все статусы</button>'+
        '<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+gl+lab+tk+
          '<path class="ln" style="stroke:'+s.color+'" d="'+d+'"/></svg></div>';
    }

    function tableHtml(){
      var n=cfg.series[0].points.length,step=Math.max(1,Math.round(n/12)),rows='';
      for(var i=n-1;i>=0;i-=step){
        rows+='<tr><th>'+hhmm(timeAt(cfg,i))+'</th>'+
          cfg.series.map(function(s){return '<td>'+s.points[i]+'</td>'}).join('')+'</tr>';
      }
      return '<details class="ch-tbl"><summary>Таблица значений</summary><table>'+
        '<thead><tr><th>Время</th>'+cfg.series.map(function(s){return '<td>'+s.label+'</td>'}).join('')+'</tr></thead>'+
        '<tbody>'+rows+'</tbody></table></details>';
    }

    function render(){
      var s=open&&cfg.series.filter(function(x){return x.key===open})[0];
      host.className='ch';
      host.innerHTML=
        '<div class="ch-head"><h3>Динамика по статусам</h3>'+
          '<span class="sub">шаг 1 мин · данные отстают до минуты</span>'+
          '<span class="sp"><span class="at">'+(cfg.busy?'<span class="skspin" aria-label="Обновление"></span>':'на '+hhmm(cfg.endAt))+'</span>'+
            '<span class="ch-range">'+cfg.ranges.map(function(r){
              return '<button type="button" data-r="'+r.minutes+'" aria-pressed="'+(r.minutes===cfg.minutes)+'">'+r.label+'</button>'}).join('')+'</span>'+
            '<button type="button" class="ch-x" data-close aria-label="Закрыть график">✕</button></span></div>'+
        (s?bigHtml(s):'<div class="ch-grid">'+cfg.series.map(panelHtml).join('')+'</div>')+
        tableHtml();
    }

    /* Перекрестие общее: ведём мышь над одной панелью — значения
       в заголовках всех девяти показывают ту же минуту. */
    function scrub(e){
      var box=host.querySelector('.ch-grid');if(!box)return;
      var p=e.target.closest('.ch-p');if(!p){clear();return}
      var r=p.querySelector('svg').getBoundingClientRect(),
          n=cfg.series[0].points.length,
          f=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),
          i=Math.round(f*(n-1));
      host.classList.add('hover');
      [].forEach.call(host.querySelectorAll('.ch-p'),function(el){
        var s=cfg.series.filter(function(x){return x.key===el.dataset.k})[0];
        if(!s)return;
        var max=niceMax(Math.max.apply(null,s.points)),x=(n>1?i/(n-1)*VB_W:0);
        el.querySelector('[data-v]').textContent=s.points[i];
        el.querySelector('.cross').setAttribute('d','M'+x+' 0 L'+x+' '+VB_H);
        var k=el.querySelector('.knob');
        k.setAttribute('cx',x);k.setAttribute('cy',VB_H-(max?s.points[i]/max*VB_H:0));
      });
      tip.textContent=hhmm(timeAt(cfg,i));
      tip.classList.add('on');
      tip.style.left=(e.clientX+12)+'px';tip.style.top=(e.clientY-26)+'px';
    }
    function clear(){
      host.classList.remove('hover');tip.classList.remove('on');
      [].forEach.call(host.querySelectorAll('.ch-p'),function(el){
        var s=cfg.series.filter(function(x){return x.key===el.dataset.k})[0];
        if(s)el.querySelector('[data-v]').textContent=s.points[s.points.length-1];
      });
    }

    host.addEventListener('mousemove',scrub);
    host.addEventListener('mouseleave',clear);
    host.addEventListener('click',function(e){
      if(e.target.closest('[data-close]')){host.innerHTML='';host.className='';tip.remove();
        if(cfg.onClose)cfg.onClose();return}
      if(e.target.closest('[data-back]')){open=null;render();return}
      var r=e.target.closest('[data-r]');
      if(r){cfg.minutes=+r.dataset.r;if(cfg.onRange)cfg.onRange(cfg.minutes);render();return}
      var p=e.target.closest('.ch-p');if(p){open=p.dataset.k;render();}
    });
    host.addEventListener('keydown',function(e){
      var p=e.target.closest('.ch-p');
      if(p&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open=p.dataset.k;render()}
      if(e.key==='Escape'&&open){open=null;render()}
    });

    render();
    return {render:render,cfg:cfg};
  }

  return {mount:mount,niceMax:niceMax,thin:thin};
})();
