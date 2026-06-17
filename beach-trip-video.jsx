// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)

/* BEGIN USAGE */
// animations.jsx
// Reusable animation starter: Stage, Timeline, Sprite, easing helpers.
// Exports (to window): Stage, Sprite, PlaybackBar, TextSprite, ImageSprite, RectSprite,
//   useTime, useTimeline, useSprite, Easing, interpolate, animate, clamp.
//
// Usage (in an HTML file that loads React + Babel):
//
//   <Stage width={1280} height={720} duration={10} background="#f6f4ef">
//     <MyScene />
//   </Stage>
//
// <Stage> auto-scales to the viewport and provides the scrubber, play/pause,
// ←/→ seek, space, and 0-to-reset controls, and persists the playhead.
// Inside <Stage>, any child can call useTime() to read the current
// playhead (seconds). Or wrap content in <Sprite start={1} end={4}>...</Sprite>
// to only render during that window -- children receive a `localTime` and
// `progress` via the useSprite() hook. Use Easing + interpolate()/animate()
// for tweens; TextSprite / ImageSprite / RectSprite have built-in entry/exit.
// Build YOUR scenes by composing Sprites inside a Stage.
/* END USAGE */
// ─────────────────────────────────────────────────────────────────────────────

// ── Easing functions (hand-rolled, Popmotion-style) ─────────────────────────
// All easings take t ∈ [0,1] and return eased t ∈ [0,1] (may overshoot for back/elastic).
const Easing = {
  linear: (t) => t,

  // Quad
  easeInQuad:    (t) => t * t,
  easeOutQuad:   (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic:    (t) => t * t * t,
  easeOutCubic:   (t) => (--t) * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart:    (t) => t * t * t * t,
  easeOutQuart:   (t) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),

  // Expo
  easeInExpo:  (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10);
    return 1 - 0.5 * Math.pow(2, -20 * t + 10);
  },

  // Sine
  easeInSine:    (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Back (overshoot)
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158, c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },

  // Elastic
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

// ── Core interpolation helpers ──────────────────────────────────────────────

// Clamp a value to [min, max]
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

// interpolate([0, 0.5, 1], [0, 100, 50], ease?) -> fn(t)
// Popmotion-style: linearly maps t across input keyframes to output values,
// with optional easing per segment (single fn or array of fns).
function interpolate(input, output, ease = Easing.linear) {
  return (t) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? (ease[i] || Easing.linear) : ease;
        const eased = easeFn(local);
        return output[i] + (output[i + 1] - output[i]) * eased;
      }
    }
    return output[output.length - 1];
  };
}

// animate({from, to, start, end, ease})(t) — simpler single-segment tween.
// Returns `from` before `start`, `to` after `end`.
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }) {
  return (t) => {
    if (t <= start) return from;
    if (t >= end) return to;
    const local = (t - start) / (end - start);
    return from + (to - from) * ease(local);
  };
}

// ── Timeline context ────────────────────────────────────────────────────────

const TimelineContext = React.createContext({ time: 0, duration: 10, playing: false });

const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Sprite ──────────────────────────────────────────────────────────────────
// Renders children only when the playhead is inside [start, end]. Provides
// a sub-context with `localTime` (seconds since start) and `progress` (0..1).
//
//   <Sprite start={2} end={5}>
//     {({ localTime, progress }) => <Thing x={progress * 100} />}
//   </Sprite>
//
// Or as a plain wrapper — children can call useSprite() themselves.

const SpriteContext = React.createContext({ localTime: 0, progress: 0, duration: 0 });
const useSprite = () => React.useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children, keepMounted = false }) {
  const { time } = useTimeline();
  const visible = time >= start && time <= end;
  if (!visible && !keepMounted) return null;

  const duration = end - start;
  const localTime = Math.max(0, time - start);
  const progress = duration > 0 && isFinite(duration)
    ? clamp(localTime / duration, 0, 1)
    : 0;

  const value = { localTime, progress, duration, visible };

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  );
}

