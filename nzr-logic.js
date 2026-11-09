/* Расчёты макета: суммы храним в целых сотых, дни — календарные. */
(function(root){
  'use strict';
  function iso(value){return value.includes('.')?value.split('.').reverse().join('-'):value}
  function cents(value){return Math.round(value*100)}
  function ageDays(posted,asOf){return Math.floor((Date.parse(iso(asOf)+'T00:00:00Z')-Date.parse(iso(posted)+'T00:00:00Z'))/86400000)}
  function ageBucket(posted,asOf){var days=ageDays(posted,asOf);return days<0?'future':days===0?'today':days<=2?'1-2':days<=5?'3-5':'6+'}
  function successful(row,asOf){return row.children.filter(function(c){return c.status==='DONE'&&iso(c.posted)<=asOf})}
  function remaining(row,asOf){if(iso(row.posted)>asOf)return 0;return Math.max(0,cents(row.value)-successful(row,asOf).reduce(function(n,c){return n+cents(c.value)},0))/100}
  function aggregate(rows,accounts,asOf){
    var result={},chosen=new Set(accounts);
    rows.forEach(function(row){
      if(!chosen.has(row.account)||iso(row.posted)>asOf)return;
      var metric=result[row.ccy]||(result[row.ccy]={balance:0,documents:0,turnover:0,operations:0});
      var rest=remaining(row,asOf);metric.balance+=cents(rest);if(rest>0)metric.documents++;
      if(iso(row.posted)===asOf){metric.turnover+=cents(row.value);metric.operations++}
      successful(row,asOf).forEach(function(c){if(iso(c.posted)===asOf){metric.turnover+=cents(c.value);metric.operations++}});
    });
    Object.keys(result).forEach(function(ccy){result[ccy].balance/=100;result[ccy].turnover/=100});return result;
  }
  function difference(report,master){return {balance:(cents(report.balance)-cents(master.balance))/100,documents:report.documents-master.documents,turnover:(cents(report.turnover)-cents(master.turnover))/100,operations:report.operations-master.operations}}
  function scopeRows(rows,activeId){return activeId?rows.filter(function(row){return row.account===activeId}):[]}
  function resolveActiveAccount(accounts,selectedIds,current){var selected=new Set(selectedIds),available=accounts.filter(function(account){return selected.has(account.id)});return available.some(function(account){return account.id===current})?current:available.length?available[0].id:null}
  var api={ageDays:ageDays,ageBucket:ageBucket,remaining:remaining,aggregate:aggregate,difference:difference,scopeRows:scopeRows,resolveActiveAccount:resolveActiveAccount};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.NZRLogic=api;
})(typeof window==='object'?window:globalThis);
