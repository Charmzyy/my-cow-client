import { reactive } from 'vue';

// "Install MyCow" (home-screen app). Android Chrome offers it through an event we keep until the
// person taps Install; iPhones have no such event: there it's Share → Add to Home Screen.
// Imported from main.js so the event isn't missed before a screen that shows the button loads.

const standalone = () => typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export const install = reactive({
  prompt: null,                 // the browser's install offer, when it has made one
  installed: standalone(),
  ios: typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent),
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();     // we show our own button instead of the browser's mini bar
    install.prompt = event;
  });
  window.addEventListener('appinstalled', () => {
    install.installed = true;
    install.prompt = null;
  });
}

export async function promptInstall() {
  const offer = install.prompt;
  if (!offer) return false;
  offer.prompt();
  const { outcome } = await offer.userChoice;
  install.prompt = null;
  return outcome === 'accepted';
}