// ── Sample sprite components ────────────────────────────────────────────────

// TextSprite: fades/slides text in on entry, holds, then fades out on exit.
// Props: text, x, y, size, color, font, entryDur, exitDur, align
function TextSprite({
  text,
  x = 0, y = 0,
  size = 48,
  color = '#111',
  font = 'Inter, system-ui, sans-serif',
  weight = 600,
  entryDur = 0.45,
  exitDur = 0.35,
  entryEase = Easing.easeOutBack,
  exitEase = Easing.easeInCubic,
  align = 'left',
  letterSpacing = '-0.01em',
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let ty = 0;

  if (localTime < entryDur) {
    const t = entryEase(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    ty = (1 - t) * 16;
  } else if (localTime > exitStart) {
    const t = exitEase(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    ty = -t * 8;
  }

  const translateX = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      transform: `translate(${translateX}, ${ty}px)`,
      opacity,
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      color,
      letterSpacing,
      whiteSpace: 'pre',
      lineHeight: 1.1,
      willChange: 'transform, opacity',
    }}>
      {text}
    </div>
  );
}

// ImageSprite: scales + fades in; optional Ken Burns drift during hold.
function ImageSprite({
  src,
  x = 0, y = 0,
  width = 400, height = 300,
  entryDur = 0.6,
  exitDur = 0.4,
  kenBurns = false,
  kenBurnsScale = 1.08,
  radius = 12,
  fit = 'cover',
  placeholder = null, // {label: string} for striped placeholder
}) {
  const { localTime, duration } = useSprite();
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutCubic(clamp(localTime / entryDur, 0, 1));
    opacity = t;
    scale = 0.96 + 0.04 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInCubic(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = (kenBurns ? kenBurnsScale : 1) + 0.02 * t;
  } else if (kenBurns) {
    const holdSpan = exitStart - entryDur;
    const holdT = holdSpan > 0 ? (localTime - entryDur) / holdSpan : 0;
    scale = 1 + (kenBurnsScale - 1) * holdT;
  }

  const content = placeholder ? (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'repeating-linear-gradient(135deg, #e9e6df 0 10px, #dcd8cf 10px 20px)',
      color: '#6b6458',
      fontFamily: 'JetBrains Mono, ui-monospace, monospace',
      fontSize: 13,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {placeholder.label || 'image'}
    </div>
  ) : (
    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
  );

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      borderRadius: radius,
      overflow: 'hidden',
      willChange: 'transform, opacity',
    }}>
      {content}
    </div>
  );
}

// RectSprite: simple rectangle that animates position/size/color via props.
// Useful demo primitive — takes a `render` fn for per-frame customization.
function RectSprite({
  x = 0, y = 0,
  width = 100, height = 100,
  color = '#111',
  radius = 8,
  entryDur = 0.4,
  exitDur = 0.3,
  render, // optional: (ctx) => style overrides
}) {
  const spriteCtx = useSprite();
  const { localTime, duration } = spriteCtx;
  const exitStart = Math.max(0, duration - exitDur);

  let opacity = 1;
  let scale = 1;

  if (localTime < entryDur) {
    const t = Easing.easeOutBack(clamp(localTime / entryDur, 0, 1));
    opacity = clamp(localTime / entryDur, 0, 1);
    scale = 0.4 + 0.6 * t;
  } else if (localTime > exitStart) {
    const t = Easing.easeInQuad(clamp((localTime - exitStart) / exitDur, 0, 1));
    opacity = 1 - t;
    scale = 1 - 0.15 * t;
  }

  const overrides = render ? render(spriteCtx) : {};

  return (
    <div style={{
      position: 'absolute',
      left: x, top: y,
      width, height,
      background: color,
      borderRadius: radius,
      opacity,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      willChange: 'transform, opacity',
      ...overrides,
    }} />
  );
}


