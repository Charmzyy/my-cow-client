<script setup>
import Icon from './Icon.vue';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
});
</script>

<template>
  <div class="auth">
    <aside class="auth-aside d-none d-lg-flex">
      <router-link to="/" class="auth-brand auth-brand-light" aria-label="MyCow home">
        <span class="mc-mark" aria-hidden="true"></span>MyCow
      </router-link>
      <div class="auth-aside-inner">
        <h2>Identify the breed.<br />Keep a record you can trust.</h2>
        <ul>
          <li><Icon name="camera" :size="18" /> One photo from your phone is enough</li>
          <li><Icon name="sprout" :size="18" /> Eight dairy, beef and zebu breeds</li>
          <li><Icon name="shield" :size="18" /> Results reviewed by livestock officers</li>
        </ul>
      </div>
      <span class="auth-aside-cow" aria-hidden="true"></span>
    </aside>

    <section class="auth-main">
      <router-link to="/" class="auth-brand d-lg-none mb-4" aria-label="MyCow home">
        <span class="mc-mark" aria-hidden="true"></span>MyCow
      </router-link>
      <div class="auth-card">
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="auth-sub">{{ subtitle }}</p>
        <slot />
      </div>
      <div class="auth-foot"><slot name="footer" /></div>
    </section>
  </div>
</template>

<style>
.auth { min-height: 100vh; display: grid; grid-template-columns: 1fr; }
@media (min-width: 992px) { .auth { grid-template-columns: minmax(380px, 5fr) 7fr; } }

.auth-aside {
  position: relative; overflow: hidden; color: #fff; padding: 7rem 3.5rem 3rem;
  background: linear-gradient(160deg, var(--mc-green-700) 0%, var(--mc-green-900) 70%, var(--mc-green-950) 100%);
  align-items: center;
}
.auth-aside-inner { position: relative; z-index: 1; max-width: 26rem; }
.auth-brand { display: inline-flex; align-items: center; gap: .6rem; font-weight: 800; font-size: 1.25rem; color: var(--mc-ink); letter-spacing: -0.02em; }
.auth-brand:hover { color: var(--mc-ink); }
.auth-brand-light { position: absolute; top: 2rem; left: 3.5rem; z-index: 1; color: #fff; }
.auth-brand-light:hover { color: #fff; }
.auth-brand-light .mc-mark { background: rgb(255 255 255 / 14%); }
.auth-aside h2 { color: #fff; font-size: 2rem; line-height: 1.2; margin: .75rem 0 1.75rem; }
.auth-aside ul { list-style: none; padding: 0; margin: 0; display: grid; gap: .9rem; }
.auth-aside li { display: flex; align-items: center; gap: .7rem; color: rgb(255 255 255 / 88%); }
.auth-aside li svg { color: var(--mc-gold-500); flex: none; }
.auth-aside-cow {
  position: absolute; right: -60px; bottom: -40px; width: 380px; height: 300px; opacity: .1;
  background: var(--mc-gold-500); -webkit-mask: url(/cow.svg) center / contain no-repeat; mask: url(/cow.svg) center / contain no-repeat;
}

.auth-main { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 2.5rem 1rem; }
.auth-card {
  width: 100%; max-width: 440px; background: var(--mc-surface); border: 1px solid var(--mc-border);
  border-radius: 18px; box-shadow: var(--mc-shadow); padding: 2rem 1.5rem;
}
@media (min-width: 576px) { .auth-card { padding: 2.5rem 2.25rem; } }
.auth-card h1 { font-size: 1.75rem; margin: 0 0 .35rem; }
.auth-sub { color: var(--mc-ink-2); margin-bottom: 1.5rem; }
.auth-card form { display: grid; gap: 1.1rem; }
.auth-foot { margin-top: 1.25rem; color: var(--mc-ink-2); text-align: center; font-size: .95rem; }
.auth-foot a { font-weight: 650; }
</style>
