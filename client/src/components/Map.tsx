import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

const CLIENT_ID = import.meta.env.VITE_NAVER_MAPS_CLIENT_ID;
const MAPS_JS_BASE_URL =
  import.meta.env.VITE_NAVER_MAPS_JS_URL ||
  "https://oapi.map.naver.com/openapi/v3/maps.js";

let mapScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (window.naver?.maps) return Promise.resolve();
  if (mapScriptPromise) return mapScriptPromise;

  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      "script[data-naver-maps]",
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Naver Maps script")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.naverMaps = "true";
    script.src = `${MAPS_JS_BASE_URL}?ncpKeyId=${CLIENT_ID}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Naver Maps script"));
    document.head.appendChild(script);
  }).catch((error) => {
    mapScriptPromise = null;
    throw error;
  });

  return mapScriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  onMapReady?: (map: naver.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.552, lng: 126.99 },
  initialZoom = 11,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<naver.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (error) {
      console.error(error);
      return;
    }
    if (!mapContainer.current || !window.naver?.maps) {
      console.error("Naver map container or SDK not found");
      return;
    }
    map.current = new window.naver.maps.Map(mapContainer.current, {
      center: new window.naver.maps.LatLng(
        initialCenter.lat,
        initialCenter.lng,
      ),
      zoom: initialZoom,
      mapTypeControl: true,
      zoomControl: true,
      scaleControl: true,
      logoControl: true,
      mapDataControl: false,
    });
    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
