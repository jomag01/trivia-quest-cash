import { Capacitor } from '@capacitor/core';

// Native-only startup: hide splash, style status bar, handle Android back button.
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const [{ SplashScreen }, { StatusBar, Style }, { App }] = await Promise.all([
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
      import('@capacitor/app'),
    ]);
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#0a0a0a' }).catch(() => {});
    }
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) window.history.back();
      else App.exitApp();
    });
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const u = new URL(url);
        const path = u.protocol.startsWith('http') ? u.pathname + u.search : '/' + u.host + u.pathname + u.search;
        if (path && path !== window.location.pathname + window.location.search) window.location.assign(path);
      } catch { /* ignore */ }
    });
    setTimeout(() => SplashScreen.hide().catch(() => {}), 300);
  } catch (e) {
    console.warn('Native init failed', e);
  }
}
