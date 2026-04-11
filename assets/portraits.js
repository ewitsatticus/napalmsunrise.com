// ANIMATED PORTRAITS — Atticus (smoking) + Gorthog (blink + rage)
// Mounts on #atticus-canvas / #atticus-smoke / #gorthog-canvas if present.
(function () {
  var S = 6;
  function drawSprite(ctx, sprite, colors) {
    for (var y = 0; y < sprite.length; y++) {
      for (var x = 0; x < sprite[y].length; x++) {
        var ch = sprite[y][x];
        if (ch === '.' || !colors[ch]) continue;
        ctx.fillStyle = colors[ch];
        ctx.fillRect(x * S, y * S, S, S);
      }
    }
  }

  var gCanvas = document.getElementById('gorthog-canvas');
  var aCanvas = document.getElementById('atticus-canvas');
  if (!gCanvas && !aCanvas) return;

  var GC = {'.':'transparent','o':'#0d0d0d','g':'#3a782f','G':'#4e9638','L':'#64aa4b','s':'#2d5a24','R':'#8b2010','r':'#e8260a','T':'#dcc864','t':'#c4b050','e':'#4a2810','E':'#3a1c08','W':'#cccc44','w':'#998822','p':'#1a0a00','B':'#2a2a2a','n':'#2d4a22','F':'#e8ddc0','f':'#c8c0a0','S':'#7a5e2a','b':'#332e20','X':'#ff0000'};
  var gSpriteOpen = ['................................','...........oooooooooooo.........','.........oogssgggggssgooo.......','........ogsgggGGGGGGgggsgo......','.......ogsggGGLLLLLLGGggsgo....','......ogsgGGLLLLLLLLLLGgsgo....','.....ogsgGLLLLLLLLLLLLLGgsgo...','....ogsgGLLLLLLLLLLLLLLGgsgo...','...oEesgGLLLLLLLLLLLLLLGgseEo..','...oEeegGLLLLLLLLLLLLLLGgeeEo..','..oEeeegGLLLLLLLLLLLLLLGgeeeEo.','..oEeeeGGLBBBoooLLLooBBGGeeEo..','...oesgGLBogGGGoLLoGGGoBLgseo..','...oesgGLoWWwGoLLLoWWwGLLgseo..','...oesgGLopppGoLLLopppGLLgseo..','...oesgGLoWWwGoLLLoWWwGLLgseo..','...oesgGGLooooLLLLLooooGGgseo..','...oesgGGLLLLLLLLLLLLLGGgseo...','...oesgGGLLSSLnnnnLSSLGGgseo...','...oesgGGGLLLngggnLLLGGGgseo...','..oTgggGGGLLLLLLLLLLLGGGgggTo..','..oTtggGGGgLLLLLLLLLgGGGggtTo..','..oTtggGGFoorrrrrrrrooFGGggtTo.','...otggGGoFoRRRRRRRRoFoGGggto..','...oogGGGoFFoRRRRRRoFFoGGGgoo..','....osgGGGoooooooooooooGGgsoo..','.....osggGGbGGLLLLGGbGGggsoo...','......ossgGGbGGGGGGbGGgssooo...','.......oossgGGGGGGGGgssoo......','........ooosssggggsssoo........','..........oooooooooooo.........','................................'];
  var gSpriteBlink = ['................................','...........oooooooooooo.........','.........oogssgggggssgooo.......','........ogsgggGGGGGGgggsgo......','.......ogsggGGLLLLLLGGggsgo....','......ogsgGGLLLLLLLLLLGgsgo....','.....ogsgGLLLLLLLLLLLLLGgsgo...','....ogsgGLLLLLLLLLLLLLLGgsgo...','...oEesgGLLLLLLLLLLLLLLGgseEo..','...oEeegGLLLLLLLLLLLLLLGgeeEo..','..oEeeegGLLLLLLLLLLLLLLGgeeeEo.','..oEeeeGGLBBBoooLLLooBBGGeeEo..','...oesgGLBogGGGoLLoGGGoBLgseo..','...oesgGLooooGoLLLooooGLLgseo..','...oesgGLLLLLGoLLLLLLLGLLgseo..','...oesgGLooooGoLLLooooGLLgseo..','...oesgGGLooooLLLLLooooGGgseo..','...oesgGGLLLLLLLLLLLLLGGgseo...','...oesgGGLLSSLnnnnLSSLGGgseo...','...oesgGGGLLLngggnLLLGGGgseo...','..oTgggGGGLLLLLLLLLLLGGGgggTo..','..oTtggGGGgLLLLLLLLLgGGGggtTo..','..oTtggGGFoorrrrrrrrooFGGggtTo.','...otggGGoFoRRRRRRRRoFoGGggto..','...oogGGGoFFoRRRRRRoFFoGGGgoo..','....osgGGGoooooooooooooGGgsoo..','.....osggGGbGGLLLLGGbGGggsoo...','......ossgGGbGGGGGGbGGgssooo...','.......oossgGGGGGGGGgssoo......','........ooosssggggsssoo........','..........oooooooooooo.........','................................'];
  var gSpriteRage = ['................................','...........oooooooooooo.........','.........oogssgggggssgooo.......','........ogsgggGGGGGGgggsgo......','.......ogsggGGLLLLLLGGggsgo....','......ogsgGGLLLLLLLLLLGgsgo....','.....ogsgGLLLLLLLLLLLLLGgsgo...','....ogsgGLLLLLLLLLLLLLLGgsgo...','...oEesgGLLLLLLLLLLLLLLGgseEo..','...oEeegGLLLLLLLLLLLLLLGgeeEo..','..oEeeegGLLLLLLLLLLLLLLGgeeeEo.','..oEeeeGGoBBBoooLLLooBBBoGeeEo.','...oesgGGoWWWWoLLLoWWWWoGgseo..','...oesgGGoWWWWoLLLoWWWWoGgseo..','...oesgGGoWXpWoLLLoWXpWoGgseo..','...oesgGGoWWWWoLLLoWWWWoGgseo..','...oesgGGooooooLLLooooooGgseo..','...oesgGGLLLLLLLLLLLLLGGgseo...','...oesgGGLLSSLnnnnLSSLGGgseo...','...oesgGGGLLLngggnLLLGGGgseo...','..oTgggGGGLLLLLLLLLLLGGGgggTo..','..oTtggGGGoooooooooooooGGggtTo.','..oTtggGoFoRRRRRRRRRRoFoGggtTo.','...otggGoRRRRRRRRRRRRRRoGggto..','...oogGGoFRRRRRRRRRRRRFoGGgoo..','....osgGGoooooooooooooooGgsoo..','.....osggGGbGGLLLLGGbGGggsoo...','......ossgGGbGGGGGGbGGgssooo...','.......oossgGGGGGGGGgssoo......','........ooosssggggsssoo........','..........oooooooooooo.........','................................'];

  function padRow(s) { while (s.length < 32) s += '.'; return s.length > 32 ? s.substring(0,32) : s; }
  [gSpriteOpen, gSpriteBlink, gSpriteRage].forEach(function (sp) { for (var i = 0; i < sp.length; i++) sp[i] = padRow(sp[i]); });

  var gCtx = gCanvas ? gCanvas.getContext('2d') : null;
  var gState = 'normal', gBlink = false, gBlinkTimer = 0, gNextBlink = 120 + Math.random() * 200;
  var gRageTimer = 0, gNextRage = 550 + Math.random() * 200, gRageDuration = 55;
  var origBorder = 'rgba(13,13,13,1)';

  function drawGorthog() {
    if (!gCtx) return;
    gCtx.clearRect(0, 0, 192, 192);
    gCtx.save();
    if (gState === 'rage') {
      var sx = (Math.random() - 0.5) * 10, sy = (Math.random() - 0.5) * 10;
      gCtx.translate(sx, sy);
      drawSprite(gCtx, gSpriteRage, GC);
    } else {
      drawSprite(gCtx, gBlink ? gSpriteBlink : gSpriteOpen, GC);
    }
    gCtx.restore();
  }

  var aCtx = aCanvas ? aCanvas.getContext('2d') : null;
  var smokeCanvas = document.getElementById('atticus-smoke');
  var smokeCtx = smokeCanvas ? smokeCanvas.getContext('2d') : null;
  var AC = {'.':'transparent','o':'#0d0d0d','h':'#6b4422','H':'#8b5e30','A':'#a07040','S':'#f0d8b8','w':'#c8a878','W':'#f0eee8','p':'#181010','b':'#c09868','n':'#c8a080','N':'#b09070','m':'#5c3a1e','L':'#c07060','l':'#a05848','T':'#1a1a1a','t':'#2a2a2a','E':'#c8a888','q':'#b09070','C':'#cccccc','f':'#e8260a','k':'#999999','e':'#3a2a18','s':'#e8c9a0'};
  var aBase = ['................................','........oooooooooooooooo........','........ohHHhHHhHHhHHhho........','........oHAhHAhHAhHAhHAo........','........ohHhHAhHhHhAhHho........','........oHhHhHAhHAhHhHHo........','........ohHhHhHhHhHhHhho........','........oooooooooooooooo........','........oSSSSSSSSSSSSSSo........','........oSSSSSSSSSSSSSSo........','......oEoSSSSSSSSSSSSSSoEo......','......oqoSSSeeeSSeeeSSSoqo......','......oEoSSSWWWSSWWWSSSoEo......','......oqoSSSWpWSSWpWSSSoqo......','......oEoSSSWWWSSWWWSSSoEo......','......oqoSSSbbbSSbbbSSSoqo......','........oSSSSSSSSSSSSSSo........','........oSSSSSSnnSSSSSSo........','........oSSSSSSnNnSSSSSo........','........oSSSSmmmmmmSSSSo........','........oSSSSSmmmmSSSSSo........','........oSSSSLLLLlfSSSSo........','........oSSSSSSllSSSSSSo........','........owSSSSSSSSSSSSwo........','.........oSSSSSSSSSSSSo.........','..........oSSSSSSSSSSo..........','...........oooooooooo...........','..........oTTTTTTTTTTo..........','.........oTTtTTTTTtTTTo.........','........oTTTtTTTTTtTTTTo........','.......oTTTTTTTTTTTTTTTTo.......','................................'];
  var aReachR = {}; aReachR[21] = '........oSSSSLLLLlfSSSSo.ss.....'; aReachR[22] = '........oSSSSSSllSSSSSSo..ss....';
  var aHoldR = {}; aHoldR[20] = '........oSSSSSmmmmSSSSSo.sss....'; aHoldR[21] = '........oSSSSLLoLLSSSSSo.skCCf..'; aHoldR[22] = '........oSSSSSSllSSSSSSo..sss...';
  [aBase].forEach(function (sp) { for (var i = 0; i < sp.length; i++) sp[i] = padRow(sp[i]); });
  [aReachR, aHoldR].forEach(function (o) { for (var k in o) if (o.hasOwnProperty(k)) o[k] = padRow(o[k]); });

  var smokeParticles = [];
  var CIG_X = 18, CIG_Y = 69, HELD_X = 29, HELD_Y = 69, MOUTH_X = 15, MOUTH_Y = 69;
  var smokingState = 'smoking', smokingTimer = 0;
  function spawnSmoke(sx, sy, count) {
    for (var i = 0; i < (count || 1); i++) {
      smokeParticles.push({x: sx + (Math.random() - 0.5) * 1.5, y: sy + (Math.random() - 0.5), vx: 0.04 + Math.random() * 0.08, vy: -0.18 - Math.random() * 0.15, alpha: 0.55 + Math.random() * 0.3, life: 0, maxLife: 90 + Math.random() * 70, wobble: Math.random() * Math.PI * 2});
    }
  }
  function updateSmoke() {
    if (!smokeCtx) return;
    smokeCtx.clearRect(0, 0, 32, 80);
    for (var i = smokeParticles.length - 1; i >= 0; i--) {
      var p = smokeParticles[i]; p.life++;
      if (p.life > p.maxLife) { smokeParticles.splice(i, 1); continue; }
      var t = p.life / p.maxLife;
      p.x += p.vx + Math.sin(p.wobble + p.life * 0.06) * 0.06;
      p.y += p.vy; p.wobble += 0.03;
      var alpha = p.alpha * (1 - t * t);
      if (alpha < 0.03) { smokeParticles.splice(i, 1); continue; }
      var shade = Math.floor(130 + (1 - t) * 70);
      smokeCtx.globalAlpha = alpha;
      smokeCtx.fillStyle = 'rgb(' + shade + ',' + shade + ',' + (shade - 8) + ')';
      smokeCtx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
    }
    smokeCtx.globalAlpha = 1;
  }
  function drawAtticus() {
    if (!aCtx) return;
    aCtx.clearRect(0, 0, 192, 192);
    var ov = null;
    if (smokingState === 'reaching' || smokingState === 'returning') ov = aReachR;
    else if (smokingState === 'exhaling') ov = aHoldR;
    for (var y = 0; y < aBase.length; y++) {
      var row = (ov && ov[y]) || aBase[y];
      for (var x = 0; x < row.length; x++) {
        var ch = row[x];
        if (ch === '.' || !AC[ch]) continue;
        aCtx.fillStyle = AC[ch];
        aCtx.fillRect(x * S, y * S, S, S);
      }
    }
    if (smokingState === 'smoking' && Math.random() < 0.3) {
      aCtx.fillStyle = '#ff6600';
      aCtx.fillRect(18 * S, 21 * S, S, S);
    }
  }

  function tick() {
    if (gCanvas) {
      if (gState === 'rage') {
        gRageTimer++;
        if (gRageTimer > gRageDuration) { gState = 'normal'; gRageTimer = 0; gNextRage = 550 + Math.random() * 200; gCanvas.style.borderColor = origBorder; }
      } else {
        gRageTimer++;
        if (gRageTimer > gNextRage) { gState = 'rage'; gRageTimer = 0; gCanvas.style.borderColor = '#e8260a'; }
        gBlinkTimer++;
        if (gBlink) { if (gBlinkTimer > 6) { gBlink = false; gBlinkTimer = 0; gNextBlink = 100 + Math.random() * 250; } }
        else { if (gBlinkTimer > gNextBlink) { gBlink = true; gBlinkTimer = 0; } }
      }
      drawGorthog();
    }
    if (aCanvas) {
      smokingTimer++;
      switch (smokingState) {
        case 'smoking':
          if (smokingTimer % 5 === 0) spawnSmoke(CIG_X, CIG_Y, 1);
          if (smokingTimer > 480) { smokingState = 'reaching'; smokingTimer = 0; }
          break;
        case 'reaching':
          if (smokingTimer % 4 === 0) spawnSmoke(CIG_X, CIG_Y, 1);
          if (smokingTimer > 18) { smokingState = 'exhaling'; smokingTimer = 0; }
          break;
        case 'exhaling':
          if (smokingTimer < 30 && smokingTimer % 2 === 0) spawnSmoke(MOUTH_X, MOUTH_Y, 3);
          if (smokingTimer % 6 === 0) spawnSmoke(HELD_X, HELD_Y, 1);
          if (smokingTimer > 90) { smokingState = 'returning'; smokingTimer = 0; }
          break;
        case 'returning':
          if (smokingTimer % 4 === 0) spawnSmoke(HELD_X, HELD_Y, 1);
          if (smokingTimer > 18) { smokingState = 'smoking'; smokingTimer = 0; }
          break;
      }
      drawAtticus();
      updateSmoke();
    }
    requestAnimationFrame(tick);
  }
  tick();
})();
