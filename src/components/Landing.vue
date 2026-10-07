<script setup>
import Icon from './ui/Icon.vue';
import { BREEDS, breedLabel } from '../breeds';

const breeds = Object.entries(BREEDS);
const year = new Date().getFullYear();

const steps = [
  { icon: 'camera', title: 'Take a photo', text: 'Stand side-on to the animal in good daylight and snap the whole cow with your phone.' },
  { icon: 'sprout', title: 'Get the breed', text: 'Our model compares it against eight breeds and shows the most likely match with a confidence score.' },
  { icon: 'shield', title: 'Get it certified', text: 'A livestock officer reviews the result. Approved animals receive a certified breed record.' },
];

const audiences = [
  { icon: 'sprout', title: 'Farmers', text: 'Know what you keep before you breed, sell or plan feeding and milk targets.' },
  { icon: 'tag', title: 'Buyers & traders', text: 'Check a breed claim on the spot at the market before money changes hands.' },
  { icon: 'review', title: 'Officers & cooperatives', text: 'Review submissions in one queue and issue verified records for your members.' },
];
</script>

<template>
  <div class="landing">
    <!-- Hero -->
    <section class="hero">
      <div class="container">
        <div class="row align-items-center g-5">
          <div class="col-lg-6">
            <span class="mc-eyebrow"><Icon name="sprout" :size="16" /> Cattle breed identification</span>
            <h1 class="hero-title">Know your cow’s breed in seconds.</h1>
            <p class="hero-lead">
              Snap a photo with your phone. MyCow identifies the breed, and a livestock officer
              reviews it so you get a record you can trust.
            </p>
            <div class="hero-ctas">
              <router-link to="/register" class="btn btn-primary btn-lg">
                Identify a cow, free <Icon name="arrow-right" :size="18" />
              </router-link>
              <router-link to="/login" class="btn btn-outline btn-lg">I have an account</router-link>
            </div>
            <ul class="hero-points">
              <li><Icon name="phone" :size="16" /> Works on any smartphone</li>
              <li><Icon name="image" :size="16" /> Light on mobile data</li>
              <li><Icon name="shield" :size="16" /> Officer-verified results</li>
            </ul>
          </div>

          <div class="col-lg-6">
            <div class="hero-visual" aria-hidden="true">
              <div class="mock mc-card">
                <div class="mock-photo"><span class="mock-cow"></span><span class="mock-scan"></span></div>
                <div class="mock-body">
                  <span class="mc-eyebrow">Example result</span>
                  <div class="d-flex align-items-baseline justify-content-between mt-1">
                    <span class="mock-breed">Boran</span>
                    <span class="mock-pct">94.2%</span>
                  </div>
                  <div class="mc-meter high my-2"><span style="width: 94%"></span></div>
                  <div class="d-flex flex-wrap gap-2">
                    <span class="mc-chip mc-chip-ink">Beef · East Africa</span>
                    <span class="mc-chip mc-chip-gold"><Icon name="clock" :size="14" /> Awaiting officer review</span>
                  </div>
                </div>
              </div>
              <div class="float-badge mc-card">
                <span class="float-icon"><Icon name="award" :size="20" /></span>
                <div><strong>Certified</strong><small>by a livestock officer</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Breeds -->
    <section class="section section-tight">
      <div class="container">
        <div class="text-center mb-4">
          <h2 class="section-title">Recognises 8 breeds</h2>
          <p class="section-lead mx-auto">From hardy East African zebu to high-yield dairy breeds.</p>
        </div>
        <div class="breed-grid">
          <div v-for="[name, b] in breeds" :key="name" class="breed mc-card">
            <div class="d-flex align-items-center justify-content-between gap-2">
              <strong>{{ breedLabel(name) }}</strong>
              <span class="mc-chip" :class="b.use === 'Dairy' ? 'mc-chip-green' : b.use === 'Beef' ? 'mc-chip-ochre' : 'mc-chip-gold'">{{ b.use }}</span>
            </div>
            <p>{{ b.note }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="section">
      <div class="container">
        <div class="text-center mb-5">
          <span class="mc-eyebrow">How it works</span>
          <h2 class="section-title">Three steps, about a minute</h2>
        </div>
        <div class="row g-4">
          <div v-for="(s, i) in steps" :key="s.title" class="col-md-4">
            <div class="step">
              <div class="step-icon"><Icon :name="s.icon" :size="26" /><span class="step-num">{{ i + 1 }}</span></div>
              <h3>{{ s.title }}</h3>
              <p>{{ s.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Who it's for -->
    <section class="section section-alt">
      <div class="container">
        <div class="row g-4 align-items-center">
          <div class="col-lg-4">
            <span class="mc-eyebrow">Built for the field</span>
            <h2 class="section-title">For everyone who works with cattle</h2>
            <p class="section-lead">Simple enough for a first-time smartphone user, structured enough for a cooperative’s records.</p>
          </div>
          <div class="col-lg-8">
            <div class="row g-3">
              <div v-for="a in audiences" :key="a.title" class="col-md-4">
                <div class="audience mc-card">
                  <span class="audience-icon"><Icon :name="a.icon" :size="22" /></span>
                  <h3>{{ a.title }}</h3>
                  <p>{{ a.text }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA band -->
    <section class="section">
      <div class="container">
        <div class="cta-band">
          <div>
            <h2>Ready to identify your herd?</h2>
            <p>Create a free account and submit your first photo today.</p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <router-link to="/register" class="btn btn-accent btn-lg">Create free account</router-link>
            <router-link to="/login" class="btn btn-ghost-light btn-lg">Sign in</router-link>
          </div>
        </div>
      </div>
    </section>

    <footer class="site-footer">
      <div class="container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2">
          <span class="mc-mark" style="width: 32px; height: 32px; border-radius: 9px" aria-hidden="true"></span>
          <strong>MyCow</strong>
          <span class="text-muted-2">· Cattle breed identification</span>
        </div>
        <div class="d-flex gap-3 align-items-center">
          <router-link to="/login">Sign in</router-link>
          <router-link to="/register">Create account</router-link>
          <span class="text-muted-2">© {{ year }} MyCow</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
.landing .hero {
  padding: 3rem 0 4rem;
  background:
    radial-gradient(60rem 30rem at 85% -10%, rgb(224 165 38 / 16%), transparent 60%),
    radial-gradient(50rem 30rem at -10% 110%, rgb(27 94 55 / 10%), transparent 60%);
}
@media (min-width: 992px) { .landing .hero { padding: 5rem 0 6rem; } }
.hero-title {
  font-size: clamp(2.2rem, 6vw, 3.6rem); line-height: 1.05; font-weight: 800;
  letter-spacing: -0.03em; margin: 1rem 0 1.1rem;
}
.hero-lead { font-size: clamp(1.05rem, 2vw, 1.2rem); color: var(--mc-ink-2); max-width: 34rem; line-height: 1.6; }
.hero-ctas { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.75rem; }
@media (max-width: 575px) { .hero-ctas .btn { width: 100%; } }
.hero-points { list-style: none; padding: 0; margin: 1.75rem 0 0; display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; color: var(--mc-ink-2); font-size: .92rem; font-weight: 600; }
.hero-points li { display: inline-flex; align-items: center; gap: .4rem; }
.hero-points svg { color: var(--mc-green-700); }

.hero-visual { position: relative; max-width: 440px; margin: 0 auto; padding: 0 0 2rem; }
.mock { overflow: hidden; box-shadow: var(--mc-shadow-lg); transform: rotate(-1.5deg); }
.mock-photo {
  position: relative; aspect-ratio: 16 / 10; overflow: hidden;
  background: linear-gradient(180deg, #f6e7bd 0%, #f2d48a 52%, #a7bf6f 53%, #6f9447 100%);
}
.mock-cow {
  position: absolute; left: 16%; right: 16%; top: 22%; bottom: 6%;
  background: #3b2a22; -webkit-mask: url(/cow.svg) center / contain no-repeat; mask: url(/cow.svg) center / contain no-repeat;
}
.mock-scan {
  position: absolute; inset: 14% 12%; border: 2px solid rgb(255 255 255 / 85%); border-radius: 12px;
  box-shadow: 0 0 0 999px rgb(0 0 0 / 8%);
}
.mock-body { padding: 1.1rem 1.25rem 1.3rem; }
.mock-breed { font-size: 1.6rem; font-weight: 800; letter-spacing: -0.02em; }
.mock-pct { font-weight: 750; color: var(--mc-green-800); font-variant-numeric: tabular-nums; }
.float-badge {
  position: absolute; right: -6px; bottom: 0; display: flex; align-items: center; gap: .7rem;
  padding: .75rem 1rem; box-shadow: var(--mc-shadow-lg); transform: rotate(2deg);
}
.float-badge strong { display: block; line-height: 1.1; }
.float-badge small { color: var(--mc-muted); }
.float-icon { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--mc-gold-500); color: var(--mc-ink); }

.landing .section { padding: 4rem 0; }
.landing .section-tight { padding: 2.5rem 0 3rem; }
.landing .section-alt { background: var(--mc-surface); border-block: 1px solid var(--mc-border); }
.section-title { font-size: clamp(1.6rem, 3.5vw, 2.3rem); font-weight: 800; letter-spacing: -0.02em; margin: .5rem 0 .6rem; }
.section-lead { color: var(--mc-ink-2); max-width: 36rem; font-size: 1.05rem; }

.breed-grid { display: grid; gap: .85rem; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
.breed { padding: 1rem 1.1rem; box-shadow: none; }
.breed p { margin: .45rem 0 0; color: var(--mc-ink-2); font-size: .9rem; line-height: 1.5; }

.step { text-align: center; padding: 0 1rem; }
.step-icon {
  position: relative; width: 68px; height: 68px; margin: 0 auto 1.1rem; border-radius: 20px;
  display: grid; place-items: center; background: var(--mc-green-700); color: #fff;
}
.step-num {
  position: absolute; top: -8px; right: -8px; width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center; background: var(--mc-gold-500); color: var(--mc-ink);
  font-weight: 800; font-size: .85rem; border: 3px solid var(--mc-cream);
}
.step h3 { font-size: 1.2rem; }
.step p { color: var(--mc-ink-2); max-width: 22rem; margin: 0 auto; }

.audience { padding: 1.4rem; height: 100%; box-shadow: none; background: var(--mc-cream); }
.audience-icon { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--mc-green-100); color: var(--mc-green-800); margin-bottom: .9rem; }
.audience h3 { font-size: 1.1rem; }
.audience p { color: var(--mc-ink-2); margin: 0; font-size: .95rem; }

.cta-band {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1.5rem;
  padding: 2.5rem; border-radius: 22px; color: #fff;
  background: linear-gradient(135deg, var(--mc-green-800), var(--mc-green-950));
  position: relative; overflow: hidden;
}
.cta-band::after {
  content: ""; position: absolute; right: -40px; bottom: -50px; width: 260px; height: 200px; opacity: .12;
  background: var(--mc-gold-500); -webkit-mask: url(/cow.svg) center / contain no-repeat; mask: url(/cow.svg) center / contain no-repeat;
}
.cta-band h2 { color: #fff; font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 .35rem; }
.cta-band p { margin: 0; color: rgb(255 255 255 / 80%); }
.cta-band > * { position: relative; z-index: 1; }
@media (max-width: 575px) { .cta-band { padding: 1.75rem; } .cta-band .btn { width: 100%; } }

.site-footer { padding: 2rem 0 2.5rem; border-top: 1px solid var(--mc-border); font-size: .92rem; }
.site-footer a { color: var(--mc-ink-2); font-weight: 600; }
.site-footer a:hover { color: var(--mc-green-700); }
.text-muted-2 { color: var(--mc-muted); }
</style>
