/* Единый справочник статусов валютного реестра и отчёта НЗР. Цвета — chart.css. */
(function(){
  'use strict';
  var meta=[
    ['IN_PROGRESS','В работе','flow'],['TO_EXPORT','К экспорту','flowl'],['PROCESSING','В обработке','flowd'],
    ['ERROR','Ошибка','bad'],['DEFERRED','Отложенный','warn'],['EXPORTED','Экспортирован','okl'],
    ['INVALID','INVALID','badd'],['REJECTED','Отказ','grey'],['DONE','Обработан','ok']
  ];
  var byCode={};meta.forEach(function(s){byCode[s[0]]={label:s[1],color:s[2]}});
  function drawerState(code){return code==='DONE'||code==='EXPORTED'?'ok':code==='ERROR'||code==='INVALID'||code==='REJECTED'?'bad':'wait'}
  window.DocumentStatuses={meta:meta,byCode:byCode,drawerState:drawerState};
})();
