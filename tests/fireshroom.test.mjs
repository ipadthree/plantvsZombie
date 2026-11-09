import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANTS } from '../app/game/catalog.ts';
import { getFirePhase, stepFirePlant } from '../app/game/combat.ts';
const def=PLANTS.fireshroom;
const plant={uid:1,type:'fireshroom',row:1,col:3,health:100,lastShotAt:0,pulseUntil:0,digestUntil:0};
const zombie={uid:1,type:'pothead-shambler',row:1,x:4,health:250,maxHealth:250,biting:false,hitUntil:0,slowUntil:0,slowMultiplier:1};
test('Fireshroom stats and burst damage match a complete watermelon volley',()=>{
 assert.equal(def.cost,200); assert.equal(def.health,100);
 assert.equal(def.burstDamage,PLANTS['watermelon-plant'].projectileDamage*PLANTS['watermelon-plant'].projectilesPerVolley);
});
test('fire hits all targets in the same lane within two tiles, but not offboard, behind, or dead targets',()=>{
 const targets=[zombie,{...zombie,uid:2,x:5},{...zombie,uid:3,x:5.01},{...zombie,uid:4,row:0},{...zombie,uid:5,x:2},{...zombie,uid:6,health:0}];
 const result=stepFirePlant(plant,def,targets,0,50,9);
 assert.deepEqual(result.hits.map(hit=>hit.uid),[1]);
 // Range is strict, consistent with other short-range plants.
 assert.equal(stepFirePlant(plant,def,[{...zombie,x:4.999}],0,50,9).hits.length,1);
 assert.equal(stepFirePlant({...plant,col:8},def,[{...zombie,x:9.25}],0,50,9).hits.length,0);
 assert.equal(getFirePhase(stepFirePlant(plant,def,[],0,50,9).plant,def,0),'ready');
});
test('three seconds of fire gives 75 damage to every target, then five seconds with zero damage',()=>{
 let current=plant; const damage=new Map();
 const targets=[zombie,{...zombie,uid:2,x:4.8}];
 for(let t=0;t<8000;t+=50){const result=stepFirePlant(current,def,targets,t,50,9);current=result.plant;
  if(t<3000)assert.equal(getFirePhase(current,def,t),'firing');else {assert.equal(getFirePhase(current,def,t),'recharging');assert.equal(result.hits.length,0);}
  result.hits.forEach(hit=>damage.set(hit.uid,(damage.get(hit.uid)||0)+hit.damage));
 }
 assert.equal(damage.get(1),75);assert.equal(damage.get(2),75);
 assert.equal(getFirePhase(current,def,8000),'ready');
 assert.equal(getFirePhase(stepFirePlant(current,def,targets,8000,50,9).plant,def,8000),'firing');
});
test('phase timing follows game time, and recharge ends ready when no targets remain',()=>{
 const current=stepFirePlant(plant,def,[zombie],1000,50,9).plant;
 assert.equal(getFirePhase(current,def,3999),'firing');assert.equal(getFirePhase(current,def,4000),'recharging');
 assert.equal(getFirePhase(current,def,8999),'recharging');assert.equal(getFirePhase(current,def,9000),'ready');
 assert.equal(stepFirePlant(current,def,[],9000,50,9).hits.length,0);
});
