const ARCGIS_CDN_URL = "https://js.arcgis.com/5.1.21/";
const ARCGIS_SCRIPT_ID = "catalyst-arcgis-sdk";
const ARCGIS_STYLESHEET_ID = "catalyst-arcgis-theme";
const ARCGIS_STYLESHEET_URL = `${ARCGIS_CDN_URL}esri/themes/dark/main.css`;

export interface ArcGisCdn {
  import<T>(moduleIds: string[]): Promise<T>;
}

declare global {
  interface Window {
    $arcgis?: ArcGisCdn;
    esriConfig?: { apiKey?: string };
  }
}

let loaderPromise: Promise<ArcGisCdn> | null = null;

export function loadArcGisSdk(apiKey?: string) {
  if (typeof window === "undefined") return Promise.reject(new Error("ArcGIS requires a browser."));
  if (window.$arcgis) return Promise.resolve(window.$arcgis);
  if (loaderPromise) return loaderPromise;

  const attempt = new Promise<ArcGisCdn>((resolve, reject) => {
    if (apiKey) window.esriConfig = { ...window.esriConfig, apiKey };
    if (!document.getElementById(ARCGIS_STYLESHEET_ID)) {
      const stylesheet = document.createElement("link");
      stylesheet.id = ARCGIS_STYLESHEET_ID;
      stylesheet.rel = "stylesheet";
      stylesheet.href = ARCGIS_STYLESHEET_URL;
      document.head.append(stylesheet);
    }
    const fail = () => {
      document.getElementById(ARCGIS_SCRIPT_ID)?.remove();
      reject(new Error("ArcGIS SDK failed to load."));
    };
    const finish = () => {
      if (window.$arcgis) resolve(window.$arcgis);
      else reject(new Error("ArcGIS SDK loaded without its module API."));
    };
    const existing = document.getElementById(ARCGIS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", fail, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = ARCGIS_SCRIPT_ID;
    script.type = "module";
    script.src = ARCGIS_CDN_URL;
    script.addEventListener("load", finish, { once: true });
    script.addEventListener("error", fail, { once: true });
    document.head.append(script);
  });

  loaderPromise = attempt.catch((error: unknown) => {
    loaderPromise = null;
    throw error;
  });

  return loaderPromise;
}
