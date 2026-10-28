/** Lazy loader for the Google Maps JavaScript API. */

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
    __tracksafarGoogleMapsReady?: () => void;
    __tracksafarGoogleMapsError?: () => void;
  }
}
export const GOOGLE_MAPS_API_KEY: string =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() ??
  "";
let loadPromise: Promise<any> | null = null;
let observerGuarded = false;

/**
 * The Maps bootstrap can call observe() with no element when the key is
 * rejected (e.g. ApiNotActivatedMapError). Guard it so one provider error does
 * not surface as an unrelated uncaught TypeError.
 */
function guardIntersectionObserver() {
  if (observerGuarded || typeof IntersectionObserver === "undefined") return;
  observerGuarded = true;
  const original = IntersectionObserver.prototype.observe;
  IntersectionObserver.prototype.observe = function observe(target: Element) {
    if (!(target instanceof Element)) return;
    return original.call(this, target);
  };
}
export function loadGoogleMaps(apiKey: string): Promise<any> {
  guardIntersectionObserver();
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;
    const cleanup = () => {
      window.clearTimeout(timer);
      delete window.__tracksafarGoogleMapsReady;
      delete window.__tracksafarGoogleMapsError;
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      script.remove();
      reject(new Error(message));
    };
    const timer = window.setTimeout(
      () =>
        fail("The map took too long to load. Check your connection and retry."),
      8_000,
    );
    window.__tracksafarGoogleMapsReady = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(window.google);
    };
    window.__tracksafarGoogleMapsError = () => {
      fail(
        "Google Maps rejected the API key. Check the key and its HTTP referrer restrictions.",
      );
    };
    script.onerror = () =>
      fail("The map could not be loaded. Check your connection and retry.");
    script.async = true;
    script.defer = true;
    script.dataset.tracksafarGoogleMaps = "true";
    script.src =
      "https://maps.googleapis.com/maps/api/js" +
      "?key=" +
      encodeURIComponent(apiKey) +
      "&v=weekly&loading=async&callback=__tracksafarGoogleMapsReady";
    document.head.appendChild(script);
  }).catch((error) => {
    loadPromise = null;
    throw error;
  });
  return loadPromise;
}
