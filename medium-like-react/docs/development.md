# Development

## ShortViewer navigation and touch handling

`useShortViewerSlider` owns the vertical Keen slider and touch arbitration
inside `ShortViewer`. Two transparent edge zones sit above the slider track so
touches that begin at either screen edge do not reach Keen's pointer handlers.
They do not implement Back; iOS Safari handles its native edge navigation.

Wire the overlay to browser history from its page using `useHistoryOverlay`:

```tsx
const {
  isOpen: viewerOpen,
  open: openViewer,
  close: closeViewer,
} = useHistoryOverlay('shortViewerOpen');

// Open from a feed card; close with the same history entry.
openViewer();

{viewerOpen && <ShortViewer onClose={closeViewer} />}
```

The shared hook pushes the current URL with overlay state and a
`scrollRestorationKey`. Keep `closeViewer` as `ShortViewer`'s `onClose` so the X
button and Escape key use the same history entry and restore the underlying feed
position. Safari's native Back gesture also navigates that history entry.

Inside `ShortViewer`, pass the element refs returned by
`useShortViewerSlider` to the overlay and Keen track:

```tsx
const {
  overlayRef,
  trackRef,
  currentIndex,
  queueRebase,
  runWhenIdle,
} = useShortViewerSlider(feeds.length, startIndex, onClose);

return (
  <div ref={overlayRef} className="short-overlay">
    <div ref={trackRef} className="short-track keen-slider">
      {/* Keen slide elements */}
    </div>
    <div className="short-edge-zone short-edge-zone-left" aria-hidden="true" />
    <div className="short-edge-zone short-edge-zone-right" aria-hidden="true" />
  </div>
);
```

The edge zones are 24 px wide and must remain siblings of the Keen track, not
its children. The overlay uses `touch-action: auto` so browser gestures remain
available; the touch guard prevents native movement for Keen's vertical drags
and lets `.short-scroll` retain native vertical scrolling. If the slide list is
pruned, use `runWhenIdle` and `queueRebase` to update Keen without interrupting
an active gesture.