function Stage({
  width = 1280,
  height = 720,
  duration = 10,
  background = '#f6f4ef',
  fps = 60,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  children,
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0');
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState(null);
  const [scale, setScale] = React.useState(1);

  const stageRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const rafRef = React.useRef(null);
  const lastTsRef = React.useRef(null);

  // Persist playhead
  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ':t', String(time)); } catch {}
  }, [time, persistKey]);

  // Auto-scale to fit viewport
  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const barH = 44; // playback bar height
      const s = Math.min(
        el.clientWidth / width,
        (el.clientHeight - barH) / height
      );
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [width, height]);

  // Animation loop
  React.useEffect(() => {
    if (!playing) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [playing, duration, loop]);

  // Keyboard: space = play/pause, ← → = seek
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setPlaying(p => !p);
      } else if (e.code === 'ArrowLeft') {
        setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.code === 'ArrowRight') {
        setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;

  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div
      ref={stageRef}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        background: '#0a0a0a',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Canvas area — vertically centered in remaining space */}
      <div style={{
        flex: 1,
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <div
          ref={canvasRef}
          style={{
            width, height,
            background,
            position: 'relative',
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            flexShrink: 0,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      {/* Playback bar — stacked below canvas, never overlapping */}
      <PlaybackBar
        time={displayTime}
        actualTime={time}
        duration={duration}
        playing={playing}
        onPlayPause={() => setPlaying(p => !p)}
        onReset={() => { setTime(0); }}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── Playback bar ────────────────────────────────────────────────────────────
// Play/pause, return-to-begin, scrub track, time display.
// Uses fixed-width time fields so layout doesn't thrash.

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }) {
  const trackRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    return x * duration;
  }, [duration]);

  const onTrackMove = (e) => {
    if (!trackRef.current) return;
    const t = timeFromEvent(e);
    if (dragging) {
      onSeek(t);
    } else {
      onHover(t);
    }
  };

  const onTrackLeave = () => {
    if (!dragging) onHover(null);
  };

  const onTrackDown = (e) => {
    setDragging(true);
    const t = timeFromEvent(e);
    onSeek(t);
    onHover(null);
  };

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e) => {
      if (!trackRef.current) return;
      const t = timeFromEvent(e);
      onSeek(t);
    };
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const mono = 'JetBrains Mono, ui-monospace, SFMono-Regular, monospace';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 16px',
      background: 'rgba(20,20,20,0.92)',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      width: '100%',
      maxWidth: 680,
      alignSelf: 'center',

      borderRadius: 8,
      color: '#f6f4ef',
      fontFamily: 'Inter, system-ui, sans-serif',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="3" y="2" width="3" height="10" fill="currentColor"/>
            <rect x="8" y="2" width="3" height="10" fill="currentColor"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
          </svg>
        )}
      </IconButton>

      {/* Current time: fixed width so it doesn't thrash */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'right',
        color: '#f6f4ef',
      }}>
        {fmt(time)}
      </div>

      {/* Scrub track */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          flex: 1,
          height: 22,
          position: 'relative',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}
      >
        <div style={{
          position: 'absolute',
          left: 0, right: 0, height: 4,
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: 0, width: `${pct}%`, height: 4,
          background: 'oklch(72% 0.12 250)',
          borderRadius: 2,
        }}/>
        <div style={{
          position: 'absolute',
          left: `${pct}%`, top: '50%',
          width: 12, height: 12,
          marginLeft: -6, marginTop: -6,
          background: '#fff',
          borderRadius: 6,
          boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
        }}/>
      </div>

      {/* Duration: fixed width */}
      <div style={{
        fontFamily: mono,
        fontSize: 12,
        fontVariantNumeric: 'tabular-nums',
        width: 64, textAlign: 'left',
        color: 'rgba(246,244,239,0.55)',
      }}>
        {fmt(duration)}
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        color: '#f6f4ef',
        cursor: 'pointer',
        padding: 0,
        transition: 'background 120ms',
      }}
    >
      {children}
    </button>
  );
}


