declare namespace naver {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class Point {
      constructor(x: number, y: number);
    }

    class Size {
      constructor(width: number, height: number);
    }

    class LatLngBounds {
      constructor(sw?: LatLng, ne?: LatLng);
      extend(latlng: LatLng): void;
      getCenter(): LatLng;
      isEmpty(): boolean;
    }

    type MapOptions = {
      center: LatLng;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      mapTypeControl?: boolean;
      zoomControl?: boolean;
      scaleControl?: boolean;
      logoControl?: boolean;
      mapDataControl?: boolean;
      disableDoubleClickZoom?: boolean;
    };

    class Map {
      constructor(
        element: HTMLElement | string,
        options?: MapOptions,
      );
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setZoom(zoom: number, effect?: boolean): void;
      getZoom(): number;
      fitBounds(
        bounds: LatLngBounds,
        margin?: number | { top: number; right: number; bottom: number; left: number },
      ): void;
      panTo(latlng: LatLng): void;
    }

    type MarkerIcon = {
      content: string | HTMLElement;
      size?: Size;
      anchor?: Point;
    };

    type MarkerOptions = {
      position: LatLng;
      map?: Map;
      title?: string;
      icon?: MarkerIcon;
      clickable?: boolean;
      zIndex?: number;
    };

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setIcon(icon: string | MarkerIcon): void;
      setPosition(latlng: LatLng): void;
      getPosition(): LatLng;
    }

    namespace Event {
      function addListener(
        target: unknown,
        eventName: string,
        listener: (...args: unknown[]) => void,
      ): void;
      function removeListener(
        target: unknown,
        eventName: string,
        listener: (...args: unknown[]) => void,
      ): void;
      function clearInstanceListeners(target: unknown): void;
    }
  }
}

interface Window {
  naver?: typeof naver;
  navermap_authFailure?: () => void;
}
