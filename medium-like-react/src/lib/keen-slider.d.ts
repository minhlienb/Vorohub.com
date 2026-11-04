// Type declarations for keen-slider (no .d.ts shipped).
declare module 'keen-slider' {
  // Minimal subset of the KeenSlider API we actually use. We type
  // it loosely to avoid a deep copy of the official typings.
  interface KeenSliderInstance {
    track: {
      details: {
        position: number;
        abs: number;
        maxIdx: number;
      } | null;
    };
    on(event: 'dragStarted' | 'dragged' | 'dragEnded', cb: () => void): void;
    moveToIdx(idx: number, animate?: boolean): void;
    destroy(): void;
  }
  interface KeenSliderOptions {
    vertical?: boolean;
    slides?: { perView: number; spacing?: number };
    loop?: boolean;
    rubberband?: boolean;
    mode?: 'snap' | 'free-snap' | 'edge-snapping' | 'free';
    dragSpeed?: (val: number) => number;
    [key: string]: any;
  }
  class KeenSlider {
    constructor(container: HTMLElement, options: KeenSliderOptions);
    track: KeenSliderInstance['track'];
    on(event: 'dragStarted' | 'dragged' | 'dragEnded', cb: () => void): void;
    moveToIdx(idx: number, animate?: boolean): void;
    destroy(): void;
  }
  export default KeenSlider;
}
