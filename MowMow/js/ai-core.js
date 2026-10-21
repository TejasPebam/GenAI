/* =========================================================
   MowMow AI Core Upgrade
   Keeps the existing app as the base and layers the AI
   assistant, strict NLP filtering, personalization, voice
   actions, meal builder, image-upload preparation and prefs.
   ========================================================= */
(function(){
  const aiState = {
    history: JSON.parse(localStorage.getItem("mowmowAIHistory")||"[]"),
    context: JSON.parse(localStorage.getItem("mowmowAIContext")||"{}"),
    lastResults: [],
    mood: localStorage.getItem("mowmowAIMood")||""
  };
  state.aiState = aiState;

  function saveAI(){
    localStorage.setItem("mowmowAIHistory",JSON.stringify(aiState.history.slice(-20)));
    localStorage.setItem("mowmowAIContext",JSON.stringify(aiState.context||{}));
    localStorage.setItem("mowmowAIMood",aiState.mood||"");
  }
  function allText(f){return `${f.name} ${f.restaurant} ${(f.tags||[]).join(" ")} ${f.cuisine||""}`.toLowerCase();}
  function hasAny(s,arr){return arr.some(x=>s.includes(x));}
  function enrichFood(f){
    const n=allText(f);
    f.mealType=f.mealType || (hasAny(n,["breakfast","oats","idli","dosa","egg","tea"])? "breakfast" : hasAny(n,["biryani","rice","pizza","burger","noodles","chicken","paneer"])? "dinner":"snack");
    f.cuisine=f.cuisine || (hasAny(n,["dosa","idli","chai"])? "south indian" : hasAny(n,["fried rice","noodles"])? "chinese" : hasAny(n,["pizza","burger"])? "fast food" : "indian");
    f.spiceLevel=f.spiceLevel || f.spice || (hasAny(n,["spicy","biryani","chicken","fried rice"])? "medium":"mild");
    f.isVegetarian=f.isVegetarian ?? (f.diet==="Veg");
    f.oilLevel=f.oilLevel || (hasAny(n,["salad","fruit","oats","idli","boiled"])? "low":"medium");
    f.sweet=f.sweet ?? hasAny(n,["milkshake","sweet","dessert","chocolate","fruit"]);
    f.tags=f.tags||[];
    return f;
  }
  DATA.foods.forEach(enrichFood);

  function parseMoney(q){
    const m=q.match(/(?:under|below|less than|upto|up to|within|max(?:imum)?|budget(?: of)?|₹)\s*₹?\s*(\d{1,5})/i);
    return m?Number(m[1]):null;
  }
  function parseIntent(text){
    const q=(text||"").toLowerCase().trim();
    const p={
      raw:q,maxPrice:parseMoney(q),minPrice:null,highProtein:false,healthy:false,
      vegetarian:false,nonVeg:false,spicy:false,lowOil:false,sweet:false,
      category:null,mealType:null,cuisine:null,exclude:[],quantity:null,
      sort:null,similar:false,action:null,open:null
    };
    const min=q.match(/(?:above|over|more than|at least|minimum)\s*₹?\s*(\d+)/i); if(min)p.minPrice=Number(min[1]);
    const qty=q.match(/(?:add|order|want|give me)\s+(\d+)\b/i); if(qty)p.quantity=Number(qty[1]);
    if(hasAny(q,["protein","high protein","post workout","post-workout","gym","muscle"]))p.highProtein=true;
    if(hasAny(q,["healthy","clean","light","low calorie","fit"]))p.healthy=true;
    if(hasAny(q,["vegetarian","veg food","veg only","no meat","without chicken","without meat"]))p.vegetarian=true;
    if(hasAny(q,["non veg","non-veg","nonveg","chicken","egg","beef","meat"]))p.nonVeg=true;
    if(hasAny(q,["spicy","hot","fiery","extra spice"]))p.spicy=true;
    if(hasAny(q,["not too oily","less oil","low oil","without too much oil","not oily"]))p.lowOil=true;
    if(hasAny(q,["sweet","dessert","something sweet","sweet craving"]))p.sweet=true;
    const cats=[
      ["burger",["burger","burgers"]],["milkshake",["milkshake","shake"]],
      ["fried rice",["fried rice"]],["biryani",["biryani"]],["pizza",["pizza","pizzas"]],
      ["noodles",["noodle","noodles"]],["chicken",["chicken","grilled chicken"]],
      ["paneer",["paneer"]],["egg",["egg","eggs"]],["oats",["oats"]],
      ["dosa",["dosa"]],["idli",["idli"]]
    ];
    for(const [c,words] of cats){if(hasAny(q,words)){p.category=c;break;}}
    if(hasAny(q,["breakfast","morning"]))p.mealType="breakfast";
    else if(hasAny(q,["lunch","afternoon"]))p.mealType="lunch";
    else if(hasAny(q,["dinner","night","evening"]))p.mealType="dinner";
    if(hasAny(q,["south indian","south-indian"]))p.cuisine="south indian";
    else if(hasAny(q,["chinese"]))p.cuisine="chinese";
    else if(hasAny(q,["italian"]))p.cuisine="italian";
    if(hasAny(q,["highest protein","most protein","maximum protein"]))p.sort="protein";
    else if(hasAny(q,["cheapest","lowest price","most affordable"]))p.sort="price";
    else if(hasAny(q,["highest rated","best rated"]))p.sort="rating";
    if(hasAny(q,["similar to my previous","same as my previous","previous order","previous meal","like my last order"]))p.similar=true;
    const ex=q.match(/(?:without|no|exclude|avoid)\s+([a-z ]+)/i);
    if(ex)ex[1].split(/\s+(?:and|,)\s+/).map(x=>x.trim()).filter(Boolean).forEach(x=>p.exclude.push(x));
    if(/^(open|go to|show)\s+(discover|home|orders?|profile|settings?|cart)/i.test(q)){
      const m=q.match(/(discover|home|orders?|profile|settings?|cart)/i);p.open=m[1].toLowerCase().replace("order","orders").replace("setting","settings");
    }
    if(/add\s+(?:the\s+)?(?:first|1st|one)/i.test(q))p.action="add_first";
    if(/add\s+(?:the\s+)?second/i.test(q))p.action="add_second";
    if(/add\s+two\b/i.test(q))p.action="add_quantity";
    if(/remove\s+(?:the\s+)?(.+)/i.test(q)&&!p.open)p.action="remove";
    if(/reorder|order again/i.test(q))p.action="reorder";
    return p;
  }

  function mergeContext(p){
    const c=aiState.context||{};
    if(!p.maxPrice && c.maxPrice!=null)p.maxPrice=c.maxPrice;
    if(!p.minPrice && c.minPrice!=null)p.minPrice=c.minPrice;
    ["highProtein","healthy","vegetarian","nonVeg","spicy","lowOil","sweet","category","mealType","cuisine","similar"].forEach(k=>{
      if(!p[k] && c[k])p[k]=c[k];
    });
    if(p.category===null && c.category)p.category=c.category;
    return p;
  }

  function categoryMatch(f,cat){
    if(!cat)return true;
    const n=allText(f);
    const map={
      burger:["burger"],milkshake:["milkshake","shake"],"fried rice":["fried rice"],
      biryani:["biryani"],pizza:["pizza"],noodles:["noodle"],chicken:["chicken"],
      paneer:["paneer"],egg:["egg"],oats:["oats"],dosa:["dosa"],idli:["idli"]
    };
    return hasAny(n,map[cat]||[cat]);
  }

  function filterFoods(p){
    let rows=DATA.foods.map(enrichFood).filter(f=>{
      if(p.maxPrice!=null && f.price>p.maxPrice)return false;
      if(p.minPrice!=null && f.price<p.minPrice)return false;
      if(p.vegetarian && !f.isVegetarian)return false;
      if(p.nonVeg && f.isVegetarian)return false;
      if(p.highProtein && f.protein<15)return false;
      if(p.healthy && !(f.tags.includes("Healthy")||f.calories<=400))return false;
      if(p.spicy && !hasAny(allText(f),["spicy","hot","fiery"]))return false;
      if(p.lowOil && f.oilLevel!=="low")return false;
      if(p.sweet && !f.sweet)return false;
      if(p.category && !categoryMatch(f,p.category))return false;
      if(p.mealType && f.mealType!==p.mealType)return false;
      if(p.cuisine && f.cuisine!==p.cuisine)return false;
      if(p.exclude.length && p.exclude.some(x=>allText(f).includes(x)))return false;
      return true;
    });
    if(p.similar){
      const prefs=learnedPreferences();
      rows=rows.sort((a,b)=>{
        const aa=(a.tags||[]).reduce((s,t)=>s+(prefs[t]||0),0),bb=(b.tags||[]).reduce((s,t)=>s+(prefs[t]||0),0);
        return bb-aa;
      });
    }
    return rows;
  }

  function rankFoods(rows,p){
    const prefs=learnedPreferences();
    return rows.map(f=>{
      let score=50,reasons=[];
      if(p.maxPrice!=null){score+=15;reasons.push(`within ₹${p.maxPrice}`)}
      if(p.highProtein){score+=Math.min(f.protein,40)*.7;reasons.push(`${f.protein}g protein`)}
      if(p.healthy){score+=15;reasons.push("matches healthy preference")}
      if(p.vegetarian){score+=12;reasons.push("vegetarian")}
      if(p.nonVeg){score+=10;reasons.push("non-vegetarian")}
      if(p.spicy){score+=12;reasons.push("spicy")}
      if(p.lowOil){score+=12;reasons.push("lower-oil option")}
      if(p.sweet){score+=10;reasons.push("sweet craving")}
      if(p.category){score+=18;reasons.push(`matches ${p.category}`)}
      const pref=state.aiPrefs||{};
      if(pref.diet && ((pref.diet==="Veg"&&f.isVegetarian)||(pref.diet==="Non-veg"&&!f.isVegetarian))){score+=10;reasons.push("matches your diet preference")}
      if(pref.health && f.tags.includes(pref.health)){score+=10;reasons.push("matches your health goal")}
      if(pref.spice && String(f.spiceLevel).toLowerCase()===String(pref.spice).toLowerCase()){score+=6;reasons.push("matches your spice preference")}
      if(pref.budget && f.price<=Number(pref.budget)){score+=5;reasons.push("fits your saved budget")}
      const learned=(f.tags||[]).reduce((s,t)=>s+(prefs[t]||0),0);
      if(learned){score+=Math.min(learned*4,16);reasons.push("fits your order history")}
      score+=Math.max(0,(f.rating-4)*8);
      return {...f,_ai:Math.max(0,Math.min(99,Math.round(score))),_reasons:[...new Set(reasons)].slice(0,4)};
    }).sort((a,b)=>{
      if(p.sort==="protein")return b.protein-a.protein;
      if(p.sort==="price")return a.price-b.price;
      if(p.sort==="rating")return b.rating-a.rating;
      return b._ai-a._ai;
    });
  }

  function aiResponse(p,rows){
    if(p.maxPrice!=null && rows.length===0)return `I couldn't find a matching option within ₹${p.maxPrice}. Try a higher budget or remove one filter.`;
    if(rows.length===0)return "I couldn't find an exact match. Try changing the food, budget, or preference.";
    const count=rows.length;
    if(p.sort==="protein")return `The highest-protein match is ${rows[0].name} with ${rows[0].protein}g protein.`;
    const bits=[];
    if(p.healthy)bits.push("healthy");
    if(p.highProtein)bits.push("high-protein");
    if(p.category)bits.push(p.category);
    if(p.spicy)bits.push("spicy");
    if(p.lowOil)bits.push("lower-oil");
    if(p.vegetarian)bits.push("vegetarian");
    if(p.nonVeg)bits.push("non-veg");
    if(p.sweet)bits.push("sweet");
    if(p.maxPrice!=null)bits.push(`under ₹${p.maxPrice}`);
    return `Got it — I found ${count} ${bits.length?bits.join(" "):"matching"} option${count===1?"":"s"}.`;
  }

  function AIProcess(message){
    let p=mergeContext(parseIntent(message));
    const rows=rankFoods(filterFoods(p),p);
    aiState.context={...p};
    aiState.lastResults=rows.map(x=>x.id);
    aiState.history.push({role:"user",text:message,time:Date.now()});
    const response=aiResponse(p,rows);
    aiState.history.push({role:"ai",text:response,time:Date.now()});
    saveAI();
    return {intent:"food_search",filters:p,response,results:rows};
  }
  window.AIEngine={process:AIProcess,parseIntent,filterFoods,rankRecommendations:rankFoods};

  /* Replace the old parser with the stricter engine parser. */
  parseAIQuery=function(text){
    const p=parseIntent(text);
    return {
      budget:p.maxPrice,protein:p.highProtein,healthy:p.healthy,veg:p.vegetarian,
      nonveg:p.nonVeg,spicy:p.spicy,tags:[],terms:(p.category?[p.category]:[])
    };
  };
  matchesAIQuery=function(f,q,chip){
    let p=mergeContext(parseIntent(q));
    if(chip){
      if(chip==="Protein Rich")p.highProtein=true;
      else if(chip==="Healthy")p.healthy=true;
      else if(chip==="Budget Friendly")p.maxPrice=p.maxPrice??150;
      else p.category=chip.toLowerCase();
    }
    return filterFoods(p).some(x=>x.id===f.id);
  };
  scoreFood=function(f,q,chip){
    let p=mergeContext(parseIntent(q));
    if(chip){
      if(chip==="Protein Rich")p.highProtein=true;
      else if(chip==="Healthy")p.healthy=true;
      else if(chip==="Budget Friendly")p.maxPrice=p.maxPrice??150;
      else p.category=chip.toLowerCase();
    }
    const r=rankFoods([enrichFood(f)],p)[0]||enrichFood(f);
    return {score:r._ai||50,reasons:r._reasons||[]};
  };
  describeAIIntent=function(p,chip){
    const bits=[];
    if(chip)bits.push(chip);
    if(p.budget!=null)bits.push(`under ₹${p.budget}`);
    if(p.protein)bits.push("higher protein");
    if(p.healthy)bits.push("healthier options");
    if(p.veg)bits.push("vegetarian");
    if(p.spicy)bits.push("spicy");
    return bits.length?bits.join(" · "):"your craving";
  };

  /* Add missing metadata requested by the AI data model. */
  DATA.foods.forEach(f=>{
    enrichFood(f);
    if(!f.ingredients)f.ingredients=[];
    if(!f.popularity)f.popularity=Math.round(f.rating*18);
    if(!f.reviewSummary)f.reviewSummary="Demo review summary: review data was not provided for this item.";
  });

  /* AI chat + moods + image upload UI */
  const discover=document.querySelector("#pageDiscover");
  if(discover && !document.querySelector("#mowAIChat")){
    const chat=document.createElement("div");
    chat.id="mowAIChat";chat.className="ai-chat";
    chat.innerHTML=`<div class="ai-chat-head"><div class="ai-orb">🤖</div><div class="ai-chat-copy"><strong>MowMow AI</strong><small>Ask naturally — I remember this session's conversation.</small></div><button class="action-mini" id="clearAIChat">Clear</button></div><div class="ai-chat-messages" id="aiMessages"></div><div class="ai-chat-compose"><input id="aiChatInput" placeholder="Ask: chicken under ₹200, add first item..."><button id="aiChatMic">🎙</button><button id="aiChatSend">➤</button></div>`;
    const hero=discover.querySelector(".discover-hero");
    hero.after(chat);
  }
  if(discover && !document.querySelector("#moodRow")){
    const row=document.createElement("div");row.id="moodRow";row.className="mood-row";
    row.innerHTML=["😊 Happy","😔 Sad","😴 Tired","🔥 Spicy","🍰 Sweet","💪 Post-workout"].map(x=>`<button class="mood" data-mood="${esc(x)}">${x}</button>`).join("");
    discover.querySelector("#mowAIChat").after(row);
  }

  const settings=document.querySelector("#pageSettings");
  if(settings && !document.querySelector("#aiPrefsBox")){
    const box=document.createElement("div");box.id="aiPrefsBox";box.className="setting-row";
    box.innerHTML=`<div style="width:100%"><div class="setting-left"><span>🤖</span><div><strong>AI Preferences</strong><small>Saved locally and used to personalize MowMow recommendations.</small></div></div><div class="pref-grid"><label>Diet<select id="prefDiet"><option value="">No preference</option><option value="Veg">Vegetarian</option><option value="Non-veg">Non-vegetarian</option></select></label><label>Spice<select id="prefSpice"><option value="">Any</option><option value="Mild">Mild</option><option value="Medium">Medium</option><option value="Spicy">Spicy</option></select></label><label>Budget<input id="prefBudget" type="number" min="20" step="10" placeholder="₹ budget"></label><label>Health goal<select id="prefHealth"><option value="">No preference</option><option value="Healthy">Healthy</option><option value="Protein Rich">Protein rich</option></select></label></div><button class="primary" id="saveAIPrefs" style="margin-top:9px;height:42px">Save AI preferences</button></div>`;
    settings.querySelector(".scroll").appendChild(box);
  }

  const profile=document.querySelector("#pageProfile");
  if(profile && !document.querySelector("#profileAIButton")){
    const box=document.createElement("div");box.className="profile-card";
    box.innerHTML=`<button class="profile-action" id="profileAIButton"><span>🤖</span><div><strong>AI Preferences</strong><small>Personalize food recommendations</small></div></button>`;
    profile.querySelector(".scroll").insertBefore(box,profile.querySelector(".profile-card"));
  }

  /* Image identification preparation */
  if(discover && !document.querySelector("#foodIdentifyBox")){
    const box=document.createElement("div");box.id="foodIdentifyBox";box.className="upload-box";
    box.innerHTML=`<strong style="font-size:11px">📷 Identify Food</strong><div class="small-muted" style="margin:4px 0 7px">Upload a food image for future AI recognition.</div><input id="foodImageInput" type="file" accept="image/*"><img id="foodImagePreview" class="upload-preview" alt="Selected food image"><div id="foodImageAnalysis" class="ai-summary hidden">Image selected. Actual food recognition is not connected in this prototype.</div>`;
    discover.querySelector(".scroll").insertBefore(box,discover.querySelector(".scroll").firstChild);
  }

  function renderAIChat(){
    const box=document.querySelector("#aiMessages");if(!box)return;
    const hist=aiState.history.slice(-8);
    box.innerHTML=hist.map(m=>`<div class="ai-msg ${m.role==="user"?"user":"ai"}">${esc(m.text)}</div>`).join("");
    box.scrollTop=box.scrollHeight;
  }
  function performActionFromAI(result,message){
    const p=result.filters, rows=result.results||[];
    if(p.open){switchRoute(p.open);return true;}
    if(p.action==="add_first"||p.action==="add_second"){
      const index=p.action==="add_second"?1:0, f=rows[index];
      if(f){addToCart(f);return true;}
      toast("There is no matching item to add.");return true;
    }
    if(p.action==="add_quantity"){
      const f=rows[0];const qty=p.quantity||2;
      if(f){for(let i=0;i<qty;i++)addToCart(f);return true;}
    }
    if(p.action==="remove"){
      const q=(message.match(/remove\s+(?:the\s+)?(.+)/i)||[])[1]?.trim().toLowerCase();
      const item=state.cart.find(x=>x.name.toLowerCase().includes(q||""));
      if(item){removeItem(item.id);return true;}
      toast("I couldn't find that item in your cart.");return true;
    }
    if(p.action==="reorder"){
      const last=DATA.orders[0];const f=DATA.foods.find(x=>x.name===last.food);
      if(f){addToCart(f);toast(`Reordered ${f.name}`);return true;}
    }
    return false;
  }
  function handleAIMessage(message,source="text"){
    const text=String(message||"").trim();if(!text)return;
    const lower=text.toLowerCase();
    if(/where is my order|where's my order|what did i order|show my latest order|latest order|reorder my previous meal/.test(lower)){
      const saved=JSON.parse(localStorage.getItem("mowmowOrderHistory")||"[]");
      const o=saved[0]||DATA.orders[0];
      if(!o){toast("You don't have a demo order yet.");return}
      if(/reorder/.test(lower)){const f=DATA.foods.find(x=>x.name===o.food);if(f){addToCart(f);toast(`Added ${f.name} from your previous order`);switchRoute("cart")}return;}
      const reply=/where is|latest order/.test(lower)?`Your latest demo order is ${o.food}. Status: ${o.status}. This prototype does not provide real-time delivery tracking.`:`Your latest demo order is ${o.food} from ${o.restaurant}, quantity ${o.qty}.`;
      aiState.history.push({role:"user",text, time:Date.now()},{role:"ai",text:reply,time:Date.now()});saveAI();renderAIChat();openInfo("MowMow AI · Order assistant",`<p>${esc(reply)}</p>`);if(source==="voice")speak(reply);return {intent:"order_assistant",response:reply};
    }
    const result=AIProcess(text);
    performActionFromAI(result,text);
    switchRoute("discover");
    const input=document.querySelector("#discoverSearch");if(input)input.value=text;
    const chip="";
    state.chip=chip;
    renderDiscover();
    renderAIChat();
    toast(source==="voice"?`MowMow heard: ${text}`:"MowMow AI updated your results");
    if(source==="voice")speak(result.response);
    return result;
  }
  window.handleAIMessage=handleAIMessage;

  /* Conversational assistant UI handlers */
  const send=()=>{const i=document.querySelector("#aiChatInput");if(!i)return;const q=i.value.trim();if(!q)return;i.value="";handleAIMessage(q,"text")};
  const sendBtn=document.querySelector("#aiChatSend");if(sendBtn)sendBtn.onclick=send;
  const ci=document.querySelector("#aiChatInput");if(ci)ci.addEventListener("keydown",e=>{if(e.key==="Enter")send()});
  const clear=document.querySelector("#clearAIChat");if(clear)clear.onclick=()=>{aiState.history=[];aiState.context={};saveAI();renderAIChat();renderDiscover();toast("AI conversation cleared")};
  document.querySelectorAll("[data-mood]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-mood]").forEach(x=>x.classList.remove("active"));b.classList.add("active");
    aiState.mood=b.dataset.mood;saveAI();
    const q=b.dataset.mood.includes("Protein")?"high protein":b.dataset.mood.includes("Spicy")?"something spicy":b.dataset.mood.includes("Sweet")?"something sweet":b.dataset.mood.includes("Tired")?"comfort food":b.dataset.mood.includes("Post-workout")?"high protein post workout":"something enjoyable";
    handleAIMessage(q,"text");
  });
  renderAIChat();

  /* Override discover with strict AI filtering and richer cards. */
  renderDiscover=function(){
    const chips=["Spicy","Healthy","Protein Rich","Burger","Milkshake","Fried Rice","Biryani","Pizza","Budget Friendly","Vegetarian"];
    $("#discoverChips").innerHTML=chips.map(c=>`<button class="chip ${state.chip===c?"active":""}" data-chip="${esc(c)}">${esc(c)}</button>`).join("");
    $$("[data-chip]").forEach(b=>b.onclick=()=>{
      state.chip=b.dataset.chip;$("#discoverSearch").value="";renderDiscover();
    });
    const q=$("#discoverSearch").value.trim();
    let p=mergeContext(parseIntent(q));
    if(state.chip){
      if(state.chip==="Protein Rich")p.highProtein=true;
      else if(state.chip==="Healthy")p.healthy=true;
      else if(state.chip==="Budget Friendly")p.maxPrice=p.maxPrice??150;
      else if(state.chip==="Vegetarian")p.vegetarian=true;
      else p.category=state.chip.toLowerCase();
    }
    let rows=rankFoods(filterFoods(p),p);
    if(!q && !state.chip && !aiState.mood)rows=rows.slice(0,8);
    aiState.lastResults=rows.map(x=>x.id);
    $("#aiAssistText").textContent=q?aiResponse(p,rows):(state.chip?`Showing ${state.chip.toLowerCase()} picks.`:"Ask MowMow naturally — budget, protein, health, craving or mood.");
    $("#aiList").innerHTML=rows.map(f=>`<div class="food-card" data-food="${f.id}">${foodThumb(f)}<div class="info"><div class="name">${esc(f.name)}</div><div class="meta">${esc(f.restaurant)} · ${f.rating.toFixed(1)}★ · ${f.protein}g protein · ${f.calories} kcal</div><div class="small-row"><span class="price">₹${f.price}</span><span class="small-muted">${esc((f.tags||[]).join(" · "))}</span></div><div class="ai-meta"><span class="ai-badge">✦ AI ${f._ai}% match</span><button class="reason-btn" data-reason="${f.id}">Why this?</button></div></div><div class="card-end"><span class="price">₹${f.price}</span><button type="button" data-add="${f.id}">Add +</button></div></div>`).join("")||`<div class="empty">No food matches your hard filters. Try a different budget or preference.</div>`;
    $$("[data-food]").forEach(b=>b.onclick=e=>{if(e.target.closest("[data-add]")||e.target.closest("[data-reason]"))return;openFood(b.dataset.food)});
    $$("[data-add]").forEach(b=>b.onclick=e=>{e.stopPropagation();addToCart(DATA.foods.find(f=>f.id===b.dataset.add))});
    $$("[data-reason]").forEach(b=>b.onclick=e=>{e.stopPropagation();openAIReason(b.dataset.reason,q,state.chip)});
  };

  /* Stronger explanations: only data-supported facts. */
  openAIReason=function(id,q,chip){
    const f=DATA.foods.find(x=>x.id===id);if(!f)return;
    const r=scoreFood(f,q,chip);
    const facts=r.reasons.length?r.reasons.map(x=>`✓ ${esc(x)}`).join("<br>"):"✓ Matches the selected food filters";
    openModal("Why MowMow recommends this",`<div class="detail-panel" style="margin:0;padding:12px"><div class="name" style="font-size:17px">${esc(f.name)}</div><div class="meta">${esc(f.restaurant)} · ₹${f.price} · ${f.protein}g protein · ${f.calories} kcal</div><div class="ai-summary">${facts}</div><div class="ai-meta"><span class="ai-badge">✦ AI ${r.score}% match</span></div></div>`,'<div class="modal-actions"><button class="secondary" onclick="closeModal()">Close</button><button class="primary" onclick="closeModal();openFood(\''+f.id+'\')">View food</button></div>');
  };

  /* Meal builder: chooses a combination that stays inside the budget. */
  buildMeal=function(){
    const q=$("#discoverSearch").value.trim()||"high protein dinner under ₹300";
    const p=mergeContext(parseIntent(q));p.maxPrice=p.maxPrice??300;
    const candidates=rankFoods(filterFoods(p),p);
    if(!candidates.length){openInfo("Meal builder","<p>I couldn't build a meal inside your current hard filters. Try increasing the budget.</p>");return;}
    const picks=[], used=new Set(); let total=0;
    for(const f of candidates){
      if(used.has(f.id))continue;
      if(total+f.price<=p.maxPrice){picks.push(f);used.add(f.id);total+=f.price;}
      if(picks.length>=3)break;
    }
    while(picks.length>1 && total>p.maxPrice){const x=picks.pop();total-=x.price;}
    const over=picks.reduce((s,f)=>s+f.price,0)>p.maxPrice;
    openModal("MowMow AI · Build My Meal",`<p>Budget: <b>₹${p.maxPrice}</b>. I kept every selected item within the hard budget.</p><div class="card-list" style="padding:0">${picks.map(f=>`<div class="cart-item">${foodThumb(f)}<div class="info"><div class="name">${esc(f.name)}</div><div class="meta">${f.protein}g protein · ${f.calories} kcal</div><div class="small-row"><span class="price">₹${f.price}</span></div></div><button class="action-mini" data-meal-add="${f.id}">Add</button></div>`).join("")}</div><p><b>Total: ₹${total}</b></p>`, '<div class="modal-actions"><button class="secondary" onclick="closeModal()">Close</button><button class="primary" id="mealAddAll">Add all to cart</button></div>');
    $$("[data-meal-add]").forEach(b=>b.onclick=()=>addToCart(DATA.foods.find(f=>f.id===b.dataset.mealAdd)));
    $("#mealAddAll").onclick=()=>{picks.forEach(f=>addToCart(f));closeModal();switchRoute("cart")};
  };

  /* Persist order history and improve reorder behavior. */
  const oldCheckout=checkout;
  checkout=function(total){
    oldCheckout(total);
    const place=document.querySelector("#placeOrder");
    if(place)place.onclick=function(){
      const f=state.cart[0],addr=$("#addressInput").value.trim();
      if(!addr){toast("Please enter a delivery address");return}
      state.location=addr;
      const qty=cartCount();
      const order={id:"MM"+Date.now().toString().slice(-6),status:"Preparing",date:"Just now",food:f.name,restaurant:f.restaurant,qty,total,eta:"25 min",icon:f.icon,current:true};
      const history=JSON.parse(localStorage.getItem("mowmowOrderHistory")||"[]");
      history.unshift(order);localStorage.setItem("mowmowOrderHistory",JSON.stringify(history));
      DATA.orders.unshift(order);state.cart=[];persist();closeModal();switchRoute("orders");toast("Demo order placed");
    };
  };

  /* Merge saved demo order history into Orders without pretending it is live data. */
  const originalRenderOrders=renderOrders;
  renderOrders=function(){
    const saved=JSON.parse(localStorage.getItem("mowmowOrderHistory")||"[]");
    if(saved.length){
      const ids=new Set(DATA.orders.map(o=>o.id));saved.forEach(o=>{if(!ids.has(o.id))DATA.orders.unshift(o)});
    }
    originalRenderOrders();
  };

  /* Order assistant summary */
  const orders=document.querySelector("#pageOrders");
  if(orders && !document.querySelector("#orderAIButton")){
    const btn=document.createElement("button");btn.id="orderAIButton";btn.className="primary";btn.style.cssText="margin:0 16px 10px;width:calc(100% - 32px);height:42px";
    btn.textContent="🤖 Ask MowMow about my order";
    orders.querySelector(".chips").after(btn);
    btn.onclick=()=>{
      const o=DATA.orders[0];
      if(!o){openInfo("MowMow AI","<p>You don't have a demo order yet.</p>");return}
      openModal("MowMow AI · Order assistant",`<p>Your latest <b>demo order</b> is <b>${esc(o.food)}</b> from ${esc(o.restaurant)}.</p><p>Status: <b>${esc(o.status)}</b>. ${o.current?"The prototype shows it as on the way/preparing; it is not real-time tracking.":"This order is in your demo history."}</p>`,'<div class="modal-actions"><button class="primary" onclick="closeModal()">Close</button></div>');
    };
  }

  /* AI review summary in food detail. */
  const oldOpenFood=openFood;
  openFood=function(id){
    oldOpenFood(id);
    const f=DATA.foods.find(x=>x.id===id);if(!f)return;
    const body=$("#detailBody");
    if(body && f){
      const sum=document.createElement("div");sum.className="ai-summary";sum.innerHTML=`<b>AI Summary</b><br>${esc(f.reviewSummary)} `;
      body.querySelector(".detail-panel")?.appendChild(sum);
    }
  };

  /* Image upload: preview only; no fake recognition. */
  const imageInput=document.querySelector("#foodImageInput");
  if(imageInput)imageInput.onchange=function(){
    const file=this.files?.[0],preview=$("#foodImagePreview"),analysis=$("#foodImageAnalysis");
    if(!file){toast("No image selected");return}
    if(!file.type.startsWith("image/")){toast("Please choose an image file");this.value="";return}
    if(file.size>8*1024*1024){toast("Image is too large. Use an image under 8 MB.");this.value="";return}
    preview.src=URL.createObjectURL(file);preview.style.display="block";analysis.classList.remove("hidden");
  };

  /* AI preferences */
  function loadPrefs(){
    const p=state.aiPrefs||{};
    const d=$("#prefDiet"),s=$("#prefSpice"),b=$("#prefBudget"),h=$("#prefHealth");
    if(d)d.value=p.diet||"";if(s)s.value=p.spice||"";if(b)b.value=p.budget||"";if(h)h.value=p.health||"";
  }
  const savePrefs=$("#saveAIPrefs");
  if(savePrefs)savePrefs.onclick=()=>{
    state.aiPrefs={...(state.aiPrefs||{}),diet:$("#prefDiet").value,spice:$("#prefSpice").value,budget:Number($("#prefBudget").value)||null,health:$("#prefHealth").value};
    persist();loadPrefs();renderDiscover();toast("AI preferences saved");
  };
  loadPrefs();
  const profileAI=$("#profileAIButton");if(profileAI)profileAI.onclick=()=>{switchRoute("settings");setTimeout(()=>$("#prefDiet")?.focus(),30)};

  /* Apply saved preferences as soft personalization, while typed hard filters remain strict. */
  const oldLearned=learnedPreferences;
  learnedPreferences=function(){
    const prefs=oldLearned();
    const p=state.aiPrefs||{};
    if(p.health)prefs[p.health]=(prefs[p.health]||0)+2;
    if(p.diet)prefs[p.diet]=(prefs[p.diet]||0)+2;
    if(p.spice)prefs[p.spice]=(prefs[p.spice]||0)+1;
    return prefs;
  };

  /* Voice assistant with real SpeechRecognition where available. */
  voice=function(input){
    const R=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!R||!window.isSecureContext){
      showVoiceFallback(input,"Live speech recognition is unavailable here. Use localhost/Live Server or a browser that supports SpeechRecognition; the text assistant still works.");
      return;
    }
    let r;
    try{r=new R()}catch(e){showVoiceFallback(input,"Voice recognition could not be started.");return}
    r.lang="en-IN";r.interimResults=true;r.continuous=false;r.maxAlternatives=1;
    r.onstart=()=>{toast("Listening…");if(input)input.placeholder="Listening…"};
    r.onresult=e=>{
      let transcript="";
      for(let i=e.resultIndex;i<e.results.length;i++)transcript+=e.results[i][0].transcript;
      if(input)input.value=transcript;
      const last=e.results[e.results.length-1];
      if(last&&last.isFinal&&transcript.trim()){handleAIMessage(transcript.trim(),"voice");}
    };
    r.onerror=e=>{if(input)input.placeholder="Try a craving or command";showVoiceFallback(input,e.error==="not-allowed"?"Microphone permission was denied. Please allow it and try again.":"I couldn't hear that. You can type the command instead.")};
    r.onend=()=>{if(input)input.placeholder=input.id==="homeSearch"?"Try: spicy chicken under ₹300":"e.g. high protein under ₹250"};
    try{r.start()}catch(e){showVoiceFallback(input,"The microphone could not be started. Use localhost/Live Server and allow microphone access.")}
  };

  /* Voice/app command layer: actual navigation and cart changes. */
  handleVoiceCommand=function(text){return handleAIMessage(text,"voice")};

  /* Add Home "Ask MowMow AI" without replacing the current layout. */
  const home=document.querySelector("#pageHome");
  if(home && !document.querySelector("#homeAIButton")){
    const b=document.createElement("button");b.id="homeAIButton";b.className="primary";b.style.cssText="margin:0 16px 12px;width:calc(100% - 32px);height:44px";
    b.textContent="🤖 Ask MowMow AI";
    home.querySelector(".scroll").insertBefore(b,home.querySelector(".scroll").firstChild);
    b.onclick=()=>{switchRoute("discover");setTimeout(()=>document.querySelector("#aiChatInput")?.focus(),30)};
  }

  /* Improve social buttons: explicit integration-ready behavior. */
  window.signInWithGoogle=function(){toast("Google sign-in requires a real OAuth client/API integration.")};
  window.signInWithTruecaller=function(){toast("Truecaller sign-in requires the Truecaller SDK/API integration.")};
  window.signInWithFacebook=function(){toast("Facebook sign-in requires a real OAuth/API integration.")};

  /* Final safe boot refresh after all overrides are installed. */
  renderAll();
  renderDiscover();
  renderAIChat();
  loadPrefs();
})();