Object.assign(window, {
  Easing, interpolate, animate, clamp,
  TimelineContext, useTime, useTimeline,
  Sprite, SpriteContext, useSprite,
  TextSprite, ImageSprite, RectSprite,
  Stage, PlaybackBar,
});

// ─────────────────────────────────────────────────────────────────────────────
// ── Beach-trip memory video — scenes ────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

const VFONT = "'Be Vietnam Pro', system-ui, sans-serif";

// A single photo, full-frame, with blurred fill behind + slow Ken Burns + caption.
function PhotoFrame({ src, dur, caption, sub, kbFrom = 1.05, kbTo = 1.17, originX = 50, originY = 42 }) {
  const { localTime } = useSprite();
  const [ready, setReady] = React.useState(false);
  const imgRef = React.useRef(null);
  React.useEffect(() => {
    const im = imgRef.current;
    if (im && im.complete && im.naturalWidth) { setReady(true); }
  }, [src]);
  const F = 0.7;
  const inT = clamp(localTime / F, 0, 1);
  const outT = clamp((localTime - (dur - F)) / F, 0, 1);
  const opacity = Math.min(Easing.easeOutCubic(inT), 1 - Easing.easeInCubic(outT));
  const p = clamp(localTime / dur, 0, 1);
  const scale = kbFrom + (kbTo - kbFrom) * p;

  const capInT = Easing.easeOutCubic(clamp((localTime - 0.35) / 0.7, 0, 1));
  const capOut = Easing.easeInCubic(clamp((localTime - (dur - 0.65)) / 0.65, 0, 1));
  const capOp = Math.min(capInT, 1 - capOut);
  const capTy = (1 - capInT) * 22;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, background: '#06121a' }}>
      <img src={src} alt="" style={{
        position: 'absolute', inset: '-8%', width: '116%', height: '116%',
        objectFit: 'cover', filter: 'blur(38px) brightness(0.5) saturate(1.18)',
      }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img ref={imgRef} src={src} alt="" onLoad={() => setReady(true)} style={{
          width: '100%', height: '100%', objectFit: 'contain',
          transform: `scale(${scale})`, transformOrigin: `${originX}% ${originY}%`,
          willChange: 'transform', opacity: ready ? 1 : 0, transition: 'opacity 0.45s ease',
        }} />
      </div>
      {caption && (
        <React.Fragment>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 320,
            background: 'linear-gradient(to top, rgba(4,12,18,0.74), rgba(4,12,18,0) 100%)',
            opacity: capOp, pointerEvents: 'none',
          }} />
          <div style={{ position: 'absolute', left: 64, right: 64, bottom: 60, opacity: capOp, transform: `translateY(${capTy}px)` }}>
            <div style={{ fontFamily: VFONT, fontWeight: 700, fontSize: 48, color: '#fff', letterSpacing: '-0.01em', textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}>{caption}</div>
            {sub && <div style={{ fontFamily: VFONT, fontWeight: 500, fontSize: 24, color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>{sub}</div>}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

// Title / section / finale cards.
function TitleCard({ title, sub, dur, variant = 'main' }) {
  const { localTime } = useSprite();
  const inT = Easing.easeOutCubic(clamp(localTime / 0.85, 0, 1));
  const outT = Easing.easeInCubic(clamp((localTime - (dur - 0.6)) / 0.6, 0, 1));
  const op = Math.min(inT, 1 - outT);
  const ty = (1 - inT) * 20;
  const drift = 1 + 0.03 * Easing.easeInOutSine(clamp(localTime / dur, 0, 1));

  const bg = variant === 'final'
    ? 'linear-gradient(155deg,#0a2735 0%,#123a4d 36%,#7a3b56 72%,#d9763f 100%)'
    : variant === 'mini'
    ? 'linear-gradient(155deg,#0a2230,#0e3c50)'
    : 'linear-gradient(155deg,#0a2735 0%,#0e4257 55%,#0c6d7e 100%)';
  const titleSize = variant === 'mini' ? 66 : variant === 'final' ? 104 : 92;

  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: op, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${drift})`, background: 'radial-gradient(120% 80% at 50% 8%, rgba(255,255,255,0.10), rgba(255,255,255,0) 60%)' }} />
      <div style={{ transform: `translateY(${ty}px)`, textAlign: 'center', padding: '0 80px', position: 'relative' }}>
        {variant === 'mini' && <div style={{ width: 48, height: 3, background: 'rgba(255,255,255,0.6)', margin: '0 auto 22px', borderRadius: 2 }} />}
        <div style={{ fontFamily: VFONT, fontWeight: 800, fontSize: titleSize, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.05, textShadow: '0 4px 34px rgba(0,0,0,0.35)' }}>{title}</div>
        {sub && <div style={{ fontFamily: VFONT, fontWeight: 500, fontSize: 30, color: 'rgba(255,255,255,0.88)', marginTop: 18 }}>{sub}</div>}
      </div>
    </div>
  );
}

function PreloadGate({ srcs, children }) {
  const [loaded, setLoaded] = React.useState(0);
  const total = srcs.length;
  const done = loaded >= total;
  React.useEffect(() => {
    let live = true;
    let n = 0;
    srcs.forEach((src) => {
      const im = new Image();
      const tick = () => { if (!live) return; n += 1; setLoaded(n); };
      im.onload = tick;
      im.onerror = tick;
      im.src = src;
      if (im.complete && im.naturalWidth) tick();
    });
    return () => { live = false; };
  }, []);
  const pct = total ? Math.round((loaded / total) * 100) : 100;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {done && children}
      {!done && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg,#0a2735 0%,#0e4257 55%,#0c6d7e 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
          <div style={{ fontFamily: VFONT, fontWeight: 800, fontSize: 40, color: '#fff', letterSpacing: '-0.01em' }}>Đang chuẩn bị kỷ niệm…</div>
          <div style={{ width: 320, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: '#fff', borderRadius: 99, transition: 'width 0.25s ease' }} />
          </div>
          <div style={{ fontFamily: VFONT, fontWeight: 500, fontSize: 22, color: 'rgba(255,255,255,0.8)' }}>{pct}%</div>
        </div>
      )}
    </div>
  );
}

// ── Procedural soundtrack — warm, upbeat, with soft ocean swell ──────────────
// Generated live via Web Audio (no external audio file). I-V-vi-IV in D major
// with a gentle plucked arp, a singing melody, soft pad, and filtered-noise surf.
function BeachMusic() {
  const { playing, time } = React.useContext(TimelineContext);
  const [muted, setMuted] = React.useState(false);
  const [trackName, setTrackName] = React.useState(null); // null = built-in synth
  const [trackUrl, setTrackUrl] = React.useState(null);
  const audioRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const R = React.useRef({});
  const hasCustom = !!trackUrl;

  const m2f = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // tiny IndexedDB store so an uploaded track survives reloads
  const idb = (fn) => new Promise((res, rej) => {
    const open = indexedDB.open('beachtrip-audio', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('t');
    open.onerror = () => rej(open.error);
    open.onsuccess = () => { try { fn(open.result, res, rej); } catch (e) { rej(e); } };
  });
  const idbSave = (blob, name) => idb((db, res, rej) => {
    const tx = db.transaction('t', 'readwrite'); tx.objectStore('t').put({ blob, name }, 'track');
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
  const idbLoad = () => idb((db, res, rej) => {
    const rq = db.transaction('t', 'readonly').objectStore('t').get('track');
    rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error);
  });
  const idbClear = () => idb((db, res, rej) => {
    const tx = db.transaction('t', 'readwrite'); tx.objectStore('t').delete('track');
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });

  React.useEffect(() => {
    let url = null;
    idbLoad().then((rec) => {
      if (rec && rec.blob) { url = URL.createObjectURL(rec.blob); setTrackUrl(url); setTrackName(rec.name || 'Nhạc của bạn'); }
    }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    idbSave(f, f.name).catch(() => {});
    setTrackUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(f); });
    setTrackName(f.name);
  };
  const clearTrack = () => {
    idbClear().catch(() => {});
    setTrackUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    setTrackName(null);
  };

  const ensure = () => {
    if (R.current.ctx) return R.current;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();

    const master = ctx.createGain(); master.gain.value = 0;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 4200;
    master.connect(lp); lp.connect(ctx.destination);

    // shared bus -> master (+ echo send for space)
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(master);
    const delay = ctx.createDelay(); delay.delayTime.value = 0.30;
    const fb = ctx.createGain(); fb.gain.value = 0.30;
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    bus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);

    // ocean surf: looping noise -> bandpass, gain swelled by a slow LFO
    const nLen = ctx.sampleRate * 4;
    const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
    const nd = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = ctx.createBufferSource(); noise.buffer = nBuf; noise.loop = true;
    const nbp = ctx.createBiquadFilter(); nbp.type = 'bandpass'; nbp.frequency.value = 620; nbp.Q.value = 0.7;
    const nGain = ctx.createGain(); nGain.gain.value = 0.055;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.035;
    lfo.connect(lfoGain); lfoGain.connect(nGain.gain);
    noise.connect(nbp); nbp.connect(nGain); nGain.connect(master);
    noise.start(); lfo.start();

    // music params
    const bpm = 82, beat = 60 / bpm, eighth = beat / 2;
    // I  V  vi  IV  triads in D major
    const prog = [
      [50, 54, 57], // D  F#  A
      [45, 49, 52], // A  C#  E
      [47, 50, 54], // B  D   F#
      [43, 47, 50], // G  B   D
    ];
    // 32-step (eighths) melody, pentatonic-ish, lots of rests = gentle
    const N = null;
    const mel = [
      74, N, 71, N, 69, N, 66, N,
      69, N, 73, N, 71, N, 69, N,
      74, N, 76, N, 71, N, 69, N,
      71, N, 69, N, 66, N, 62, N,
    ];

    Object.assign(R.current, { ctx, master, bus, delay, beat, eighth, prog, mel, step: 0, nextTime: 0, interval: null });
    return R.current;
  };

  const voice = (r, t, freq, type, peak, atk, rel, sendDelay) => {
    const ctx = r.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + rel);
    o.connect(g); g.connect(sendDelay ? r.delay : r.bus); if (sendDelay) g.connect(r.bus);
    o.start(t); o.stop(t + atk + rel + 0.05);
  };

  const schedStep = (r, s, t) => {
    const chord = r.prog[Math.floor(s / 8)];
    // pad: sustain the chord at the top of each bar
    if (s % 8 === 0) {
      const dur = r.beat * 4;
      chord.forEach((mn) => {
        voice(r, t, m2f(mn + 12), 'sine', 0.05, 0.5, dur - 0.4, false);
        voice(r, t, m2f(mn), 'triangle', 0.03, 0.6, dur - 0.4, false);
      });
    }
    // plucked arpeggio every eighth, climbing the chord
    const arp = chord[s % chord.length] + 24;
    voice(r, t, m2f(arp), 'triangle', 0.10, 0.005, 0.42, true);
    // melody
    const mn = r.mel[s];
    if (mn != null) {
      voice(r, t, m2f(mn), 'sine', 0.17, 0.02, 0.55, true);
      voice(r, t, m2f(mn), 'triangle', 0.05, 0.02, 0.5, false);
    }
  };

  const tick = () => {
    const r = R.current; if (!r.ctx) return;
    const ahead = 0.12;
    while (r.nextTime < r.ctx.currentTime + ahead) {
      schedStep(r, r.step, r.nextTime);
      r.nextTime += r.eighth;
      r.step = (r.step + 1) % 32;
    }
  };

  React.useEffect(() => {
    const a = audioRef.current;
    if (hasCustom) {
      // silence + stop the built-in synth entirely
      const r = R.current;
      if (r.ctx) {
        r.master.gain.cancelScheduledValues(r.ctx.currentTime);
        r.master.gain.setTargetAtTime(0, r.ctx.currentTime, 0.1);
        if (r.interval) { clearInterval(r.interval); r.interval = null; }
      }
      if (a) {
        a.muted = muted;
        if (playing) {
          try { const d = a.duration; if (d && isFinite(d)) a.currentTime = time % d; } catch (e) {}
          a.play().catch(() => {});
        } else {
          a.pause();
        }
      }
      return;
    }
    if (playing) {
      const r = ensure();
      r.ctx.resume();
      if (!r.nextTime || r.nextTime < r.ctx.currentTime) r.nextTime = r.ctx.currentTime + 0.1;
      r.master.gain.cancelScheduledValues(r.ctx.currentTime);
      r.master.gain.setTargetAtTime(muted ? 0 : 0.85, r.ctx.currentTime, 0.4);
      if (!r.interval) r.interval = setInterval(tick, 25);
    } else {
      const r = R.current;
      if (r.ctx) {
        r.master.gain.cancelScheduledValues(r.ctx.currentTime);
        r.master.gain.setTargetAtTime(0, r.ctx.currentTime, 0.25);
        if (r.interval) { clearInterval(r.interval); r.interval = null; }
      }
    }
  }, [playing, muted, hasCustom]);

  React.useEffect(() => () => {
    const r = R.current;
    if (r.interval) clearInterval(r.interval);
    if (r.ctx) { try { r.ctx.close(); } catch (e) {} }
  }, []);

  const pill = {
    width: 52, height: 52, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(8,18,26,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
    color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 18px rgba(0,0,0,0.3)', flexShrink: 0, padding: 0,
  };

  return (
    <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 30, display: 'flex', alignItems: 'center', gap: 10 }}>
      <audio ref={audioRef} src={trackUrl || undefined} loop preload="auto" />
      <input ref={fileInputRef} type="file" accept="audio/*" onChange={onPick} style={{ display: 'none' }} />

      {hasCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, maxWidth: 230, height: 52, padding: '0 8px 0 15px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(8,18,26,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', fontFamily: VFONT, fontSize: 15, fontWeight: 600, boxShadow: '0 4px 18px rgba(0,0,0,0.3)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: '#4ade80', flexShrink: 0, boxShadow: '0 0 8px #4ade80' }} />
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trackName}</span>
          <button onClick={clearTrack} title="Dùng lại nhạc gốc" style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
      )}

      <button onClick={() => fileInputRef.current && fileInputRef.current.click()} title={hasCustom ? 'Đổi nhạc khác' : 'Tải nhạc của bạn'} style={pill}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="2.6"/><circle cx="16" cy="16" r="2.6"/>
        </svg>
      </button>

      <button onClick={() => setMuted((x) => !x)} title={muted ? 'Bật nhạc' : 'Tắt nhạc'} style={pill}>
        {muted ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>
          </svg>
        )}
      </button>
    </div>
  );
}

function BeachTrip() {
  const OVERLAP = 0.5;
  const seq = [
    { type: 'title', title: 'CHUYẾN ĐI CHƠI BIỂN', sub: 'Một ngày hè đáng nhớ của gia đình mình', dur: 3.8 },
    { src: 'uploads/IMG_5718.jpeg', cap: 'Bắt đầu từ sân nhà…', dur: 3.2 },
    { src: 'uploads/IMG_5717.jpeg', cap: '484 Lý Thái Tổ', dur: 3.0 },
    { src: 'uploads/IMG_5715.jpeg', cap: 'Hai mẹ con lên đường', dur: 3.0 },
    { type: 'title', title: 'RA TỚI BIỂN', dur: 2.6, variant: 'mini' },
    { src: 'uploads/IMG_5710.jpeg', cap: 'Biển gọi tên mình rồi!', dur: 3.2 },
    { src: 'uploads/IMG_5709.jpeg', dur: 2.8 },
    { src: 'uploads/IMG_5690.jpeg', cap: 'Trời xanh, biển rộng', dur: 2.8 },
    { src: 'uploads/IMG_5703.jpeg', cap: 'Tạo dáng chút nào', dur: 3.0 },
    { src: 'uploads/IMG_5695.jpeg', cap: 'Nắm tay nhau ra khơi', dur: 3.2 },
    { src: 'uploads/IMG_5691.jpeg', cap: 'Vui hết cỡ!', dur: 3.0 },
    { src: 'uploads/IMG_5601.jpeg', cap: 'Sóng tới rồi!', dur: 2.8 },
    { src: 'uploads/IMG_5595.jpeg', dur: 2.6 },
    { src: 'uploads/IMG_5625.jpeg', cap: 'Cười thật tươi', dur: 3.0 },
    { src: 'uploads/IMG_5618.jpeg', dur: 2.6 },
    { src: 'uploads/IMG_5574.jpeg', cap: 'Cả nhà cùng nghịch nước', dur: 3.0 },
    { type: 'title', title: 'NHỮNG ĐIỀU THÚ VỊ', dur: 2.6, variant: 'mini' },
    { src: 'uploads/IMG_5671.jpeg', cap: 'Bạn cua nhỏ ghé chơi', dur: 3.0 },
    { src: 'uploads/IMG_5670.jpeg', cap: 'Máy bay vút qua trời', dur: 2.8 },
    { src: 'uploads/IMG_5664.jpeg', cap: 'Thuyền thúng phơi nắng', dur: 3.0 },
    { src: 'uploads/IMG_5669.jpeg', cap: 'Tập bơi nào!', dur: 3.0 },
    { type: 'title', title: 'HOÀNG HÔN', dur: 2.6, variant: 'mini' },
    { src: 'uploads/IMG_5682.jpeg', cap: 'Hoàng hôn buông xuống', dur: 3.4 },
    { src: 'uploads/IMG_5663.jpeg', dur: 2.8 },
    { src: 'uploads/IMG_5662.jpeg', cap: 'Hoa giấy bên đường', dur: 3.0 },
    { src: 'uploads/IMG_5661.jpeg', dur: 2.8 },
    { src: 'uploads/IMG_5570.jpeg', cap: 'Đi cùng nhau vui hơn', dur: 3.2 },
    { src: 'uploads/IMG_5569.jpeg', dur: 2.8 },
    { src: 'uploads/IMG_5559.jpeg', cap: 'Một chút bình yên', dur: 3.4 },
    { type: 'title', title: 'MÃI BÊN NHAU ♡', sub: 'Hẹn gặp lại nhé, biển ơi!', dur: 4.6, variant: 'final' },
  ];

  let t = 0;
  const items = seq.map((s) => {
    const dur = s.dur != null ? s.dur : 3.0;
    const start = t;
    t += (dur - OVERLAP);
    return Object.assign({}, s, { start, dur, end: start + dur });
  });
  const total = t + OVERLAP + 0.4;
  const photoSrcs = items.filter((it) => it.src).map((it) => it.src);

  return (
    <PreloadGate srcs={photoSrcs}>
    <Stage width={1600} height={900} duration={total} background="#06121a" persistKey="beachtrip">
      {items.map((it, i) => (
        <Sprite key={i} start={it.start} end={it.end}>
          {it.type === 'title'
            ? <TitleCard title={it.title} sub={it.sub} dur={it.dur} variant={it.variant || 'main'} />
            : <PhotoFrame src={it.src} dur={it.dur} caption={it.cap} sub={it.sub} />}
        </Sprite>
      ))}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 240px rgba(0,0,0,0.55)' }} />
      <BeachMusic />
    </Stage>
    </PreloadGate>
  );
}

window.BeachTrip = BeachTrip;

