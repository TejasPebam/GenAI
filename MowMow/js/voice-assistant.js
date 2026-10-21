(function(){
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const synth=window.speechSynthesis;
  if(!SpeechRecognition) return;
  function speak(text){ if(!synth) return; synth.cancel(); const u=new SpeechSynthesisUtterance(text); u.lang='en-IN'; u.rate=1; synth.speak(u); }
  function startVoice(input){
    const r=new SpeechRecognition(); r.lang='en-IN'; r.interimResults=false; r.maxAlternatives=1;
    r.onstart=()=>{ if(input) input.placeholder='Listening…'; };
    r.onresult=e=>{ const text=e.results[0][0].transcript; if(input){input.value=text; input.dispatchEvent(new Event('input',{bubbles:true})); input.focus();} speak('I heard '+text); };
    r.onerror=()=>{ if(input) input.placeholder='Try voice again'; };
    r.onend=()=>{ if(input) input.placeholder='Try: spicy chicken under ₹300'; };
    r.start();
  }
  window.MowMowVoice={start:startVoice,speak};
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#homeMic,#discoverMic');
    if(!btn) return;
    const input=btn.id==='homeMic'?document.querySelector('#homeSearch'):document.querySelector('#discoverSearch');
    startVoice(input);
  });
})();
