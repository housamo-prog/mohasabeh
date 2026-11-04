/* Load after the application's main script. Does not change historical invoices. */
(()=>{
 const previousEdit=currencyEdit;
 let editing=false;
 const normalize=v=>{
  let x=String(v??'').trim();
  x=x.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
  return Number(x.replace(/٫/g,'.').replace(/[٬,\s]/g,''));
 };
 async function editUSD(){
  if(editing){toast('نافذة تعديل الدولار مفتوحة أو الطلب قيد التنفيذ');return}
  editing=true;
  try{
   if(!S.shop?.id)throw Error('لم يتم تحميل المحل. أعد تسجيل الدخول.');
   if(S.role!=='owner')throw Error('تعديل سعر الدولار متاح للمالك فقط.');
   if(navigator.onLine===false)throw Error('تعديل السعر يحتاج اتصالاً بالإنترنت.');
   const f=await dlg({title:'تعديل سعر الدولار',icon:'dollar',yes:'حفظ السعر',
    msg:'أدخل قيمة دولار واحد بالليرة السورية. لا يغيّر هذا الإجراء أسعار الفواتير السابقة.',
    fields:[{k:'rate',label:'ليرة سورية لكل 1 دولار',val:S.shop.usd_rate??'',num:true}],
    check:v=>{const n=normalize(v.rate);return Number.isFinite(n)&&n>0?'':'أدخل سعراً صحيحاً أكبر من صفر';}});
   if(!f)return;
   const rateValue=normalize(f.rate);
   if(!Number.isFinite(rateValue)||rateValue<=0)throw Error('سعر غير صالح.');
   const r=await db.rpc('set_usd_rate',{p_shop:S.shop.id,p_rate:rateValue});
   if(r.error)throw r.error;
   const verify=await db.from('shops').select('usd_rate').eq('id',S.shop.id).single();
   if(verify.error)throw Error('وصل رد الحفظ، لكن تعذر التحقق من السعر. حدّث الصفحة قبل إعادة المحاولة. '+verify.error.message);
   const actual=Number(verify.data?.usd_rate);
   if(!Number.isFinite(actual)||Math.abs(actual-rateValue)>Math.max(1e-8,Math.abs(rateValue)*1e-10))throw Error('رد الخادم لم يؤكد حفظ السعر المطلوب. السعر المقروء: '+String(verify.data?.usd_rate));
   S.shop.usd_rate=actual;
   (S.currencies||[]).forEach(c=>{if(c.code==='USD')c.rate_to_syp=actual});
   const label=document.querySelector('.hact .rate span[dir="ltr"]');
   if(label)label.textContent=fmt(actual);
   if(typeof saveCache==='function'){try{saveCache()}catch(e){console.warn(e)}}
   if(S.tab==='curr')await currencyV();
   toast('تم حفظ سعر الدولار والتحقق منه ✓');
  }catch(e){
   console.error('USD rate update failed',e);
   await say('تعذر تعديل سعر الدولار',{msg:(e.code?'['+e.code+'] ':'')+(e.message||String(e))});
  }finally{editing=false}
 }
 setRate=()=>editUSD();
 currencyEdit=async function(id){
  const c=(S.currencies||[]).find(x=>x.id===id||x.code===id)||(typeof curRows==='function'?curRows().find(x=>x.id===id||x.code===id):null);
  if(id==='USD'||c?.code==='USD')return editUSD();
  if(!c){toast('تعذر تحديد العملة. افتح إدارة العملات مجدداً.');return}
  return previousEdit(id);
 };
})();
