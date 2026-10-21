const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const foods = [
  { id:'mm1', name:'Chicken Biryani', price:249, protein:32, calories:520, category:'Biryani', diet:'Non-veg' },
  { id:'mm2', name:'Grilled Chicken Bowl', price:279, protein:38, calories:410, category:'Healthy', diet:'Non-veg' },
  { id:'mm3', name:'Paneer Tikka', price:229, protein:24, calories:360, category:'Paneer', diet:'Veg' },
  { id:'mm4', name:'Veg Fried Rice', price:189, protein:9, calories:430, category:'Fried Rice', diet:'Veg' },
  { id:'mm5', name:'Chicken Burger', price:199, protein:28, calories:540, category:'Burger', diet:'Non-veg' }
];

app.get('/api/health', (req,res)=>res.json({ok:true,app:'MowMow',backend:'Node.js + Express'}));
app.get('/api/foods', (req,res)=>res.json({count:foods.length,foods}));
app.get('/api/foods/:id',(req,res)=>{
  const food=foods.find(f=>f.id===req.params.id);
  if(!food) return res.status(404).json({error:'Food not found'});
  res.json(food);
});

app.post('/api/recommendations',(req,res)=>{
  const q=String(req.body.query||'').toLowerCase();
  let results=foods.filter(f=>{
    if(/vegetarian|veg only/.test(q) && f.diet!=='Veg') return false;
    if(/non.?veg|chicken|meat/.test(q) && f.diet==='Veg') return false;
    const budget=q.match(/(?:under|below|upto|up to|within)\s*₹?\s*(\d+)/);
    if(budget && f.price>Number(budget[1])) return false;
    if(/protein|gym|muscle/.test(q) && f.protein<15) return false;
    if(/healthy|low calorie/.test(q) && f.calories>450) return false;
    return true;
  });
  if(!results.length) results=foods.slice(0,3);
  results=results.sort((a,b)=>b.protein-a.protein);
  res.json({query:q,recommendations:results.slice(0,5)});
});

app.post('/api/orders',(req,res)=>{
  const order={id:'MM'+Date.now(),...req.body,status:'Demo order received',createdAt:new Date().toISOString()};
  res.status(201).json(order);
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT,()=>console.log(`MowMow running at http://localhost:${PORT}`));
