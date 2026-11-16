const test=require('node:test');
const assert=require('node:assert/strict');
const demo=require('./nzr-demo.js');

test('every demo account contains 12–20 varied documents, each within the amount ceiling',()=>{
  for(let i=0;i<120;i++){
    const plan=demo.accountPlan?.(i);
    assert.ok(plan,'demo plan must exist');
    assert.ok(plan.documents.length>=12&&plan.documents.length<=20);
    assert.ok(plan.documents.every(d=>d.amount>0&&d.amount<=2200000));
    assert.ok(plan.documents.reduce((n,d)=>n+d.amount,0)<=44000000);
    assert.ok(new Set(plan.documents.map(d=>d.amount)).size>1);
    assert.deepEqual(demo.accountPlan(i),plan,'reopening the picker must not regenerate account balances');
  }
});

test('demo catalogue includes both empty and funded accounts without clearing the initial four',()=>{
  const plans=Array.from({length:120},(_,i)=>demo.accountPlan?.(i));
  assert.ok(plans.every(Boolean));
  assert.ok(plans.slice(0,4).every(p=>!p.zero));
  assert.ok(plans.some(p=>p.zero));
  assert.ok(plans.some(p=>!p.zero));
});
