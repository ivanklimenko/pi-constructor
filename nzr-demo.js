/* Воспроизводимые случайные данные: не меняются от сортировки и повторного открытия окна. */
(function(root){
  'use strict';
  var MAX_DOCUMENTS=20,MAX_DOCUMENT_AMOUNT=2200000;
  function accountPlan(index){
    var seed=Math.imul(index+1,2654435761)>>>0;
    function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
    var count=index<4?[16,18,20,14][index]:12+Math.floor(random()*9),zero=index>=4&&(index-4)%6===0;
    var documents=Array.from({length:count},function(_,i){return {amount:Math.round((1000+random()*(MAX_DOCUMENT_AMOUNT-1000))*100)/100,age:1+Math.floor(random()*10),partial:!zero&&i%5===0,attempt:i%3===0?'ERROR':i%3===1?'PROCESSING':null}});
    return {zero:zero,documents:documents};
  }
  var api={accountPlan:accountPlan,maxBalance:MAX_DOCUMENTS*MAX_DOCUMENT_AMOUNT};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.NZRDemo=api;
})(typeof window==='object'?window:globalThis);
