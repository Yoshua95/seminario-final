// Provider double: these are local fixtures, never evidence of a real payment.
export function fakeRegisteredProvider(intent,options={}){
 const binding={project_ref:'khtfjogqvtjuxhmzkmue',seller_id:'3858067934',buyer_id:'3858067936'};
 const id=options.id??String(Date.now())+String(Math.floor(Math.random()*10000)),amount=Number(intent.amount),status=options.status??'approved';
 const payment={id,collector_id:binding.seller_id,payer:{id:binding.buyer_id},external_reference:intent.external_reference,currency_id:'ARS',transaction_amount:amount,live_mode:true,status,date_last_updated:new Date().toISOString(),order:{id:'123456789'}};
 const order={id:'123456789',preference_id:intent.preference_id,external_reference:intent.external_reference,collector:{id:binding.seller_id},payer:{id:binding.buyer_id},total_amount:amount,payments:[{id,status,transaction_amount:amount}]};
 const preference={id:intent.preference_id,collector_id:binding.seller_id,external_reference:intent.external_reference,metadata:{operation_id:intent.operation_id,fourpack_test:true},items:[{id:intent.operation_id,quantity:1,currency_id:'ARS',unit_price:amount}]};
 const seller={id:binding.seller_id,site_id:'MLA',tags:['test_user']},buyer={id:binding.buyer_id,site_id:'MLA',tags:[]};
 const provider={async get(path){if(path.startsWith('/v1/payments/search?'))return{results:[{id}],paging:{total:1}};if(path==='/v1/payments/'+id)return payment;if(path==='/merchant_orders/'+order.id)return order;if(path==='/checkout/preferences/'+intent.preference_id)return preference;if(path==='/users/me')return seller;if(path==='/users/'+binding.buyer_id)return buyer;throw Error('UNEXPECTED_PROVIDER_REQUEST');}};
 return{binding,provider,payment,order,preference,seller,buyer};
}
