export const POLICY = {id:'greenbridge-travel-v1', charity:'Greenbridge Community Kitchen', currency:'GBP', capMinor:1500, budgetMinor:20000, clauses:[
 {id:'T1',label:'Public transport',text:'Bus, train, tram and other public transport to and from a confirmed volunteer shift are eligible. Travel advances are capped at £15 per shift.'},
 {id:'T2',label:'Taxi or rideshare',text:'Taxi and rideshare fares need separate coordinator approval and are not eligible for an automatic travel advance.'},
 {id:'T3',label:'Food and personal purchases',text:'Meals, coffee, gifts and personal purchases are not covered by the travel policy.'},
 {id:'T4',label:'Reconciliation',text:'Upload or enter the actual receipt total after the shift. Any unspent advance is recorded as outstanding until the treasurer confirms a return. Frontless never debits a volunteer automatically.'}
]};
export function minor(value, allowZero=false){
 const s=String(value); if(!/^\d{1,5}(\.\d{1,2})?$/.test(s))throw Error('Enter a positive amount with at most 2 decimal places.');
 const [a,b='']=s.split('.'); const n=Number(a)*100+Number(b.padEnd(2,'0')); if(n<0||(!allowZero&&n===0))throw Error('Amount must be greater than zero.'); return n;
}
export function validateRequest(input){
 const amountMinor=minor(input.amount);
 if(amountMinor>POLICY.capMinor)throw Error('Travel advance exceeds the £15 policy cap.');
 const name=String(input.name||'').trim(); const email=String(input.email||'').trim().toLowerCase();const description=String(input.description||'').trim();const shift=String(input.shift||'').trim();
 if(name.length<2||name.length>100)throw Error('Enter a volunteer name (2-100 characters).');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)throw Error('Enter a valid sandbox PayPal receiver email.');
 if(description.length<8||description.length>2000)throw Error('Describe the travel request (8-2000 characters).');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(shift)||Number.isNaN(Date.parse(shift))||new Date(shift).toISOString().slice(0,10)!==shift)throw Error('Choose a valid shift date.');
 return {name,email,description,shift,amountMinor,currency:POLICY.currency,policyId:POLICY.id};
}
export function reconcile(advanceMinor, receiptValue){const actualMinor=minor(receiptValue,true);return {actualMinor,unspentMinor:Math.max(0,advanceMinor-actualMinor),extraMinor:Math.max(0,actualMinor-advanceMinor),state:actualMinor<advanceMinor?'RETURN_OUTSTANDING':actualMinor>advanceMinor?'EXTRA_REVIEW':'RECONCILED'};}
