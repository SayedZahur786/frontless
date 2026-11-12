const BASE='https://api-m.sandbox.paypal.com';
async function request(path, options={}){
 const r=await fetch(BASE+path,{...options,signal:AbortSignal.timeout(20000)});
 const data=await r.json().catch(()=>({})); if(!r.ok){const e=Error(`PayPal sandbox request failed (${r.status}). Check app credentials, Payouts access and sender balance.`); e.details=data.name;throw e;}return data;
}
async function token(){if(!process.env.PAYPAL_CLIENT_ID||!process.env.PAYPAL_CLIENT_SECRET)throw Error('PayPal sandbox credentials are not configured.');
 const auth=Buffer.from(process.env.PAYPAL_CLIENT_ID+':'+process.env.PAYPAL_CLIENT_SECRET).toString('base64');
 return (await request('/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})).access_token;
}
export async function sendAdvance(item){const t=await token(); return request('/v1/payments/payouts',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({sender_batch_header:{sender_batch_id:'frontless-'+item.id,email_subject:'Your volunteer travel advance'},items:[{recipient_type:'EMAIL',amount:{value:(item.amountMinor/100).toFixed(2),currency:item.currency},receiver:item.email,note:'Synthetic volunteer travel advance - sandbox only',sender_item_id:item.id}]})});}
export async function payoutStatus(batchId){const t=await token();return request('/v1/payments/payouts/'+encodeURIComponent(batchId)+'?fields=batch_header,items',{headers:{Authorization:'Bearer '+t}});}
