import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

const APP_KEY = import.meta.env.VITE_KAKAO_MAPS_JS_KEY;
const MAPS_JS_BASE_URL =
  import.meta.env.VITE_KAKAO_MAPS_JS_URL ||
  "https://dapi.kakao.com/v2/maps/sdk.js";

let mapScriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (window.kakao?.maps) return Promise.resolve();
  if (!APP_KEY) {
    return Promise.reject(
      new Error("VITE_KAKAO_MAPS_JS_KEY is not configured"),
    );
  }
  if (mapScriptPromise) return mapScriptPromise;

  mapScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      "script[data-kakao-maps]",
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Failed to load Kakao Maps script")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMaps = "true";
    script.src = `${MAPS_JS_BASE_URL}?appkey=${APP_KEY}&autoload=false`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Kakao Maps script"));
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
  initialLevel?: number;
  onMapReady?: (map: kakao.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 37.552, lng: 126.99 },
  initialLevel = 8,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<kakao.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (error) {
      if (APP_KEY) console.error(error);
      return;
    }
    if (!mapContainer.current || !window.kakao?.maps) {
      console.error("Kakao map container or SDK not found");
      return;
    }
    window.kakao.maps.load(() => {
      if (!mapContainer.current || !window.kakao?.maps) return;
      map.current = new window.kakao.maps.Map(mapContainer.current, {
        center: new window.kakao.maps.LatLng(
          initialCenter.lat,
          initialCenter.lng,
        ),
        level: initialLevel,
      });
      if (onMapReady) {
        onMapReady(map.current);
      }
    });
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
