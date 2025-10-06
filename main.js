(function(){
  const audioEl = document.getElementById('audio');
  const fileInput = document.getElementById('fileInput');
  const addFilesBtn = document.getElementById('addFilesBtn');
  const playBtn = document.getElementById('playBtn');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const gainSlider = document.getElementById('gain');
  const bassSlider = document.getElementById('bass');
  const trebleSlider = document.getElementById('treble');
  const gainVal = document.getElementById('gainVal');
  const bassVal = document.getElementById('bassVal');
  const trebleVal = document.getElementById('trebleVal');
  const presetRow = document.getElementById('presetRow');
  const playlistEl = document.getElementById('playlist');
  const artwork = document.getElementById('artwork');
  const installBtn = document.getElementById('installBtn');
  const toast = document.getElementById('toast');
  const canvas = document.getElementById('visualizer');
  const canvasCtx = canvas.getContext('2d');

  let audioCtx, sourceNode, gainNode, bassNode, trebleNode, analyserNode;
  let animationId = null;
  const playlist = [];
  let currentIndex = -1;
  let deferredPrompt = null;

  const presets = [{name:'Flat',gain:1,bass:0,treble:0},{name:'Bass Boost',gain:1.2,bass:8,treble:-2},{name:'Volume Extender',gain:1.5,bass:3,treble:2}];

  function createAudioGraph(){ if (audioCtx) return; audioCtx = new (window.AudioContext || window.webkitAudioContext)(); try{ sourceNode = audioCtx.createMediaElementSource(audioEl); }catch(e){ sourceNode = null; } gainNode = audioCtx.createGain(); bassNode = audioCtx.createBiquadFilter(); bassNode.type='lowshelf'; bassNode.frequency.value=200; trebleNode = audioCtx.createBiquadFilter(); trebleNode.type='highshelf'; trebleNode.frequency.value=3000; analyserNode = audioCtx.createAnalyser(); analyserNode.fftSize=256; if (sourceNode){ sourceNode.connect(bassNode); bassNode.connect(trebleNode); trebleNode.connect(gainNode); gainNode.connect(analyserNode); analyserNode.connect(audioCtx.destination); } else { gainNode.connect(audioCtx.destination); } gainNode.gain.value = +gainSlider.value; bassNode.gain.value = +bassSlider.value; trebleNode.gain.value = +trebleSlider.value; }

  function updateSliderLabels(){ document.getElementById('gainVal').textContent=(+gainSlider.value).toFixed(2); document.getElementById('bassVal').textContent=(+bassSlider.value); document.getElementById('trebleVal').textContent=(+trebleSlider.value); }

  function applySettings(g,b,t){ createAudioGraph(); if(gainNode) gainNode.gain.value=g; if(bassNode) bassNode.gain.value=b; if(trebleNode) trebleNode.gain.value=t; gainSlider.value=g; bassSlider.value=b; trebleSlider.value=t; updateSliderLabels(); }

  function renderPresets(){ presetRow.innerHTML=''; presets.forEach(p=>{ const btn=document.createElement('button'); btn.className='btn'; btn.textContent=p.name; btn.onclick=()=>applySettings(p.gain,p.bass,p.treble); presetRow.appendChild(btn); }); const customBtn=document.createElement('button'); customBtn.className='btn'; customBtn.textContent='Custom'; customBtn.onclick=()=>{ const s=localStorage.getItem('mcm_custom_preset'); if(s){ const pr=JSON.parse(s); applySettings(pr.gain,pr.bass,pr.treble);} else showToast('No custom preset saved'); }; presetRow.appendChild(customBtn); }

  renderPresets(); updateSliderLabels();

  function startVisualizer(){ if(!analyserNode) return; const bufferLength=analyserNode.frequencyBinCount; const data=new Uint8Array(bufferLength); const w=canvas.width,h=canvas.height; function draw(){ animationId=requestAnimationFrame(draw); analyserNode.getByteFrequencyData(data); canvasCtx.clearRect(0,0,w,h); const barWidth=(w/bufferLength)*1.2; let x=0; for(let i=0;i<bufferLength;i++){ const v=data[i]/255; const barH=v*h; const g=Math.floor(barH)+80; canvasCtx.fillStyle='rgb(0,'+g+',0)'; canvasCtx.fillRect(x,h-barH,barWidth,barH); x+=barWidth+1; } } draw(); }

  function stopVisualizer(){ if(animationId) cancelAnimationFrame(animationId); animationId=null; canvasCtx.clearRect(0,0,canvas.width,canvas.height); }

  function addFiles(files){ for(const file of files){ if(!file.type.startsWith('audio')) continue; const url=URL.createObjectURL(file); playlist.push({title:file.name,url,file}); } if(currentIndex===-1 && playlist.length>0){ currentIndex=0; loadTrack(currentIndex); } renderPlaylist(); }

  function renderPlaylist(){ playlistEl.innerHTML=''; playlist.forEach((t,i)=>{ const li=document.createElement('li'); li.className=(i===currentIndex?'active':''); const meta=document.createElement('div'); meta.className='meta'; meta.textContent=t.title; const controls=document.createElement('div'); const pbtn=document.createElement('button'); pbtn.className='btn'; pbtn.textContent='Play'; pbtn.onclick=()=>{ currentIndex=i; loadTrack(i); playAudio(); renderPlaylist(); }; const rbtn=document.createElement('button'); rbtn.className='btn'; rbtn.textContent='Remove'; rbtn.onclick=()=>removeTrack(i); controls.appendChild(pbtn); controls.appendChild(rbtn); li.appendChild(meta); li.appendChild(controls); playlistEl.appendChild(li); }); }

  function removeTrack(index){ const t=playlist[index]; if(t && t.url) URL.revokeObjectURL(t.url); playlist.splice(index,1); if(playlist.length===0){ currentIndex=-1; audioEl.removeAttribute('src'); audioEl.load(); stopVisualizer(); } else { if(index<=currentIndex) currentIndex=Math.max(0,currentIndex-1); loadTrack(currentIndex); } renderPlaylist(); }

  function loadTrack(i){ if(i<0||i>=playlist.length) return; const t=playlist[i]; audioEl.src=t.url; artwork.textContent=t.title.split('.').slice(0,-1).join('.')||t.title; audioEl.load(); renderPlaylist(); }

  async function playAudio(){ createAudioGraph(); if(audioCtx.state==='suspended') await audioCtx.resume(); await audioEl.play().catch(()=>{}); playBtn.textContent='⏸'; startVisualizer(); }

  function pauseAudio(){ audioEl.pause(); playBtn.textContent='▶'; stopVisualizer(); }

  playBtn.addEventListener('click', async ()=>{ if(!audioEl.src){ showToast('Add audio files first'); return; } if(audioEl.paused) await playAudio(); else pauseAudio(); });
  prevBtn.addEventListener('click', ()=>{ if(playlist.length===0) return; currentIndex=(currentIndex-1+playlist.length)%playlist.length; loadTrack(currentIndex); playAudio(); });
  nextBtn.addEventListener('click', ()=>{ if(playlist.length===0) return; currentIndex=(currentIndex+1)%playlist.length; loadTrack(currentIndex); playAudio(); });

  gainSlider.addEventListener('input', ()=>{ updateSliderLabels(); if(gainNode) gainNode.gain.value=+gainSlider.value; });
  bassSlider.addEventListener('input', ()=>{ updateSliderLabels(); if(bassNode) bassNode.gain.value=+bassSlider.value; });
  trebleSlider.addEventListener('input', ()=>{ updateSliderLabels(); if(trebleNode) trebleNode.gain.value=+trebleSlider.value; });

  addFilesBtn.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (e)=> addFiles(e.target.files));

  document.getElementById('saveCustomBtn').addEventListener('click', ()=>{ const preset={gain:+gainSlider.value,bass:+bassSlider.value,treble:+treble.value}; localStorage.setItem('mcm_custom_preset',JSON.stringify(preset)); showToast('Custom preset saved'); });

  window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; installBtn.style.display='inline-block'; showToast('Install available — tap the install button'); });
  installBtn.addEventListener('click', async ()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); const choice=await deferredPrompt.userChoice; if(choice.outcome==='accepted'){ installBtn.style.display='none'; showToast('App installed'); } deferredPrompt=null; });
  window.addEventListener('appinstalled', ()=>{ showToast('Thanks for installing MCM Audio Player'); });

  (function loadCustom(){ const s=localStorage.getItem('mcm_custom_preset'); if(s){ const p=JSON.parse(s); gainSlider.value=p.gain; bassSlider.value=p.bass; trebleSlider.value=p.treble; updateSliderLabels(); } })();

  audioEl.addEventListener('ended', ()=>{ if(playlist.length===0) return; currentIndex=(currentIndex+1)%playlist.length; loadTrack(currentIndex); playAudio(); });

  function showToast(txt){ toast.textContent=txt; toast.style.display='block'; setTimeout(()=> toast.style.display='none',3000); }

  updateSliderLabels();
})();