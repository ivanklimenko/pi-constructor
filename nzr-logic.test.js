const test = require('node:test');
const assert = require('node:assert/strict');
const logic = require('./nzr-logic.js');

test('waiting buckets do not overlap at days 2, 3, 5 and 6', () => {
  assert.equal(logic.ageBucket('2026-11-09', '2026-11-09'), 'today');
  assert.equal(logic.ageBucket('2026-11-07', '2026-11-09'), '1-2');
  assert.equal(logic.ageBucket('2026-11-06', '2026-11-09'), '3-5');
  assert.equal(logic.ageBucket('2026-11-04', '2026-11-09'), '3-5');
  assert.equal(logic.ageBucket('2026-11-03', '2026-11-09'), '6+');
});

test('failed and pending write-offs leave the full balance outstanding', () => {
  const row = {value:100, posted:'09.11.2026', children:[
    {value:100, posted:'09.11.2026', status:'ERROR'},
    {value:100, posted:'09.11.2026', status:'IN_PROGRESS'}
  ]};
  assert.equal(logic.remaining(row, '2026-11-09'), 100);
});

test('partial success leaves a remainder, and future success cannot close a historical balance', () => {
  const row = {value:100.3, posted:'08.11.2026', children:[
    {value:40.1, posted:'09.11.2026', status:'DONE'},
    {value:60.2, posted:'10.11.2026', status:'DONE'}
  ]};
  assert.equal(logic.remaining(row, '2026-11-09'), 60.2);
  assert.equal(logic.remaining(row, '2026-11-10'), 0);
});

test('account aggregates count successful daily operations and outstanding documents, keeping currencies separate', () => {
  const rows = [
    {account:'a', ccy:'USD', value:100, posted:'09.11.2026', children:[{value:40,posted:'09.11.2026',status:'DONE'},{value:60,posted:'09.11.2026',status:'ERROR'}]},
    {account:'a', ccy:'USD', value:20, posted:'08.11.2026', children:[{value:20,posted:'09.11.2026',status:'DONE'}]},
    {account:'b', ccy:'EUR', value:80, posted:'09.11.2026', children:[]},
    {account:'c', ccy:'USD', value:900, posted:'09.11.2026', children:[]},
    {account:'a', ccy:'USD', value:500, posted:'10.11.2026', children:[]}
  ];
  assert.deepEqual(logic.aggregate(rows, ['a','b'], '2026-11-09'), {
    USD:{balance:60,documents:1,turnover:160,operations:3},
    EUR:{balance:80,documents:1,turnover:80,operations:1}
  });
});

test('financial comparison detects a missing operation even when balances match', () => {
  const report={balance:10,documents:1,turnover:20,operations:2};
  assert.deepEqual(logic.difference(report,{balance:10,documents:1,turnover:25,operations:3}),
    {balance:0,documents:0,turnover:-5,operations:-1});
});

test('a grid never falls back to mixed account rows when no account is active', () => {
  const rows=[{account:'usd',ccy:'USD'},{account:'eur',ccy:'EUR'},{account:'usd',ccy:'USD'}];
  assert.deepEqual(logic.scopeRows?.(rows,null), []);
  assert.deepEqual(logic.scopeRows?.(rows,'usd'), [rows[0],rows[2]]);
});

test('a set of 100 accounts retains one active account and replaces it only if removed', () => {
  const accounts=Array.from({length:120},(_,i)=>({id:String(i)}));
  const selected=accounts.slice(0,100).map(a=>a.id);
  assert.equal(logic.resolveActiveAccount?.(accounts,selected,'72'),'72');
  assert.equal(logic.resolveActiveAccount?.(accounts,selected,'119'),'0');
  assert.equal(logic.resolveActiveAccount?.(accounts,[],'72'),null);
});

test('account selection combines currency, search and positive balance before numeric sorting', () => {
  const accounts=[
    {id:'u1',ccy:'USD',name:'Центр',availableBalance:2},
    {id:'u2',ccy:'USD',name:'Центр',availableBalance:100},
    {id:'u3',ccy:'USD',name:'Центр',availableBalance:10},
    {id:'u4',ccy:'USD',name:'Центр',availableBalance:0},
    {id:'e1',ccy:'EUR',name:'Центр',availableBalance:200},
    {id:'u5',ccy:'USD',name:'Филиал',availableBalance:300}
  ];
  assert.deepEqual(logic.filterAccounts?.(accounts,{currency:'USD',q:'центр',nonZero:true,direction:'desc'}).map(a=>a.id),['u2','u3','u1']);
  assert.deepEqual(logic.filterAccounts?.(accounts,{currency:'USD',q:'центр',nonZero:false,direction:'asc'}).map(a=>a.id),['u4','u1','u3','u2']);
  assert.deepEqual(accounts.map(a=>a.id),['u1','u2','u3','u4','e1','u5']);
});

test('register snapshot keeps accounts of the same currency separate and includes zero balances', () => {
  const rows=[
    {account:'a',value:100.3,posted:'08.11.2026',children:[{value:40.1,posted:'09.11.2026',status:'DONE'}]},
    {account:'a',value:20.2,posted:'09.11.2026',children:[{value:20.2,posted:'09.11.2026',status:'ERROR'}]},
    {account:'b',value:50,posted:'09.11.2026',children:[{value:50,posted:'09.11.2026',status:'DONE'}]},
    {account:'a',value:900,posted:'10.11.2026',children:[]}
  ];
  assert.deepEqual(logic.accountBalances?.(rows,['a','b','c'],'2026-11-09'),{a:80.4,b:0,c:0});
});
