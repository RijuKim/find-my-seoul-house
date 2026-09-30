declare namespace kakao {
  namespace maps {
    class LatLng {
      constructor(lat: number, lng: number, ...rest: unknown[]);
      getLat(): number;
      getLng(): number;
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    class LatLngBounds {
      constructor(...args: unknown[]);
      extend(latlng: LatLng): void;
      isEmpty(): boolean;
    }

    type MapOptions = {
      center: LatLng;
      level?: number;
      mapTypeId?: string;
    };

    class Map {
      constructor(container: HTMLElement | string, options: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setLevel(level: number, options?: { anchor?: LatLng; animate?: boolean }): void;
      getLevel(): number;
      setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void;
      panTo(latlng: LatLng): void;
    }

    type MarkerImageOptions = {
      offset?: Point;
    };

    class MarkerImage {
      constructor(src: string, size: Size, options?: MarkerImageOptions);
    }

    type MarkerOptions = {
      position: LatLng;
      map?: Map;
      image?: MarkerImage;
      title?: string;
      clickable?: boolean;
      zIndex?: number;
    };

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latlng: LatLng): void;
      getPosition(): LatLng;
    }

    type CustomOverlayOptions = {
      position: LatLng;
      content: string | HTMLElement;
      map?: Map;
      xAnchor?: number;
      yAnchor?: number;
      zIndex?: number;
      clickable?: boolean;
    };

    class CustomOverlay {
      constructor(options: CustomOverlayOptions);
      setMap(map: Map | null): void;
      getMap(): Map | null;
      setPosition(latlng: LatLng): void;
      getContent(): HTMLElement | string;
    }

    namespace event {
      function addListener(
        target: unknown,
        type: string,
        handler: (...args: unknown[]) => void,
      ): void;
      function removeListener(
        target: unknown,
        type: string,
        handler: (...args: unknown[]) => void,
      ): void;
    }

    function load(callback: () => void): void;
  }
}

interface Window {
  kakao?: typeof kakao;
}
