/* ===================== MowMow AI Reliability Patch V5 =====================
   Keeps the existing MowMow app/screens as the base. This patch replaces
   the unreliable AI controls with one consistent controller.
=========================================================================== */
(function(){
  'use strict';

  const AIH='mowmowAIHistoryV5', AIC='mowmowAIContextV5', AIM='mowmowAIMoodV5';
  const VISION_MODEL='Xenova/clip-vit-base-patch32';
  const VISION_CDN='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm';
  const $q=s=>document.querySelector(s);
  const $$q=s=>[...document.querySelectorAll(s)];
  const esc2=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const load=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch{return d}};
  const ai={history:load(AIH,[]),context:load(AIC,{}),mood:localStorage.getItem(AIM)||'',lastResults:[],lastQuery:''};
  state.aiV5=ai;
  // Remove only AI UI injected by the previous prototype layer so there is one source of truth.
  ['#mowAIChat','#moodRow','#aiPrefsBox','#foodIdentifyBox','#homeAIButton','#orderAIButton','#profileAIButton'].forEach(sel=>document.querySelector(sel)?.remove());
  const saveAI=()=>{localStorage.setItem(AIH,JSON.stringify(ai.history.slice(-40)));localStorage.setItem(AIC,JSON.stringify(ai.context||{}));localStorage.setItem(AIM,ai.mood||'')};

  /* ---------- more food catalog ---------- */
  const MORE=[
    {id:'v501',name:'Chicken Rice Bowl',restaurant:'FitBite Kitchen',rating:4.8,price:199,icon:'🍗',photo:'https://tb-static.uber.com/prod/image-proc/processed_images/0fef28af23b73db59b34fbb3a0389846/70aa2a4db7f990373ca9c376323e3dea.jpeg',tags:['Protein Rich','Healthy','Chicken'],protein:32,calories:460,spiceLevel:'mild',isVegetarian:false,mealType:'lunch',cuisine:'Indian',ingredients:['chicken','rice','vegetables'],reviewSummary:'Balanced rice bowl with a substantial chicken portion.'},
    {id:'v502',name:'Tandoori Chicken',restaurant:'Spice Route',rating:4.7,price:239,icon:'🍗',photo:'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy%2Cf_auto%2Cq_auto%2Cw_400/RX_THUMBNAIL/IMAGES/VENDOR/2025/3/13/c48d05c8-1a44-4178-a4bd-cd5f64b5025b_1062971.jpg',tags:['Protein Rich','Spicy','Chicken','Healthy'],protein:38,calories:410,spiceLevel:'medium',isVegetarian:false,mealType:'dinner',cuisine:'Indian',ingredients:['chicken','yogurt','spices'],reviewSummary:'Smoky grilled chicken with a noticeable spice profile.'},
    {id:'v503',name:'Chicken Wings',restaurant:'Burger Yard',rating:4.6,price:229,icon:'🍗',photo:'https://tb-static.uber.com/prod/image-proc/processed_images/7eee23a352fed5465ec5954fe7a3bb87/c9252e6c6cd289c588c3381bc77b1dfc.jpeg',tags:['Chicken','Spicy'],protein:29,calories:560,spiceLevel:'medium',isVegetarian:false,mealType:'snack',cuisine:'Fast Food',ingredients:['chicken wings','spices'],reviewSummary:'Crispy chicken wings with spicy seasoning.'},
    {id:'v504',name:'Chicken Momos',restaurant:'Wok Express',rating:4.6,price:139,icon:'🥟',photo:'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy%2Cf_auto%2Cq_auto%2Cw_400/oqjmwxndarrvpmp6yoaf',tags:['Chicken','Spicy','Budget Friendly'],protein:18,calories:390,spiceLevel:'medium',isVegetarian:false,mealType:'snack',cuisine:'Asian',ingredients:['chicken','flour','vegetables'],reviewSummary:'Steamed dumplings with a savory chicken filling.'},
    {id:'v505',name:'Veg Momos',restaurant:'Wok Express',rating:4.5,price:119,icon:'🥟',photo:'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy%2Cf_auto%2Cq_auto/FOOD_CATALOG/IMAGES/CMS/2025/6/22/7faa93ca-3719-4009-99d2-74763283a5a0_4808a10c-1fdf-4a78-9aed-0fa1ffd740e8.jpeg_compressed',tags:['Vegetarian','Budget Friendly'],protein:8,calories:320,spiceLevel:'mild',isVegetarian:true,mealType:'snack',cuisine:'Asian',ingredients:['cabbage','carrot','flour'],reviewSummary:'Vegetarian steamed dumplings with mixed vegetables.'},
    {id:'v506',name:'Paneer Tikka',restaurant:'Green Flame',rating:4.7,price:220,icon:'🍢',photo:'https://production.owner-pluto.net/images/funnel/images/cb8d2a19-61d6-4632-946c-17ea012bab8c?fit=cover&h=768&w=768',tags:['Protein Rich','Vegetarian','Spicy'],protein:21,calories:390,spiceLevel:'medium',isVegetarian:true,mealType:'dinner',cuisine:'Indian',ingredients:['paneer','capsicum','spices'],reviewSummary:'Grilled paneer with smoky spices.'},
    {id:'v507',name:'Paneer Butter Masala',restaurant:'Green Flame',rating:4.6,price:230,icon:'🥘',photo:'https://i-media.vyaparify.com/vcards/blogs/77203/Ayodhya-Veg-Indian-Menu.jpeg',tags:['Vegetarian'],protein:16,calories:520,spiceLevel:'medium',isVegetarian:true,mealType:'dinner',cuisine:'Indian',ingredients:['paneer','tomato','butter'],reviewSummary:'Creamy tomato gravy with paneer.'},
    {id:'v508',name:'Butter Chicken',restaurant:'Punjabi Zaika',rating:4.7,price:260,icon:'🍗',photo:'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy%2Cf_auto%2Cq_auto%2Cw_300%2Ch_300%2Cc_fit/FOOD_CATALOG/IMAGES/CMS/2025/5/14/8da24f59-f16a-4889-bb25-dd76fe5a7a31_84702f1f-7973-4c1a-9886-fd318dd79649.jpg',tags:['Chicken'],protein:28,calories:610,spiceLevel:'medium',isVegetarian:false,mealType:'dinner',cuisine:'Indian',ingredients:['chicken','tomato','butter','cream'],reviewSummary:'Creamy butter chicken with tender pieces.'},
    {id:'v509',name:'Samosa',restaurant:'Chai Corner',rating:4.5,price:30,icon:'🥟',photo:'https://images.unsplash.com/photo-1572099107898-46f22b3af4f9?auto=format&fit=crop&fm=jpg&q=70&w=900',tags:['Vegetarian','Budget Friendly','Spicy'],protein:4,calories:180,spiceLevel:'medium',isVegetarian:true,mealType:'snack',cuisine:'Indian',ingredients:['potato','peas','flour','spices'],reviewSummary:'Crisp pastry with a spiced potato filling.'},
    {id:'v510',name:'Masala Chai',restaurant:'Chai Corner',rating:4.5,price:25,icon:'☕',photo:'https://www.omichef.com/cdn/shop/articles/Screenshot_2026-05-07_175146.png?v=1778156570&width=1600',tags:['Vegetarian','Budget Friendly','Sweet'],protein:2,calories:90,spiceLevel:'mild',isVegetarian:true,mealType:'snack',cuisine:'Indian',ingredients:['tea','milk','spices'],reviewSummary:'Masala tea for a quick low-cost refreshment.'},
    {id:'v511',name:'Spaghetti Arrabbiata',restaurant:'La Piazza',rating:4.6,price:199,icon:'🍝',photo:'https://images.unsplash.com/photo-1627042633145-b780d842ba45?auto=format&fit=crop&q=75&w=900',tags:['Vegetarian','Spicy'],protein:9,calories:480,spiceLevel:'medium',isVegetarian:true,mealType:'dinner',cuisine:'Italian',ingredients:['pasta','tomato','chilli','garlic'],reviewSummary:'Tomato pasta with a clear chilli kick.'},
    {id:'v512',name:'Vegetable Noodles',restaurant:'Wok Express',rating:4.5,price:159,icon:'🍜',photo:'https://images.unsplash.com/photo-1704253514532-7d9781b39b45?auto=format&fit=crop&q=75&w=900',tags:['Vegetarian','Budget Friendly'],protein:8,calories:430,spiceLevel:'mild',isVegetarian:true,mealType:'dinner',cuisine:'Chinese',ingredients:['noodles','vegetables','soy'],reviewSummary:'Stir-fried noodles with mixed vegetables.'},
    {id:'v513',name:'Sushi Platter',restaurant:'Tokyo Table',rating:4.6,price:299,icon:'🍣',photo:'https://wallpapers.com/images/hd/sushi-4000-x-3000-background-06vau7pnyafdkap3.jpg',tags:['Protein Rich'],protein:24,calories:420,spiceLevel:'mild',isVegetarian:false,mealType:'dinner',cuisine:'Japanese',ingredients:['rice','fish','seaweed'],reviewSummary:'Mixed sushi platter with a lighter meal profile.'},
    {id:'v514',name:'Classic Margherita Pizza',restaurant:'Oven Story',rating:4.6,price:249,icon:'🍕',photo:'https://images.unsplash.com/photo-1689793606720-be22e34c9322?auto=format&fit=crop&q=75&w=900',tags:['Vegetarian','Pizza'],protein:12,calories:560,spiceLevel:'mild',isVegetarian:true,mealType:'dinner',cuisine:'Italian',ingredients:['dough','tomato','mozzarella','basil'],reviewSummary:'Cheese, tomato and basil on a classic pizza base.'},
    {id:'v515',name:'Chocolate Ice Cream',restaurant:'Sweet Scoops',rating:4.7,price:89,icon:'🍨',photo:'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&q=75&w=900',tags:['Vegetarian','Sweet','Budget Friendly'],protein:4,calories:260,spiceLevel:'none',isVegetarian:true,mealType:'dessert',cuisine:'Dessert',ingredients:['milk','cocoa','sugar'],reviewSummary:'Creamy chocolate dessert.'},
    {id:'v516',name:'Strawberry Milkshake',restaurant:'Shake Street',rating:4.6,price:159,icon:'🥤',photo:'https://palacsintapalota.hu/uploads/products/milkshake/eper-milkshake-20260713.webp',tags:['Milkshake','Sweet','Vegetarian'],protein:7,calories:390,spiceLevel:'none',isVegetarian:true,mealType:'dessert',cuisine:'Dessert',ingredients:['milk','strawberry','ice cream'],reviewSummary:'Sweet strawberry milkshake with a creamy texture.'},
    {id:'v517',name:'Chicken Burger Deluxe',restaurant:'Burger Yard',rating:4.8,price:239,icon:'🍔',photo:'https://images.unsplash.com/photo-1713330801172-03f8d1c0dde7?auto=format&fit=crop&q=75&w=900',tags:['Burger','Chicken','Fast Food'],protein:24,calories:650,spiceLevel:'medium',isVegetarian:false,mealType:'lunch',cuisine:'Fast Food',ingredients:['chicken','bun','lettuce','sauce'],reviewSummary:'Crispy chicken burger with fresh toppings.'},
    {id:'v518',name:'Veg Fried Rice',restaurant:'Wok Express',rating:4.6,price:120,icon:'🍚',photo:'https://cfdefaultstorage.blob.core.windows.net/cfimages/data/fried_rice_top_large_12.jpg',tags:['Fried Rice','Budget Friendly','Vegetarian'],protein:8,calories:470,spiceLevel:'medium',isVegetarian:true,mealType:'lunch',cuisine:'Chinese',ingredients:['rice','vegetables','soy'],reviewSummary:'Mixed-vegetable fried rice at an accessible price.'},
    {id:'v519',name:'Chicken Fried Rice',restaurant:'Wok Express',rating:4.7,price:190,icon:'🍚',photo:'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy%2Cf_auto%2Cq_auto/FOOD_CATALOG/IMAGES/CMS/2025/10/15/0257b0d6-ed0c-44d3-b686-1d1a622b2f2c_84046189-02af-40cb-a7ca-89eac5681d3b.jpg_compressed',tags:['Fried Rice','Chicken','Protein Rich'],protein:22,calories:540,spiceLevel:'medium',isVegetarian:false,mealType:'lunch',cuisine:'Chinese',ingredients:['rice','chicken','egg','vegetables'],reviewSummary:'Filling chicken fried rice with vegetables.'},
    {id:'v520',name:'Chicken Biryani',restaurant:'Spice Route',rating:4.8,price:220,icon:'🍛',photo:'https://chups.com/m2m/hyundai/food-images/Chicken-Biriyani.webp',tags:['Biryani','Chicken','Spicy','Protein Rich'],protein:22,calories:680,spiceLevel:'medium',isVegetarian:false,mealType:'dinner',cuisine:'Indian',ingredients:['chicken','basmati rice','spices'],reviewSummary:'Aromatic rice with spiced chicken.'}
  ];
  const ids=new Set(DATA.foods.map(f=>f.id));MORE.forEach(f=>{if(!ids.has(f.id))DATA.foods.push(f)});
  DATA.categories=[['Healthy','🥗'],['Protein Rich','💪'],['Budget Friendly','💸'],['Burger','🍔'],['Biryani','🍛'],['Fried Rice','🍚'],['Noodles','🍜'],['Pizza','🍕'],['Milkshake','🥤'],['Vegetarian','🌿'],['Spicy','🌶️']];

  DATA.foods.forEach(f=>{
    f.tags=f.tags||[];
    f.protein=Number(f.protein??((f.tags.includes('Protein Rich')?20:8)));
    f.calories=Number(f.calories??350);
    f.isVegetarian=f.isVegetarian??(f.diet==='Veg');
    f.diet=f.isVegetarian?'Veg':'Non-veg';
    f.spiceLevel=f.spiceLevel||f.spice||'mild';
    f.mealType=f.mealType||'dinner';
    f.cuisine=f.cuisine||'Indian';
    f.rating=Number(f.rating||4.5);
    f.popularity=Number(f.popularity||75);
    f.ingredients=f.ingredients||[];
    f.reviewSummary=f.reviewSummary||'Demo review summary based only on this food entry.';
    f.oilLevel=f.oilLevel||(/salad|fruit|oats|idli|boiled/i.test(f.name)?'low':/fried|burger|pizza|wings|butter/i.test(f.name)?'high':'medium');
    if(/grilled chicken breast/i.test(f.name) && !f.tags.includes('Healthy')) f.tags.push('Healthy');
    f.healthy=Boolean(f.tags.includes('Healthy')||((f.calories<=400)&&(f.oilLevel==='low')));
  });

  /* ---------- intent + strict filters ---------- */
  function money(q){
    let m=q.match(/(?:under|below|less than|within|up to|upto|max(?:imum)?|budget(?: of)?|for)\s*₹?\s*(\d{1,5})/i);
    if(!m)m=q.match(/₹\s*(\d{1,5})/i);
    return m?Number(m[1]):null;
  }
  function parseIntent(message,ctx={}){
    const q=String(message||'').toLowerCase().trim(), p={
      raw:q,maxPrice:money(q),minPrice:null,highProtein:false,healthy:false,vegetarian:false,nonVeg:false,
      spicy:false,lowOil:false,sweet:false,category:null,mealType:null,cuisine:null,exclude:[],quantity:null,
      sort:null,similar:false,open:null,action:null
    };
    const min=q.match(/(?:over|above|more than|at least|minimum)\s*₹?\s*(\d+)/i);if(min)p.minPrice=Number(min[1]);
    const qt=q.match(/\b(?:add|order|want|give me)\s+(\d+)\b/i);if(qt)p.quantity=Number(qt[1]);
    if(any(q,['protein','high protein','post workout','post-workout','gym','muscle']))p.highProtein=true;
    if(any(q,['healthy','healthier','clean','light food','low calorie','fit']))p.healthy=true;
    const vegCue=any(q,['vegetarian','veg only','veg food','no meat','without chicken','no chicken']);
    const nonVegCue=any(q,['non veg','non-veg','nonveg','chicken','egg','beef','mutton','fish','meat']);
    if(vegCue)p.vegetarian=true;
    if(nonVegCue&&!vegCue)p.nonVeg=true;
    if(any(q,['spicy','hot','fiery','extra spicy','extra spice']))p.spicy=true;
    if(any(q,['not too oily','less oil','low oil','not oily','without too much oil','lightly cooked']))p.lowOil=true;
    if(any(q,['sweet','dessert','something sweet','sweet craving']))p.sweet=true;
    const cats=[['burger',['burger']],['milkshake',['milkshake','shake']],['fried rice',['fried rice']],['biryani',['biryani']],['pizza',['pizza']],['noodles',['noodle','noodles']],['chicken',['chicken']],['paneer',['paneer']],['egg',['egg','eggs']],['oats',['oats']],['dosa',['dosa']],['idli',['idli']],['momos',['momo']],['sushi',['sushi']],['pasta',['pasta','spaghetti']],['salad',['salad']],['fruit',['fruit bowl','fruit']]];
    for(const [c,w] of cats){if(any(q,w)){p.category=c;break}}
    if(any(q,['breakfast','morning']))p.mealType='breakfast';else if(any(q,['lunch','afternoon']))p.mealType='lunch';else if(any(q,['dinner','evening','at night','night']))p.mealType='dinner';
    if(any(q,['south indian','south-indian']))p.cuisine='south indian';else if(any(q,['chinese','indo chinese']))p.cuisine='chinese';else if(any(q,['italian']))p.cuisine='italian';else if(any(q,['japanese','sushi']))p.cuisine='japanese';
    if(any(q,['highest protein','most protein','maximum protein']))p.sort='protein';else if(any(q,['cheapest','lowest price','most affordable']))p.sort='price';else if(any(q,['highest rated','best rated']))p.sort='rating';
    if(any(q,['similar to my previous order','similar to previous','like my previous order','same as my last order','like my last order','previous meal']))p.similar=true;
    const ex=q.match(/(?:without|no|exclude|avoid)\s+([^,.!?]+)/i);if(ex)ex[1].split(/\s+and\s+|,/).map(x=>x.trim()).filter(Boolean).forEach(x=>p.exclude.push(x));
    const op=q.match(/\b(?:open|go to|take me to|show me)\s+(home|discover|orders?|profile|settings?|cart)\b/i);if(op)p.open=op[1].startsWith('order')?'orders':op[1].startsWith('setting')?'settings':op[1];
    if(/\b(add|put)\b.*\b(cart|basket)\b/i.test(q)||/\badd\b.*\b(first|one|it|that)\b/i.test(q)||/\badd\s+\d+\b/i.test(q))p.action='add';
    if(/\b(remove|delete)\b/i.test(q))p.action='remove';
    Object.entries(ctx||{}).forEach(([k,v])=>{
      if((vegCue||nonVegCue)&&(k==='vegetarian'||k==='nonVeg')) return;
      if(p[k]===null||p[k]===false||p[k]===undefined){if(k==='exclude'&&Array.isArray(v))p.exclude=[...v];else if(v!==null&&v!==undefined)p[k]=v}
    });
    if(vegCue){p.vegetarian=true;p.nonVeg=false;}
    if(nonVegCue&&!vegCue){p.nonVeg=true;p.vegetarian=false;}
    p.raw=q;return p;
  }
  function any(q,a){return a.some(x=>q.includes(x))}
  function foodText(f){return `${f.name} ${f.restaurant} ${(f.tags||[]).join(' ')} ${f.cuisine} ${(f.ingredients||[]).join(' ')}`.toLowerCase()}
  function learned(){const w={};[...(DATA.orders||[]),...load('mowmowOrderHistoryV5',[])].forEach(o=>{const f=DATA.foods.find(x=>x.name===o.food);if(f)(f.tags||[]).forEach(t=>w[t]=(w[t]||0)+1)});Object.entries(state.aiPrefs||{}).forEach(([k,v])=>w[k]=(w[k]||0)+Number(v||0));return w}
  function hardMatch(f,p){
    if(p.maxPrice!==null&&f.price>p.maxPrice)return false;
    if(p.minPrice!==null&&f.price<p.minPrice)return false;
    if(p.vegetarian&&!f.isVegetarian)return false;
    if(p.nonVeg&&f.isVegetarian)return false;
    if(p.highProtein&&f.protein<15)return false;
    if(p.healthy&&!f.healthy)return false;
    if(p.spicy&&!(['medium','hot'].includes(String(f.spiceLevel).toLowerCase())||f.tags.includes('Spicy')))return false;
    if(p.lowOil&&f.oilLevel==='high')return false;
    if(p.sweet&&!(/milkshake|ice cream|dessert|sweet|chai/i.test(f.name)||f.tags.includes('Sweet')))return false;
    if(p.mealType&&f.mealType!==p.mealType)return false;
    if(p.cuisine&&!String(f.cuisine).toLowerCase().includes(p.cuisine))return false;
    if(p.exclude?.some(x=>foodText(f).includes(x)))return false;
    if(p.category){const terms={burger:['burger'],milkshake:['milkshake','shake'],['fried rice']:['fried rice'],biryani:['biryani'],pizza:['pizza'],noodles:['noodle'],chicken:['chicken'],paneer:['paneer'],egg:['egg'],oats:['oats'],dosa:['dosa'],idli:['idli'],momos:['momo'],sushi:['sushi'],pasta:['pasta','spaghetti'],salad:['salad'],fruit:['fruit']};if(!any(foodText(f),terms[p.category]||[p.category]))return false}
    return true;
  }
  function score(f,p){const w=learned();let s=f.rating*3+f.popularity/20;const reasons=[];if(p.maxPrice!==null){s+=20;reasons.push(`within ₹${p.maxPrice}`)}if(p.highProtein){s+=Math.min(40,f.protein);reasons.push(`${f.protein}g protein`)}if(p.healthy){s+=18;reasons.push('healthy match')}if(p.vegetarian){s+=16;reasons.push('vegetarian')}if(p.nonVeg){s+=14;reasons.push('non-veg match')}if(p.spicy){s+=14;reasons.push('spicy preference')}if(p.lowOil){s+=14;reasons.push('lower oil')}if(p.sweet){s+=10;reasons.push('sweet craving')}if(p.category){s+=24;reasons.push(`${p.category} match`)}if(p.mealType){s+=10;reasons.push(`${p.mealType} fit`)}if(p.similar){const x=(f.tags||[]).reduce((a,t)=>a+(w[t]||0),0);s+=Math.min(24,x*3);if(x)reasons.push('fits your order history')}const terms=p.raw.replace(/₹?\d+/g,'').split(/\s+/).filter(x=>x.length>3&&!['under','healthy','protein','something','show','give','want','food','meal','with','please','need','high'].includes(x));const t=terms.find(x=>foodText(f).includes(x));if(t){s+=10;reasons.push(`matches “${t}”`)}const pw=(f.tags||[]).reduce((a,t)=>a+(w[t]||0),0);if(pw){s+=Math.min(12,pw*2);reasons.push('personalized for you')}return{score:Math.max(0,Math.min(99,Math.round(s))),reasons:[...new Set(reasons)].slice(0,4)}}
  function rank(p){let rows=DATA.foods.filter(f=>hardMatch(f,p)).map(f=>({...f,_ai:score(f,p)}));if(p.sort==='protein')rows.sort((a,b)=>b.protein-a.protein||b._ai.score-a._ai.score);else if(p.sort==='price')rows.sort((a,b)=>a.price-b.price||b._ai.score-a._ai.score);else if(p.sort==='rating')rows.sort((a,b)=>b.rating-a.rating||b._ai.score-a._ai.score);else rows.sort((a,b)=>b._ai.score-a._ai.score);return rows}
  function describe(p){const a=[];if(p.category)a.push(p.category);if(p.maxPrice!==null)a.push(`under ₹${p.maxPrice}`);if(p.highProtein)a.push('high protein');if(p.healthy)a.push('healthy');if(p.vegetarian)a.push('vegetarian');if(p.nonVeg)a.push('non-veg');if(p.spicy)a.push('spicy');if(p.lowOil)a.push('lower oil');if(p.mealType)a.push(p.mealType);return a.join(' · ')||'your craving'}
  function aiProcess(message){const p=parseIntent(message,ai.context);ai.context=Object.fromEntries(Object.entries(p).filter(([k,v])=>!['raw','action','open'].includes(k)&&v!==null&&v!==false&&(Array.isArray(v)?v.length:true)));const rows=rank(p);ai.lastResults=rows.slice(0,8).map(x=>x.id);ai.lastQuery=message;let response='';if(!rows.length)response=p.maxPrice!==null?`I couldn\'t find a food that satisfies every hard filter under ₹${p.maxPrice}. I did not relax your budget.`:'I couldn\'t find a food that satisfies every hard filter. Try changing one preference.';else if(p.sort==='protein')response=`${rows[0].name} has the highest protein among these matches at ${rows[0].protein}g.`;else if(p.maxPrice!==null&&p.highProtein)response=`I found ${Math.min(5,rows.length)} high-protein options within ₹${p.maxPrice}.`;else response=`Got it — showing ${Math.min(5,rows.length)} ${describe(p)} option${rows.length===1?'':'s'}.`;return {p,rows,response}}
  window.AIEngine={process:aiProcess};

  /* ---------- UI ---------- */
  function ensureChat(){
    const hero=$q('#pageDiscover .discover-hero');if(!hero)return;
    let chat=$q('#mowAIChat');if(!chat){chat=document.createElement('div');chat.id='mowAIChat';chat.className='ai-chat';chat.innerHTML=`<div class="ai-chat-head"><div class="ai-orb">✦</div><div class="ai-chat-copy"><strong>MowMow AI</strong><small>Ask, refine, compare, add to cart</small></div><button class="icon-btn" id="mowClearAI">↺</button></div><div class="ai-chat-messages" id="mowAIMessages"></div><div class="ai-chat-compose"><input id="mowAIInput" placeholder="Try: chicken under ₹200"><button id="mowAIMic" aria-label="Use MowMow voice">${icon('mic')}</button><button id="mowAISend" aria-label="Send">➤</button></div>`;hero.after(chat)}
    const bindOnce=el=>{if(el&&el.dataset.bound)return false;if(el)el.dataset.bound='1';return true};
    if(bindOnce($q('#mowAIInput'))) $q('#mowAIInput').addEventListener('keydown',e=>{if(e.key==='Enter'){$q('#mowAISend').click()}});
    if(bindOnce($q('#mowAISend'))) $q('#mowAISend').onclick=()=>{const q=$q('#mowAIInput').value.trim();if(q){handleAI(q);$q('#mowAIInput').value=''}else toast('Tell MowMow what you want first')};
    if(bindOnce($q('#mowAIMic'))) $q('#mowAIMic').onclick=()=>startVoice($q('#mowAIInput'));
    if(bindOnce($q('#mowClearAI'))) $q('#mowClearAI').onclick=()=>{ai.history=[];ai.context={};ai.lastResults=[];saveAI();renderAIChat()};
  }
  function renderAIChat(){const b=$q('#mowAIMessages');if(!b)return;const h=ai.history.slice(-12);b.innerHTML=h.length?h.map(x=>`<div class="ai-msg ${x.role==='user'?'user':'ai'}">${esc2(x.content)}</div>`).join(''):`<div class="ai-msg ai">Hey! What are you craving?<br><span style="opacity:.75">Try “healthy chicken under ₹200”, “highest protein”, or “add the first one to cart”.</span></div>`;b.scrollTop=b.scrollHeight}
  function handleAI(q){const r=aiProcess(q),p=r.p,rows=r.rows;ai.history.push({role:'user',content:q,at:Date.now()});let response=r.response;let actionDone=false;if(p.open){switchRoute(p.open);actionDone=true}else if(/\b(add|put)\b.*\b(cart|basket)\b/i.test(q)||/\badd\b.*\b(first|one|it|that)\b/i.test(q)){const f=DATA.foods.find(x=>x.id===ai.lastResults[0]);if(f){addToCart(f);response=`Added ${f.name} to your cart.`;actionDone=true}}else if(/\badd\s+(\d+)\b/i.test(q)){const n=Math.max(1,Number(q.match(/\badd\s+(\d+)\b/i)[1]));const f=DATA.foods.find(x=>x.id===ai.lastResults[0]);if(f){for(let i=0;i<n;i++)addToCart(f);response=`Added ${n} × ${f.name} to your cart.`;actionDone=true}}else if(/\b(?:open|go to|show)\s+(?:my\s+)?cart\b/i.test(q)){switchRoute('cart');response='Opening your cart.';actionDone=true}else if(/\b(?:open|go to)\s+(?:my\s+)?orders?\b/i.test(q)){switchRoute('orders');response='Opening your orders.';actionDone=true}else if(/\b(?:open|go to)\s+(?:my\s+)?profile\b/i.test(q)){switchRoute('profile');response='Opening your profile.';actionDone=true}else if(/\b(?:open|go to)\s+settings?\b/i.test(q)){switchRoute('settings');response='Opening settings.';actionDone=true}else if(/\bremove\s+(.+)/i.test(q)){const term=q.match(/\bremove\s+(.+)/i)[1],item=state.cart.find(x=>x.name.toLowerCase().includes(term));if(item){removeItem(item.id);response=`Removed ${item.name} from your cart.`;actionDone=true}}if(!actionDone)switchRoute('discover');ai.history.push({role:'assistant',content:response,at:Date.now()});saveAI();const ds=$q('#discoverSearch');if(ds)ds.value=q;const di=$q('#mowAIInput');if(di)di.value='';renderDiscover();renderAIChat();speak2(response);}

  /* ---------- Discover ---------- */
  window.renderDiscover=function(){
    ensureDiscoverUpload();ensureChat();ensureVoiceUI();ensureMood();
    const chips=['Healthy','Protein Rich','Budget Friendly','Vegetarian','Spicy','Burger','Milkshake','Fried Rice','Biryani','Pizza','Noodles'];
    const cb=$q('#discoverChips');if(cb){cb.innerHTML=chips.map(c=>`<button class="chip ${state.chip===c?'active':''}" data-v5-chip="${esc2(c)}">${esc2(c)}</button>`).join('');cb.querySelectorAll('[data-v5-chip]').forEach(b=>b.onclick=()=>{state.chip=state.chip===b.dataset.v5Chip?'':b.dataset.v5Chip;$q('#discoverSearch').value='';$q('#mowAIInput').value='';renderDiscover()})}
    const q=($q('#discoverSearch')?.value||'').trim();let p=parseIntent(q,{});if(state.chip==='Healthy')p.healthy=true;if(state.chip==='Protein Rich')p.highProtein=true;if(state.chip==='Budget Friendly')p.maxPrice=150;if(state.chip==='Vegetarian')p.vegetarian=true;if(state.chip==='Spicy')p.spicy=true;if(['Burger','Milkshake','Fried Rice','Biryani','Pizza','Noodles'].includes(state.chip))p.category=state.chip.toLowerCase();p.raw=q;
    let rows=rank(p);if(!q&&!state.chip){rows=rank({raw:'',maxPrice:null,minPrice:null,highProtein:false,healthy:false,vegetarian:false,nonVeg:false,spicy:false,lowOil:false,sweet:false,category:null,mealType:null,cuisine:null,exclude:[],quantity:null,sort:'rating',similar:true}).slice(0,8)}
    ai.lastResults=rows.slice(0,10).map(x=>x.id);
    $q('#aiAssistText').textContent=q?`AI understood: ${describe(p)} · ${rows.length} exact match${rows.length===1?'':'es'}`:(state.chip?`Showing ${state.chip.toLowerCase()} picks.`:'Tell MowMow your craving, budget, health goal or protein target.');
    const list=$q('#aiList');list.innerHTML=rows.slice(0,10).map(f=>`<div class="food-card" data-v5-food="${f.id}">${foodThumb(f)}<div class="info"><div class="name">${esc2(f.name)}</div><div class="meta">${esc2(f.restaurant)} · ${f.rating.toFixed(1)}★ · ${f.protein}g protein · ${f.calories} kcal</div><div class="small-row"><span class="price">₹${f.price}</span><span class="small-muted">${esc2((f.tags||[]).slice(0,3).join(' · '))}</span></div><div class="ai-meta"><span class="ai-badge">✦ AI ${f._ai.score}%</span><button class="reason-btn" data-v5-reason="${f.id}">Why this?</button></div></div><div class="card-end"><button type="button" data-v5-add="${f.id}">Add +</button></div></div>`).join('')||'<div class="empty">No food satisfies those exact filters. MowMow will not show unrelated items just to fill the screen.</div>';
    list.querySelectorAll('[data-v5-food]').forEach(b=>b.onclick=e=>{if(e.target.closest('[data-v5-add]')||e.target.closest('[data-v5-reason]'))return;openFood(b.dataset.v5Food)});
    list.querySelectorAll('[data-v5-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();const f=DATA.foods.find(x=>x.id===b.dataset.v5Add);if(f)addToCart(f)});
    list.querySelectorAll('[data-v5-reason]').forEach(b=>b.onclick=e=>{e.stopPropagation();why(b.dataset.v5Reason,p)});
    renderAIChat();bindLegacySearch();bindDynamicPhotos();
  };

  function why(id,p){const f=DATA.foods.find(x=>x.id===id);if(!f)return;const m=score(f,p);const c=[];if(p.maxPrice!==null)c.push(`✓ Within your ₹${p.maxPrice} budget`);if(p.highProtein)c.push(`✓ High protein: ${f.protein}g`);if(p.healthy)c.push('✓ Meets the healthy filter');if(p.vegetarian)c.push('✓ Vegetarian');if(p.nonVeg)c.push('✓ Non-vegetarian');if(p.spicy)c.push('✓ Spicy match');if(p.lowOil)c.push('✓ Lower-oil option');if(p.category)c.push(`✓ Matches ${p.category}`);if(!c.length)c.push('✓ Matches MowMow’s current recommendation ranking');openModal('Why this?',`<div class="ai-summary"><div class="name" style="font-size:16px">${esc2(f.name)}</div><div class="meta">₹${f.price} · ${f.protein}g protein · ${f.calories} kcal · ${esc2(f.cuisine)}</div><div class="ai-meta"><span class="ai-badge">✦ ${m.score}% match</span></div><div style="margin-top:7px">${c.map(x=>`<div>${esc2(x)}</div>`).join('')}</div><div class="ai-summary"><b>AI Summary</b><br>${esc2(f.reviewSummary)}</div></div>`,'<div class="modal-actions"><button class="secondary" onclick="closeModal()">Close</button><button class="primary" id="v5WhyAdd">Add to cart</button></div>');$q('#v5WhyAdd').onclick=()=>{addToCart(f);closeModal()}}

  /* ---------- Home personalization ---------- */
  function ensureHomeAI(){const sc=$q('#pageHome .scroll');if(!sc)return;if(!$q('#mowHomeAI')){const sec=document.createElement('div');sec.id='mowHomeAI';sec.innerHTML='<p class="section">MOWMOW AI</p><div class="ai-assist"><div class="ai-orb">✦</div><div class="ai-copy"><strong>Ask MowMow AI</strong><small>Say what you want or search naturally.</small></div><button id="mowHomeAsk">Ask now</button></div><p class="section">RECOMMENDED FOR YOU</p><div class="card-list" id="mowHomePicks"></div>';sc.insertBefore(sec,sc.firstChild)}$q('#mowHomeAsk').onclick=()=>{switchRoute('discover');setTimeout(()=>{$q('#mowAIInput')?.focus()},30)};const p={raw:'personalized',maxPrice:null,minPrice:null,highProtein:false,healthy:false,vegetarian:false,nonVeg:false,spicy:false,lowOil:false,sweet:false,category:null,mealType:null,cuisine:null,exclude:[],quantity:null,sort:'rating',similar:true};const rows=rank(p).slice(0,4),box=$q('#mowHomePicks');if(box)box.innerHTML=rows.map(f=>`<div class="food-card">${foodThumb(f)}<div class="info"><div class="name">${esc2(f.name)}</div><div class="meta">${esc2(f.restaurant)} · ${f.protein}g protein</div><div class="small-row"><span class="price">₹${f.price}</span><span>${f.rating.toFixed(1)}★</span></div></div><div class="card-end"><button data-mowhomeadd="${f.id}">Add +</button></div></div>`).join('');box?.querySelectorAll('[data-mowhomeadd]').forEach(b=>b.onclick=()=>{const f=DATA.foods.find(x=>x.id===b.dataset.mowhomeadd);if(f)addToCart(f)});bindDynamicPhotos()}

  /* ---------- moods ---------- */
  function ensureMood(){const chips=$q('#discoverChips');if(!chips||$q('#mowMoodRow'))return;const row=document.createElement('div');row.id='mowMoodRow';row.className='mood-row';row.innerHTML=[['happy','😊 Happy'],['sad','😔 Sad'],['tired','😴 Tired'],['spicy','🔥 Craving spicy'],['sweet','🍰 Want something sweet'],['workout','💪 Post-workout']].map(([id,t])=>`<button class="mood ${ai.mood===id?'active':''}" data-mowmood="${id}">${t}</button>`).join('');chips.after(row);row.querySelectorAll('[data-mowmood]').forEach(b=>b.onclick=()=>{ai.mood=b.dataset.mowmood;saveAI();row.querySelectorAll('.mood').forEach(x=>x.classList.toggle('active',x===b));const terms={happy:'something sweet',sad:'comfort food',tired:'light food',spicy:'spicy food',sweet:'something sweet',workout:'high protein dinner'};const x=terms[ai.mood];$q('#discoverSearch').value=x;$q('#mowAIInput').value=x;state.chip='';renderDiscover()})}

  /* ---------- image identification with real browser-side model ---------- */
  let vision=null,visionLoading=null,imageURL='';
  async function visionPipe(){if(vision)return vision;if(visionLoading)return visionLoading;visionLoading=(async()=>{const m=await import(VISION_CDN);vision=await m.pipeline('zero-shot-image-classification',VISION_MODEL);return vision})().finally(()=>visionLoading=null);return visionLoading}
  function ensureDiscoverUpload(){const sc=$q('#pageDiscover .scroll');if(!sc)return;if(!$q('#mowFoodIdentify')){const box=document.createElement('div');box.id='mowFoodIdentify';box.className='upload-box';box.innerHTML='<h4>📷 Identify Food</h4><p>Upload a photo and MowMow will compare it against the menu using an in-browser vision model.</p><div class="upload-actions"><label class="upload-action" for="mowFoodFile">Choose image</label><label class="upload-action" for="mowFoodCamera">Use camera</label></div><input id="mowFoodFile" type="file" accept="image/*" hidden><input id="mowFoodCamera" type="file" accept="image/*" capture="environment" hidden><img id="mowFoodPreview" class="upload-preview" alt="Selected food"><div id="mowVisionStatus" class="vision-status" style="display:none"></div>';sc.insertBefore(box,sc.firstElementChild?.nextElementSibling||sc.firstChild);$q('#mowFoodFile').addEventListener('change',identifyImage);$q('#mowFoodCamera').addEventListener('change',identifyImage)}}
  async function identifyImage(e){const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith('image/')){toast('Please choose an image file');e.target.value='';return}if(file.size>12*1024*1024){toast('Please choose an image under 12 MB');e.target.value='';return}const pre=$q('#mowFoodPreview'),st=$q('#mowVisionStatus');if(!pre||!st)return;if(imageURL)URL.revokeObjectURL(imageURL);imageURL=URL.createObjectURL(file);pre.src=imageURL;pre.style.display='block';st.style.display='block';st.innerHTML='<b>Image selected.</b><br>Loading the browser vision model. The first run downloads model files and needs internet access.';try{const pipe=await visionPipe();st.innerHTML='<b>Analyzing…</b><br>Comparing your photo with MowMow food labels.';const labels=['grilled chicken','chicken biryani','chicken fried rice','chicken burger','tandoori chicken','chicken wings','chicken momos','chicken rice bowl','butter chicken','boiled eggs','egg fried rice','egg dosa','paneer tikka','paneer butter masala','veg fried rice','vegetable noodles','masala dosa','idli sambar','fresh salad','fruit bowl','protein oats','pasta','pizza','sushi','samosa','masala chai','milkshake','ice cream'];const out=await pipe(imageURL,labels);const top=out.slice(0,5);const bestForLabel=label=>{const words=label.toLowerCase().split(/\s+/).filter(Boolean);let best=null,bestScore=-1;for(const f of DATA.foods){const name=f.name.toLowerCase();const sc=words.reduce((n,w)=>n+(name.includes(w)?2:foodText(f).includes(w)?1:0),0);if(sc>bestScore){bestScore=sc;best=f}}return best};st.innerHTML='<b>Possible matches</b><div class="vision-grid">'+top.map(x=>{const pct=Math.round((Number(x.score)||0)*100);const name=x.label.replace(/\b\w/g,c=>c.toUpperCase());const f=bestForLabel(x.label);return `<div class="vision-chip"><b>${esc2(name)}</b>${pct}% confidence${f?`<br><button data-v5vision="${f.id}">Search ${esc2(f.name)}</button>`:''}</div>`}).join('')+'</div><div style="margin-top:7px;font-size:8.5px;color:var(--muted)">Model prediction only — not guaranteed identification.</div>';st.querySelectorAll('[data-v5vision]').forEach(b=>b.onclick=()=>{const f=DATA.foods.find(x=>x.id===b.dataset.v5vision);if(f){$q('#discoverSearch').value=f.name;state.chip='';renderDiscover();}})}catch(err){st.innerHTML='<b>Food identification could not run.</b><br>The image preview is working, but the browser vision model could not be loaded. Check internet access and open MowMow through localhost/HTTPS. Direct file mode may block remote model loading. No fake identification is shown.';}}
  window.identifyFoodFromImage=identifyImage;

  /* ---------- voice ---------- */
  let recognition=null,voiceStream=null;
  function ensureVoiceUI(){const page=$q('#pageDiscover');if(!page||$q('#mowVoiceState'))return;const box=document.createElement('div');box.id='mowVoiceState';box.className='voice-state';box.innerHTML='<span class="voice-dot"></span><span id="mowVoiceText">Listening…</span><button id="mowVoiceStop" style="margin-left:auto;border:0;background:var(--deep);color:#fff;border-radius:99px;padding:5px 8px;font-size:9px;font-weight:900">Stop</button>';const hero=page.querySelector('.discover-hero');hero.after(box);$q('#mowVoiceStop').onclick=stopVoice}
  function voiceUI(on,text){const b=$q('#mowVoiceState');if(b){b.classList.toggle('show',!!on);$q('#mowVoiceText').textContent=text||'Listening…'}}
  function stopVoice(){try{recognition?.stop()}catch{}recognition=null;if(voiceStream){voiceStream.getTracks().forEach(t=>t.stop());voiceStream=null}voiceUI(false)}
  function voiceInfo(msg){openModal('MowMow Voice Assistant',`<p>${esc2(msg)}</p><p class="voice-status">Browser voice is separate from ChatGPT Voice. MowMow uses your browser's SpeechRecognition API. For reliable microphone permission, use Chrome/Edge from localhost or HTTPS; typed AI chat always remains available.</p>`,'<div class="modal-actions"><button class="primary" onclick="closeModal()">Close</button></div>')}
  async function startVoice(target){if(recognition){stopVoice();return}const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R){voiceInfo('This browser does not provide SpeechRecognition. Try Chrome or Edge and allow microphone access.');return}if(navigator.mediaDevices?.getUserMedia){try{voiceStream=await navigator.mediaDevices.getUserMedia({audio:true})}catch(err){if(['NotAllowedError','PermissionDeniedError'].includes(err?.name)){voiceInfo('Microphone permission was denied. Allow microphone access for this site, then try again.');return}}}let r;try{r=new R()}catch{voiceInfo('Speech recognition could not be started in this browser.');return}recognition=r;r.lang='en-IN';r.continuous=false;r.interimResults=true;r.maxAlternatives=1;r.onstart=()=>{voiceUI(true,'Listening… speak now');toast('MowMow is listening…');target?.focus()};r.onresult=e=>{let interim='',final='';for(let i=e.resultIndex||0;i<e.results.length;i++){const t=e.results[i]?.[0]?.transcript||'';e.results[i].isFinal?final+=t:interim+=t}const txt=(final||interim).trim();if(target&&txt)target.value=txt;voiceUI(true,txt?`Heard: ${txt}`:'Listening…');if(final.trim())setTimeout(()=>handleAI(final.trim()),10)};r.onerror=e=>{const code=e?.error||'unknown';let msg='Voice input failed. Try again or type the request.';if(code==='not-allowed'||code==='service-not-allowed')msg='Microphone permission was blocked. Allow microphone access for this site.';else if(code==='no-speech')msg='I did not hear anything. Speak after “Listening…” appears.';else if(code==='audio-capture')msg='No usable microphone was found.';else if(code==='network')msg='The browser speech service reported a network error. Typed AI search still works.';voiceUI(false);stopVoice();if(code!=='aborted')voiceInfo(msg)};r.onend=()=>{if(voiceStream){voiceStream.getTracks().forEach(t=>t.stop());voiceStream=null}recognition=null;voiceUI(false)};try{r.start()}catch{stopVoice();voiceInfo('The microphone could not start. Use Chrome/Edge, run MowMow through localhost/HTTPS, and allow the microphone.')} }
  window.voice=startVoice;window.handleVoiceCommand=startVoice;

  function speak2(text){if(!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='en-IN';u.rate=1.02;speechSynthesis.speak(u)}catch{}}

  /* ---------- search / profile / orders / settings integration ---------- */
  function bindLegacySearch(){const ds=$q('#discoverSearch');if(ds&&!ds.dataset.v5Bound){ds.dataset.v5Bound='1';ds.addEventListener('keydown',e=>{if(e.key==='Enter'){const q=ds.value.trim();if(q)handleAI(q);}})}const hs=$q('#homeSearch');if(hs&&!hs.dataset.v5Bound){hs.dataset.v5Bound='1';hs.addEventListener('keydown',e=>{if(e.key==='Enter'){$q('#homeSearchBtn').click()}})}const hb=$q('#homeSearchBtn');if(hb)hb.onclick=()=>{const q=($q('#homeSearch')?.value||'').trim();switchRoute('discover');$q('#discoverSearch').value=q;$q('#mowAIInput').value=q;if(q)handleAI(q);else renderDiscover()};const hm=$q('#homeMic');if(hm)hm.onclick=e=>{e.preventDefault();startVoice($q('#homeSearch'))};const dm=$q('#discoverMic');if(dm)dm.onclick=e=>{e.preventDefault();startVoice($q('#discoverSearch'))}}
  function bindDynamicPhotos(){$$q('.food-thumb img,.hero-food img').forEach(img=>{if(img.dataset.v5Fail)return;img.dataset.v5Fail='1';img.onerror=()=>{const p=img.parentElement;if(p)p.innerHTML='🍽️'}})}
  function enhanceProfile(){const page=$q('#pageProfile .scroll');if(!page||$q('#mowProfileAI'))return;const c=document.createElement('div');c.id='mowProfileAI';c.className='mow-pref-card';c.innerHTML='<div class="name" style="font-size:14px">AI Preferences</div><div class="small-muted" style="margin-top:3px">Saved on this browser and used for MowMow recommendations.</div><div class="mow-pref-grid"><label>Diet<select id="mowDiet"><option>Any</option><option>Veg</option><option>Non-veg</option></select></label><label>Spice<select id="mowSpice"><option>Any</option><option>Mild</option><option>Medium</option><option>Hot</option></select></label><label>Budget<input id="mowBudget" type="number" min="20" max="5000" placeholder="250"></label><label>Health<select id="mowHealth"><option>Balanced</option><option>High protein</option><option>Lower calorie</option></select></label></div><div class="field" style="margin-top:8px;height:44px"><input id="mowFavFoods" placeholder="Favorite foods"></div><button class="primary" id="mowSavePrefs" style="margin-top:8px;height:44px">Save AI preferences</button>';page.appendChild(c);const pr=state.aiPrefs||{};$q('#mowDiet').value=pr.diet||'Any';$q('#mowSpice').value=pr.spice||'Any';$q('#mowBudget').value=pr.budget||'';$q('#mowHealth').value=pr.healthGoal||'Balanced';$q('#mowFavFoods').value=pr.favoriteFoods||'';$q('#mowSavePrefs').onclick=()=>{state.aiPrefs={...(state.aiPrefs||{}),diet:$q('#mowDiet').value,spice:$q('#mowSpice').value,budget:Number($q('#mowBudget').value||0),healthGoal:$q('#mowHealth').value,favoriteFoods:$q('#mowFavFoods').value.trim()};persist();toast('AI preferences saved');renderHome();renderDiscover()}}
  function enhanceOrders(){
    const head=$q('#pageOrders .app-header');
    if(!head || $q('#mowOrdersAI')) return;
    const b=document.createElement('div');
    b.id='mowOrdersAI';
    b.className='ai-assist';
    b.innerHTML='<div class="ai-orb">✦</div><div class="ai-copy"><strong>Order Assistant</strong><small>Ask “Where is my order?” or “Reorder my previous meal.”</small></div><button id="mowOrdersAsk">Ask</button>';
    head.after(b);
    $q('#mowOrdersAsk').onclick=()=>{
      const q=prompt('Ask MowMow about your demo orders:','Where is my order?');
      if(!q) return;
      const low=q.toLowerCase();
      const o=(DATA.orders||[]).find(x=>x.current)||(DATA.orders||[])[0];
      if(!o) return;
      if(/where|track/i.test(low)){
        const eta=o.current?` with a demo ETA of ${esc2(o.eta)}.`:'.';
        openInfo('MowMow order assistant',`<p>This is demo order data. <b>${esc2(o.food)}</b> is <b>${esc2(o.status)}</b>${eta}</p>`);
      }else if(/reorder/i.test(low)){
        const f=DATA.foods.find(x=>x.name===o.food);
        if(f){addToCart(f);switchRoute('cart');}
      }else{
        openInfo('Latest demo order',`<p>Your latest demo order is <b>${esc2(o.food)}</b> from ${esc2(o.restaurant)}.</p>`);
      }
    };
  }

  /* ---------- render wrappers ---------- */
  const baseHome=window.renderHome,baseOrders=window.renderOrders,baseSettings=window.renderSettings;
  window.renderHome=function(){baseHome();ensureHomeAI();bindLegacySearch();bindDynamicPhotos()};
  window.renderOrders=function(){baseOrders();enhanceOrders();bindDynamicPhotos()};
  window.renderSettings=function(){baseSettings();enhanceProfile()};
  const baseOpenFood=window.openFood;window.openFood=function(id){baseOpenFood(id);const f=DATA.foods.find(x=>x.id===id);setTimeout(()=>{const p=$q('#detailBody .detail-panel');if(!p||!f)return;const d=document.createElement('div');d.className='ai-summary';d.innerHTML=`<b>AI Summary</b><br>${esc2(f.reviewSummary)}<div class="ai-action-row"><button id="mowDetailWhy">Why this?</button><button id="mowDetailOrder">Order again</button></div>`;p.appendChild(d);$q('#mowDetailWhy').onclick=()=>why(f.id,parseIntent(ai.lastQuery||'',{}));$q('#mowDetailOrder').onclick=()=>{addToCart(f);toast(`Added ${f.name} again`)}} ,30);};
  // Capture clicks so the old AI layer cannot swallow the mic buttons after a re-render.
  document.addEventListener('click',e=>{const b=e.target.closest('#homeMic,#discoverMic,#mowAIMic');if(!b)return;e.preventDefault();e.stopImmediatePropagation();startVoice(b.id==='#homeMic'?$q('#homeSearch'):b.id==='#discoverMic'?$q('#discoverSearch'):$q('#mowAIInput'));},true);

  // Keep integration-ready auth buttons honest.
  window.signInWithGoogle=()=>toast('Google sign-in needs a real OAuth client/API integration.');
  window.signInWithTruecaller=()=>toast('Truecaller sign-in needs the Truecaller SDK/API integration.');
  window.signInWithFacebook=()=>toast('Facebook sign-in needs a real OAuth client/API integration.');

  // New session namespace guarantees the login screen appears when opening the revised file
  // for the first time; returning sessions still work via localStorage.
  window.renderAll=function(){renderHome();renderDiscover();renderOrders();renderProfile();renderSettings();renderCart();renderNav();bindLegacySearch();enhanceProfile();enhanceOrders();bindDynamicPhotos()};
  ensureChat();ensureVoiceUI();ensureMood();ensureDiscoverUpload();ensureHomeAI();enhanceProfile();enhanceOrders();bindLegacySearch();renderDiscover();renderHome();renderOrders();renderSettings();renderAIChat();
})();
