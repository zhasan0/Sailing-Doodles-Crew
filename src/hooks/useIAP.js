import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { logIAP as log } from '@/hooks/useIAPLogger';
// ██████████████████████████████████████████████████
// NEW BUILD MARKER 2026-03-29 v3 — Capacitor ESM import
// Uses static import (Capacitor-native) instead of
// require() or window.CdvPurchase (Cordova-only).
// ██████████████████████████████████████████████████

// Static ES module import — this is the Capacitor-compatible way.
// require() doesn't work in browser/WKWebView (no CommonJS).
// window.CdvPurchase injection requires the Cordova bridge (not present in Capacitor).
import * as CdvPurchaseModule from 'cordova-plugin-purchase';

export const IAP_PRODUCT_ID = 'com.sailingdoodles.crew.monthly';

const getPlugin = () => {
  // keys = "default" means it's a default export
  if (CdvPurchaseModule && CdvPurchaseModule.default && CdvPurchaseModule.default.store) return CdvPurchaseModule.default;
  if (CdvPurchaseModule && CdvPurchaseModule.store) return CdvPurchaseModule;
  if (typeof window !== 'undefined' && window.CdvPurchase && window.CdvPurchase.store) return window.CdvPurchase;
  return null;
};

if (typeof window !== 'undefined') {
  log('[DIAG] === STARTUP v3 ===');
  log('[DIAG] CdvPurchaseModule type = ' + typeof CdvPurchaseModule);
  log('[DIAG] CdvPurchaseModule.store type = ' + typeof (CdvPurchaseModule && CdvPurchaseModule.store));
  log('[DIAG] CdvPurchaseModule keys = ' + (CdvPurchaseModule ? Object.keys(CdvPurchaseModule).join(',') : 'none'));
  log('[DIAG] window.cordova = ' + typeof window.cordova);
  log('[DIAG] window.Capacitor = ' + typeof window.Capacitor);
  log('[DIAG] isNativePlatform = ' + (window.Capacitor && window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : 'n/a'));
  log('[DIAG] getPlugin() at startup = ' + !!getPlugin());
}

