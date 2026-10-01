// The landing's static markup. The runtime (./runtime.js) enhances it in place, so React
// renders it once as HTML and never reconciles inside it.
export const LANDING_HTML = `
<a class="skip" href="#main">Skip to content</a>

<div class="env" aria-hidden="true"><svg id="contours" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"></svg></div>

<nav class="nav" aria-label="Main">
  <a class="brand" href="#top" aria-label="PathFinder, back to top">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 12l10 10 10-10z" fill="#b0673c"/></svg>
    PathFinder
  </a>
  <ul>
    <li><a href="#route">The route</a></li>
    <li><a href="#score">Scoring</a></li>
    <li><a href="#faq">FAQ</a></li>
    <li><a class="btn btn-accent" href="/start">Start your path</a></li>
  </ul>
</nav>

<header id="top">
  <section class="hero" id="hero" aria-label="Introduction">
    <div class="stage" id="stage">
      <div class="photo" id="photo">
        <div class="poster" aria-hidden="true"></div>
        <video id="heroVideo" preload="none" muted playsinline aria-hidden="true" tabindex="-1"></video>
      </div>
      <div class="paper-col" aria-hidden="true"></div>
      <canvas class="outline" id="outlineCv" aria-hidden="true"></canvas>

      <div class="band b1" style="--sa:.9">
        <span class="kicker mono">PathFinder · Alt 000</span>
        <h1 class="h-hero">
          <span class="sr">You sent the applications. Nobody wrote back.</span>
          <span aria-hidden="true" class="sharp">You sent the applications. <em>Nobody wrote back.</em></span>
          <span aria-hidden="true" class="soft">You sent the applications. <em>Nobody wrote back.</em></span>
        </h1>
      </div>

      <div class="band b2" data-ramp="0.06" style="--sa:.9">
        <p class="h-hero split zig">Start with the next turn.</p>
        <p class="sub-hero">A direction, a sharper CV, openings that fit. One switchback at a time.</p>
      </div>

      <div class="band b3" data-ramp="0.06" style="--sa:.9">
        <p class="h-hero split">Most of the climb is hidden.</p>
        <p class="sub-hero">Cold applications disappear into a pile. The way up is people, and practice.</p>
      </div>

      <div class="band b4" data-ramp="0.09" style="--sa:.92">
        <p class="h-hero split">Find your way up.</p>
        <p class="sub-hero">One route for your internship search, and the people who open the doors on it.</p>
        <div class="cta-row">
          <a class="btn btn-accent" href="/start" tabindex="-1">Start your path</a>
          <a class="btn btn-ghost" href="#route" tabindex="-1">See the route</a>
        </div>
      </div>

      <div class="hud" aria-hidden="true">
        <svg class="ring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-opacity=".2" stroke-width="3"/><circle id="ringArc" cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="126" style="stroke-dashoffset:var(--ld,126);transform:rotate(-90deg);transform-origin:50% 50%"/></svg>
      </div>
    </div>
  </section>

  <section class="phone-walk" id="phoneWalk" aria-label="Introduction">
    <div class="pstage" id="pstage">
      <img alt="" aria-hidden="true" data-src="/landing/place-1.jpg" width="1920" height="1072">
      <div class="pcap">
        <span class="kicker mono">PathFinder</span>
        <h1 class="h-hero">You sent the applications. <em>Nobody wrote back.</em></h1>
      </div>
      <img alt="" aria-hidden="true" data-src="/landing/place-2.jpg" width="1920" height="1072">
      <div class="pcap">
        <p class="h-hero">Start with the next turn.</p>
        <p class="sub-hero">A direction, a sharper CV, openings that fit. One switchback at a time.</p>
      </div>
      <img alt="" aria-hidden="true" data-src="/landing/place-3.jpg" width="1920" height="1072">
      <div class="pcap">
        <p class="h-hero">Most of the climb is hidden.</p>
        <p class="sub-hero">Cold applications disappear into a pile. The way up is people, and practice.</p>
      </div>
      <img alt="" aria-hidden="true" data-src="/landing/place-4.jpg" width="1920" height="1072">
      <canvas class="poutline" id="pOutlineCv" aria-hidden="true"></canvas>
      <div class="pcap">
        <p class="h-hero">Find your way <em>up.</em></p>
        <p class="sub-hero">One route for your internship search, and the people who open the doors on it.</p>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:20px">
          <a class="btn btn-accent" href="/start">Start your path</a>
          <a class="btn btn-ghost" href="#route">See the route</a>
        </div>
      </div>
    </div>
  </section>
</header>

<main id="main" tabindex="-1">

  <section class="marquee live-sec" aria-label="What PathFinder coaches">
    <div class="marquee-track"><span>Career direction</span><span>ATS-ready CVs</span><span>Referral outreach</span><span>Coffee chats</span><span>STAR stories</span><span>Pattern drills</span><span>Mock interviews</span><span>Application tracking</span><span aria-hidden="true">Career direction</span><span aria-hidden="true">ATS-ready CVs</span><span aria-hidden="true">Referral outreach</span><span aria-hidden="true">Coffee chats</span><span aria-hidden="true">STAR stories</span><span aria-hidden="true">Pattern drills</span><span aria-hidden="true">Mock interviews</span><span aria-hidden="true">Application tracking</span></div>
  </section>

  <section id="route" aria-labelledby="route-h" tabindex="-1">
    <canvas id="routeCv" aria-hidden="true"></canvas>
    <div class="rpanel" id="rpanel" aria-live="polite">
      <span class="eyebrow mono">The route</span>
      <h2 id="route-h">Six stages. <em>Two of them are steep.</em></h2>
      <p class="line">You never need the whole mountain. Just the next step on it.</p>
    </div>
    <nav class="rnav" aria-label="Route stages">
      <ol class="wps" id="wps"></ol>
      <button class="btn btn-accent" id="rnext" type="button">Take the first step</button>
    </nav>
  </section>

  <section class="section reveal live-sec" id="score" aria-labelledby="score-h">
    <div class="score">
      <div>
        <span class="eyebrow mono rv">Honest scoring</span>
        <h2 class="h2 rv" id="score-h">Your score counts what you did. <em>Not what you say.</em></h2>
        <p class="lede rv">Readiness moves when there's evidence: a CV uploaded, a contact logged, a mock round done. A slider can't fake it. Networking and interviews count the most, because that's where offers come from.</p>
        <ul class="weights rv" aria-label="Example: one student's evidence at each stage, which builds the readiness score">
          <li><span>Direction</span><span class="bar"><i data-t="1" data-w=".14" data-a="0" data-b=".16"></i></span></li>
          <li><span>CV</span><span class="bar"><i data-t=".9" data-w=".18" data-a=".2" data-b=".36"></i></span></li>
          <li><span>Opportunities</span><span class="bar"><i data-t=".8" data-w=".14" data-a=".4" data-b=".56"></i></span></li>
          <li class="heavy"><span>Networking <small class="mono">weighted most</small></span><span class="bar"><i data-t=".7" data-w=".28" data-a=".6" data-b=".76"></i></span></li>
          <li class="heavy"><span>Interview <small class="mono">weighted most</small></span><span class="bar"><i data-t=".6" data-w=".26" data-a=".8" data-b=".96"></i></span></li>
        </ul>
      </div>
      <div class="gauge rv" role="img" aria-label="Example career readiness score, built from the evidence in each stage">
        <svg viewBox="0 0 200 200">
          <circle class="pulse" cx="100" cy="100" r="62"/>
          <circle class="track" cx="100" cy="100" r="80"/>
          <circle class="arc" id="arc" cx="100" cy="100" r="80" stroke-dasharray="503" stroke-dashoffset="503"/>
          <g id="ticks"></g>
          <text class="g-tag" x="100" y="74" text-anchor="middle">EXAMPLE</text>
          <text class="g-num" id="gNum" x="100" y="112" text-anchor="middle">0</text>
          <text class="g-lab" x="100" y="134" text-anchor="middle">Career readiness</text>
        </svg>
      </div>
    </div>
  </section>

  <section class="section reveal" id="faq" aria-labelledby="faq-h">
    <span class="eyebrow mono rv">Before you start</span>
    <h2 class="h2 rv" id="faq-h">The questions people <em>actually ask.</em></h2>
    <div class="faq-list rv">
      <details><summary>Is it too late to start?</summary><p>Most schemes review on a rolling basis, so earlier is easier. But the route starts from wherever you are today, and the next step is always a small one.</p></details>
      <details><summary>Do I need an account?</summary><p>No. Every stage works without signing in, and your progress stays in your browser. You sign in when you want AI to draft something for you.</p></details>
      <details><summary>Will it apply for me?</summary><p>No. It tells you the next move and helps you prepare it. Every message and application is sent by you.</p></details>
      <details><summary>Does the AI write my CV?</summary><p>It drafts and critiques. You decide what goes in, and it asks you to keep every line true.</p></details>
      <details><summary>I don't know what to say to people.</summary><p>You never start from a blank page. Every message begins with something specific about them, PathFinder drafts it with you, and you send it yourself.</p></details>
      <details><summary>I don't have any experience.</summary><p>Projects, societies and coursework count. PathFinder helps turn them into proof: a project worth showing and stories you can tell in an interview.</p></details>
      <details><summary>I keep getting rejected.</summary><p>The timing of a rejection usually tells you what to fix: minutes point to the CV, days to positioning, after an interview to your stories. Each no becomes a next step.</p></details>
      <details><summary>What does it cost?</summary><p>Free during early access. No card.</p></details>
    </div>
  </section>

  <section class="section final reveal live-sec" id="start" aria-labelledby="start-h">
    <div class="dawn" aria-hidden="true"></div>
    <div class="motes" aria-hidden="true"></div>
    <span class="eyebrow mono rv">Stage 00</span>
    <h2 class="h2 rv" id="start-h">The next step is <em>small.</em></h2>
    <p class="lede rv">Tell us where you're aiming. We'll show you the route.</p>
    <div class="rv"><a class="btn btn-accent" href="/start">Start your path</a></div>
  </section>
</main>

<footer>
  <a class="brand" href="#top"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 12l10 10 10-10z" fill="#b0673c"/></svg>PathFinder</a>
  <ul>
    <li><a href="#route">The route</a></li>
    <li><a href="#score">Scoring</a></li>
    <li><a href="#faq">FAQ</a></li>
    <li><a href="/universities">For universities</a></li>
    <li><a href="/privacy">Privacy</a></li>
    <li><a href="/terms">Terms</a></li>
  </ul>
  <p class="disclose">The mountain walk is AI-generated footage.</p>
</footer>

`;
