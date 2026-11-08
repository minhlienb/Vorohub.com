import { useEffect, useRef, useState } from 'react';
import KeenSlider, { type KeenSliderInstance } from 'keen-slider';

const COMMIT_PX = 96;
const HINT_SHOW_PX = 40;
const FLICK_VELOCITY = 0.3;
const MIN_FLICK_PX = 24;
const EPSILON = 2;

export function useShortViewerSlider(
  feedCount: number,
  startIndex: number,
  onClose: () => void
) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<KeenSliderInstance | null>(null);
  const draggingRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(0, Math.min(startIndex, feedCount - 1))
  );
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    return () => {
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const prevHint = overlayRef.current?.querySelector(
      '.short-overscroll-hint.prev'
    ) as HTMLElement | null;
    const nextHint = overlayRef.current?.querySelector(
      '.short-overscroll-hint.next'
    ) as HTMLElement | null;

    const toggleHint = (el: HTMLElement | null, show: boolean, ready: boolean) => {
      if (!el) return;
      el.classList.toggle('visible', show);
      el.classList.toggle('ready', ready);
    };
    const hideHints = () => {
      toggleHint(prevHint, false, false);
      toggleHint(nextHint, false, false);
    };

    let startPosition = 0;
    let startIdx = 0;
    let samples: { p: number; t: number }[] = [];

    const size = (slider: KeenSliderInstance) =>
      slider.size || window.innerHeight || document.documentElement.clientHeight || 1;

    const flickVelocity = (slider: KeenSliderInstance): number => {
      if (samples.length < 2) return 0;
      const first = samples[0]!;
      const last = samples[samples.length - 1]!;
      const dt = last.t - first.t;
      if (dt <= 0) return 0;
      return ((last.p - first.p) * size(slider)) / dt;
    };

    const willCommit = (distance: number, direction: number, velocity: number): boolean => {
      if (distance >= COMMIT_PX) return true;
      return (
        distance >= MIN_FLICK_PX &&
        Math.abs(velocity) >= FLICK_VELOCITY &&
        Math.sign(velocity) === direction
      );
    };

    const maxIndex = (slider: KeenSliderInstance) =>
      Math.max(0, Math.round(slider.track.details?.max ?? 0));

    const slider = new KeenSlider(track, {
      vertical: true,
      slides: { perView: 1, spacing: 0 },
      loop: false,
      rubberband: true,
      mode: 'snap',
      renderMode: 'performance',
      drag: true,
      defaultAnimation: {
        duration: 320,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
      },
      initial: Math.max(0, Math.min(startIndex, feedCount - 1)),
      slideChanged(instance) {
        setCurrentIndex(instance.track.details?.rel ?? 0);
      },
      dragStarted(instance) {
        draggingRef.current = true;
        const details = instance.track.details;
        startPosition = details?.position ?? 0;
        startIdx = details?.abs ?? 0;
        samples = [{ p: startPosition, t: performance.now() }];
      },
      dragged(instance) {
        const details = instance.track.details;
        if (!details) return;
        const now = performance.now();
        samples.push({ p: details.position, t: now });
        while (samples.length && now - samples[0]!.t > 140) samples.shift();

        const deltaPx = (details.position - startPosition) * size(instance);
        const direction = Math.sign(deltaPx);
        const distance = Math.abs(deltaPx);
        const show = distance >= HINT_SHOW_PX;
        const ready = willCommit(distance, direction, flickVelocity(instance));
        toggleHint(nextHint, show && direction > 0 && startIdx < maxIndex(instance), ready);
        toggleHint(prevHint, show && direction < 0 && startIdx > 0, ready);
      },
      dragEnded(instance) {
        draggingRef.current = false;
        hideHints();
        const details = instance.track.details;
        if (!details) return;
        const deltaPx = (details.position - startPosition) * size(instance);
        const distance = Math.abs(deltaPx);
        const direction = Math.sign(deltaPx);
        const target = willCommit(distance, direction, flickVelocity(instance))
          ? startIdx + direction
          : startIdx;
        const nextIndex = Math.max(0, Math.min(maxIndex(instance), target));
        setCurrentIndex(nextIndex);
        instance.moveToIdx(nextIndex, true);
        samples = [];
      },
    });

    sliderRef.current = slider;
    return () => {
      slider.destroy();
      sliderRef.current = null;
    };
    // The slider must only be initialized once for this viewer instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update KeenSlider when new slides append. Try immediately (no
  // initial 50ms debounce) so the new max index is known before the
  // user swipes to the old boundary — otherwise next() hits the
  // stale max (loop:false) and the swipe is dropped. If busy
  // (drag/anim), retry — was a raw rAF spin for all N slopes.
  useEffect(() => {
    let timer = 0;
    let retries = 0;
    const tryUpdate = () => {
      const slider = sliderRef.current;
      if (!slider) return;
      const busy =
        draggingRef.current ||
        slider.animator.active ||
        slider.animator.targetIdx !== null;
      if (busy && retries < 10) {
        retries += 1;
        timer = window.setTimeout(tryUpdate, 100);
        return;
      }
      if (busy) return;
      slider.update();
    };
    timer = window.setTimeout(tryUpdate, 0);
    return () => window.clearTimeout(timer);
  }, [feedCount]);


  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let startX = 0;
    let startY = 0;
    let blockingSlider = false;

    // O(1) child access via index — was querySelectorAll('.short-slide')
    // (O(N) DOM scan) on EVERY touchmove at 60-120Hz.
    const isAtScrollBoundary = (direction: number): boolean => {
      const el = (track.children[currentIndexRef.current] as HTMLElement | undefined)
        ?.querySelector<HTMLElement>('.short-scroll');
      if (!el) return true;
      if (direction < 0) return el.scrollTop <= EPSILON;
      return el.scrollTop + el.clientHeight >= el.scrollHeight - EPSILON;
    };

    const onTouchStart = (event: TouchEvent) => {
      startX = event.touches[0]!.pageX;
      startY = event.touches[0]!.pageY;
      blockingSlider = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      const target = (event.target as Element).closest('.short-scroll');
      if (!target) {
        event.preventDefault();
        return;
      }

      if (blockingSlider) {
        event.stopPropagation();
        return;
      }

      const dx = event.touches[0]!.pageX - startX;
      const dy = event.touches[0]!.pageY - startY;
      if (Math.abs(dx) > Math.abs(dy)) {
        blockingSlider = true;
        event.stopPropagation();
        return;
      }

      const direction = dy > 0 ? -1 : 1;
      if (isAtScrollBoundary(direction)) {
        event.preventDefault();
      } else {
        blockingSlider = true;
        event.stopPropagation();
      }
    };

    track.addEventListener('touchstart', onTouchStart, { passive: true });
    track.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });

    return () => {
      track.removeEventListener('touchstart', onTouchStart);
      track.removeEventListener('touchmove', onTouchMove, { capture: true });
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowDown') {
        sliderRef.current?.next();
      } else if (event.key === 'ArrowUp') {
        sliderRef.current?.prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return { overlayRef, trackRef, currentIndex };
}