export function useIAP() {
  log('[DIAG] ████ NEW BUILD MARKER 2026-03-29 v3 ████ useIAP() mounted');
  const [store, setStore] = useState(null);
  const [product, setProduct] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [isNative, setIsNative] = useState(!!getPlugin());
  const purchaseTimeoutRef = useRef(null);

  useEffect(() => {
    const initStore = () => {
      const plugin = getPlugin();
      log('initStore called. plugin available = ' + !!plugin);

      if (!plugin) {
        log('Plugin NOT found — IAP disabled');
        setReady(true);
        return;
      }

      log('Plugin found via Capacitor ESM import, initializing store...');
      setIsNative(true);
      const { store: cdvStore, ProductType, Platform, LogLevel } = plugin;

      cdvStore.verbosity = LogLevel ? (LogLevel.DEBUG || 4) : 4;

      cdvStore.register([{
        id: IAP_PRODUCT_ID,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.APPLE_APPSTORE,
      }]);
      log('Registered product: ' + IAP_PRODUCT_ID);

      cdvStore.when().productUpdated((p) => {
        const price = p.offers && p.offers[0] && p.offers[0].pricingPhases && p.offers[0].pricingPhases[0] ? p.offers[0].pricingPhases[0].price : 'n/a';
        log('productUpdated: id=' + p.id + ' state=' + p.state + ' price=' + price);
        if (p.id === IAP_PRODUCT_ID) setProduct(p);
      });

      cdvStore.when().approved(async (transaction) => {
        log('Transaction APPROVED: ' + transaction.transactionId);
        try {
          const localReceipt = cdvStore.localReceipts && cdvStore.localReceipts.find(function(r) { return r.platform === Platform.APPLE_APPSTORE; });
          const appStoreReceipt =
            (transaction.nativeData && transaction.nativeData.appStoreReceipt) ||
            (localReceipt && localReceipt.nativeData && localReceipt.nativeData.appStoreReceipt);

          if (appStoreReceipt) {
            log('Sending receipt to verifyAppleReceipt backend...');
            await base44.functions.invoke('verifyAppleReceipt', { receipt: appStoreReceipt });
            log('Receipt verified successfully');
          } else {
            log('WARNING: No appStoreReceipt found on transaction');
          }
          setPurchaseSuccess(true);
        } catch (err) {
          log('Receipt verification FAILED: ' + err.message);
          setError('Purchase succeeded but verification failed. Please restore purchases.');
        }
        await transaction.finish();
        log('Transaction finished');
        if (purchaseTimeoutRef.current) clearTimeout(purchaseTimeoutRef.current);
        setPurchasing(false);
        setRestoring(false);
      });

      // Note: .cancelled() does not exist on when() in v13 — cancellations surface via store.error()

      cdvStore.error((err) => {
        const isCancelled = err && (err.code === 6 || (err.message && err.message.toLowerCase().includes('cancel')));
        log('Store ERROR: code=' + (err && err.code) + ' msg=' + (err && err.message) + ' cancelled=' + isCancelled);
        if (purchaseTimeoutRef.current) clearTimeout(purchaseTimeoutRef.current);
        setPurchasing(false);
        setRestoring(false);
        if (!isCancelled) {
          setError((err && err.message) || 'Purchase failed. Please try again.');
        }
      });

      cdvStore.initialize([Platform.APPLE_APPSTORE]).then(() => {
        log('Store initialized successfully');
        log('Products after init: ' + cdvStore.products.length + ' total');

        if (cdvStore.products.length === 0) {
          log('WARNING: 0 products after init — calling store.update() to fetch from Apple...');
        }

        // CRITICAL: update() triggers the actual StoreKit product fetch from Apple
        return cdvStore.update();
      }).then(() => {
        log('store.update() complete');
        log('Products after update: ' + cdvStore.products.length + ' total');

        if (cdvStore.products.length === 0) {
          log('ERROR: Still 0 products after update. Check: 1) Product ID matches App Store Connect, 2) IAP capability enabled in Xcode, 3) Sandbox tester account active, 4) Product approved/ready for sale in ASC');
        } else {
          cdvStore.products.forEach(p => {
            log('Product found: id=' + p.id + ' state=' + p.state + ' type=' + p.type);
          });
        }

        setStore(cdvStore);
        setReady(true);
      }).catch((err) => {
        log('Store initialization or update FAILED: ' + (err && (err.message || JSON.stringify(err))));
        log('Capacitor.isNativePlatform = ' + (window.Capacitor && window.Capacitor.isNativePlatform ? window.Capacitor.isNativePlatform() : 'n/a'));
        setError('Could not connect to App Store. Please try again.');
        setReady(true);
      });
    };

    log('On mount: getPlugin()=' + !!getPlugin());

    if (getPlugin()) {
      initStore();
      return;
    }

    // Wait for Capacitor bridge to be ready
    let initialized = false;
    const safeInit = () => {
      if (initialized) return;
      if (!getPlugin()) {
        log('safeInit: still no plugin after bridge ready');
        setReady(true);
        return;
      }
      initialized = true;
      initStore();
    };

    // Capacitor fires 'deviceready' equivalent via its own events, but also try deviceready
    log('Plugin not ready on mount — waiting for bridge...');
    document.addEventListener('deviceready', safeInit, { once: true });

    // Short poll — in Capacitor the plugin should be available almost immediately
    let pollCount = 0;
    const pollTimer = setInterval(() => {
      pollCount++;
      const pluginNow = !!getPlugin();
      log('[DIAG] poll #' + pollCount + ': getPlugin()=' + pluginNow);
      if (pluginNow) {
        clearInterval(pollTimer);
        safeInit();
      } else if (pollCount >= 6) {
        // 3 seconds — if not available by now, it won't appear
        clearInterval(pollTimer);
        log('[DIAG] Plugin not available after 3s poll. Module keys: ' + (CdvPurchaseModule ? Object.keys(CdvPurchaseModule).join(',') : 'none'));
        log('[DIAG] This means native plugin is NOT installed in the iOS binary. Run: npx cap sync ios, then re-archive in Xcode.');
        setReady(true);
      }
    }, 500);

    return () => {
      document.removeEventListener('deviceready', safeInit);
      clearInterval(pollTimer);
    };
  }, []);

  const purchase = useCallback(async () => {
    setError(null);
    setPurchaseSuccess(false);
    log('[DIAG] ████ NEW BUILD MARKER 2026-03-29 v3 ████ purchase() invoked');
    log('purchase() called');

    if (!getPlugin()) {
      log('purchase() aborted: plugin not available');
      setError('In-app purchases are only available in the iOS app.');
      return;
    }
    if (!store) {
      log('purchase() aborted: store not initialized yet');
      setError('Store not ready. Please wait a moment and try again.');
      return;
    }
    if (!product) {
      log('purchase() aborted: product "' + IAP_PRODUCT_ID + '" not loaded');
      setError('Product not loaded from App Store. Check product ID and IAP capability.');
      return;
    }
    if (!product.offers || !product.offers[0]) {
      log('purchase() aborted: product has no offers');
      setError('No offers available for this product.');
      return;
    }

    log('Calling store.order() for ' + product.id);
    setPurchasing(true);
    purchaseTimeoutRef.current = setTimeout(() => {
      log('Purchase TIMEOUT after 60s');
      setPurchasing(false);
      setError('Purchase timed out. If you were charged, use Restore Purchases.');
    }, 60000);

    try {
      await store.order(product.offers[0]);
      log('store.order() returned — awaiting callback...');
    } catch (err) {
      log('store.order() threw: ' + err.message);
      if (purchaseTimeoutRef.current) clearTimeout(purchaseTimeoutRef.current);
      setError(err.message || 'Purchase failed.');
      setPurchasing(false);
    }
  }, [store, product]);

  const restorePurchases = useCallback(async () => {
    setError(null);
    setRestoring(true);
    if (!getPlugin() || !store) {
      setRestoring(false);
      setError('Restore is only available in the iOS app.');
      return;
    }
    log('Restoring purchases...');
    try {
      await store.restorePurchases();
      log('restorePurchases() completed');
    } catch (err) {
      log('restorePurchases() failed: ' + err.message);
      setError(err.message || 'Restore failed.');
    }
    setRestoring(false);
  }, [store]);

  return {
    product,
    purchasing,
    restoring,
    error,
    ready,
    purchaseSuccess,
    isNative,
    purchase,
    restorePurchases,
  };
}