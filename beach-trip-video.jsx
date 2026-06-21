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
  restartSignal = 0,
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

  // Imperative restart: a parent (the editor) bumps restartSignal whenever the
  // set of images changes. We seek the timeline back to 0 and resume WITHOUT
  // remounting the Stage — so the music element inside it is never torn down
  // (which used to drop the soundtrack and re-trigger blocked autoplay).
  const firstSignal = React.useRef(restartSignal);
  React.useEffect(() => {
    if (restartSignal === firstSignal.current) return; // ignore the initial mount value
    setTime(0);
    setPlaying(true);
  }, [restartSignal]);

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
    () => ({ time: displayTime, duration, playing, setTime, setPlaying, restartSignal }),
    [displayTime, duration, playing, restartSignal]
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
function PhotoFrame({ src, dur, caption, sub, pos = 'bottom-left', kbFrom = 1.05, kbTo = 1.17, originX = 50, originY = 42 }) {
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
      {(caption || sub) && (() => {
        const vert = pos.indexOf('top') === 0 ? 'top' : pos.indexOf('bottom') === 0 ? 'bottom' : 'middle';
        const horiz = pos.indexOf('left') >= 0 ? 'left' : pos.indexOf('right') >= 0 ? 'right' : 'center';
        const justify = vert === 'top' ? 'flex-start' : vert === 'bottom' ? 'flex-end' : 'center';
        const align = horiz === 'left' ? 'flex-start' : horiz === 'right' ? 'flex-end' : 'center';
        const box = {};
        return (
          <React.Fragment>
            {vert === 'bottom' && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: 'linear-gradient(to top, rgba(4,12,18,0.74), rgba(4,12,18,0) 100%)', opacity: capOp, pointerEvents: 'none' }} />}
            {vert === 'top' && <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 320, background: 'linear-gradient(to bottom, rgba(4,12,18,0.74), rgba(4,12,18,0) 100%)', opacity: capOp, pointerEvents: 'none' }} />}
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: justify, alignItems: align, padding: '64px 64px 60px', boxSizing: 'border-box', opacity: capOp, pointerEvents: 'none' }}>
              <div style={Object.assign({ transform: `translateY(${capTy}px)`, textAlign: horiz, maxWidth: '84%' }, box)}>
                {caption && <div style={{ fontFamily: VFONT, fontWeight: 700, fontSize: 48, color: '#fff', letterSpacing: '-0.01em', textShadow: '0 2px 18px rgba(0,0,0,0.45)' }}>{caption}</div>}
                {sub && <div style={{ fontFamily: VFONT, fontWeight: 500, fontSize: 24, color: 'rgba(255,255,255,0.85)', marginTop: caption ? 6 : 0 }}>{sub}</div>}
              </div>
            </div>
          </React.Fragment>
        );
      })()}
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
  const [pct, setPct] = React.useState(0);
  const [done, setDone] = React.useState(() => srcs.length === 0);
  React.useEffect(() => {
    let live = true;
    const list = srcs.slice();
    const total = list.length;
    if (total === 0) { setDone(true); return; }
    let n = 0;
    list.forEach((src) => {
      const im = new Image();
      const tick = () => { if (!live) return; n += 1; setPct(Math.round((n / total) * 100)); if (n >= total) setDone(true); };
      im.onload = tick;
      im.onerror = tick;
      im.src = src;
      if (im.complete && im.naturalWidth) tick();
    });
    return () => { live = false; };
  }, []); // run once with the sources present at mount; later edits don't re-gate
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
  const { playing, time, setTime, setPlaying, restartSignal } = React.useContext(TimelineContext);
  // Restart the video from the very beginning whenever the track changes.
  const restartFromStart = () => { try { if (setTime) setTime(0); if (setPlaying) setPlaying(true); } catch (e) {} };
  const [muted, setMuted] = React.useState(() => {
    try { const v = localStorage.getItem('beachtrip:muted'); return v === null ? true : v === '1'; } catch (e) { return true; }
  });
  React.useEffect(() => { try { localStorage.setItem('beachtrip:muted', muted ? '1' : '0'); } catch (e) {} }, [muted]);
  const [volume, setVolume] = React.useState(() => {
    try { const v = parseFloat(localStorage.getItem('beachtrip:vol')); return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.85; } catch (e) { return 0.85; }
  });
  React.useEffect(() => { try { localStorage.setItem('beachtrip:vol', String(volume)); } catch (e) {} }, [volume]);
  const [trackName, setTrackName] = React.useState(null); // null = built-in synth
  const [trackUrl, setTrackUrl] = React.useState(null);
  const audioRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const R = React.useRef({});
  const wantPlayRef = React.useRef(false);
  const hasCustom = !!trackUrl;

  // Unlock audio on the first user gesture anywhere (browsers block play()/
  // AudioContext from a deferred effect until the user has interacted once).
  React.useEffect(() => {
    let done = false;
    const unlock = () => {
      if (done) return; done = true;
      const r = R.current;
      if (r.ctx && r.ctx.state === 'suspended') { r.ctx.resume().catch(() => {}); }
      const a = audioRef.current;
      if (a && a.getAttribute('src')) {
        const p = a.play();
        if (p && p.then) p.then(() => { if (!wantPlayRef.current) a.pause(); }).catch(() => {});
      }
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    return () => {
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
  }, []);

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
      if (rec && rec.blob) {
        url = URL.createObjectURL(rec.blob);
        setTrackUrl(url); setTrackName(rec.name || 'Nhạc của bạn');
        const a = audioRef.current; if (a) { try { a.src = url; } catch (e) {} }
      }
    }).catch(() => {});
    return () => { if (url) URL.revokeObjectURL(url); };
  }, []);

  // On (re)mount the music always starts from the very beginning. BeachMusic
  // lives inside the keyed Stage, so any image change remounts it — this makes
  // both the uploaded track and the built-in synth replay from zero.
  React.useEffect(() => {
    const a = audioRef.current;
    if (a) { try { a.currentTime = 0; } catch (e) {} }
    const r = R.current;
    if (r) { r.step = 0; r.nextTime = 0; }
  }, []);

  // The editor bumps restartSignal whenever the storyboard changes. The Stage no
  // longer remounts (that used to drop the audio), so we reset the live track to
  // the top ourselves — without ever tearing it down, so sound keeps coming.
  const firstRestart = React.useRef(restartSignal);
  React.useEffect(() => {
    if (restartSignal === firstRestart.current) return; // skip initial mount
    const a = audioRef.current;
    if (a && a.getAttribute('src')) {
      try { a.currentTime = 0; if (!muted) { const p = a.play(); if (p && p.then) p.catch(() => {}); } } catch (e) {}
    }
    const r = R.current;
    if (r) { r.step = 0; if (r.ctx) r.nextTime = r.ctx.currentTime + 0.1; }
  }, [restartSignal]);

  const onPick = (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const url = URL.createObjectURL(f);
    idbSave(f, f.name).catch(() => {});

    // 1) Clear whatever is playing right now — stop the synth scheduler and
    //    silence the old custom track — before the new one starts.
    const r = R.current;
    if (r && r.ctx) {
      try {
        r.master.gain.cancelScheduledValues(r.ctx.currentTime);
        r.master.gain.setTargetAtTime(0, r.ctx.currentTime, 0.05);
        if (r.interval) { clearInterval(r.interval); r.interval = null; }
      } catch (err) {}
    }
    const a = audioRef.current;
    if (a) { try { a.pause(); } catch (err) {} }

    setTrackUrl((old) => { if (old) URL.revokeObjectURL(old); return url; });
    setTrackName(f.name);
    setMuted(false); // they just chose a song — they want to hear it

    // 2) Start the new track from 0 right here, inside the file-pick gesture, so
    //    the browser allows it (a deferred effect play() counts as no gesture,
    //    which is why sound used to need a manual speaker click).
    if (a) {
      try {
        a.src = url; a.muted = false; a.volume = volume; a.currentTime = 0;
        const p = a.play(); if (p && p.then) p.catch(() => {});
      } catch (err) {}
    }
    wantPlayRef.current = true;
    // 3) Run the pictures from the beginning too.
    restartFromStart();
  };
  const clearTrack = () => {
    idbClear().catch(() => {});
    setTrackUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
    setTrackName(null);
    const a = audioRef.current;
    if (a) { try { a.pause(); } catch (e) {} }
    // Unlock/resume the synth's AudioContext within this gesture too.
    try { const r = ensure(); if (r.ctx && r.ctx.state === 'suspended') r.ctx.resume(); } catch (e) {}
    restartFromStart();
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
    wantPlayRef.current = hasCustom && playing;
    if (hasCustom) {
      // silence + stop the built-in synth entirely
      const r = R.current;
      if (r.ctx) {
        r.master.gain.cancelScheduledValues(r.ctx.currentTime);
        r.master.gain.setTargetAtTime(0, r.ctx.currentTime, 0.04);
        if (r.interval) { clearInterval(r.interval); r.interval = null; }
      }
      if (a) {
        // The <audio> src is managed imperatively (never as a React prop), so a
        // re-render can't reassign it and abort an in-flight play() — that was
        // why a SECOND track change went silent.
        if (trackUrl && a.getAttribute('src') !== trackUrl) {
          a.src = trackUrl;
          try { a.currentTime = 0; } catch (e) {}
        }
        a.muted = muted;
        a.volume = volume;
        if (playing) {
          try { const d = a.duration; if (d && isFinite(d)) a.currentTime = time % d; } catch (e) {}
          a.play().catch(() => {});
        } else {
          a.pause();
        }
      }
      return;
    }
    if (playing && !muted) {
      const r = ensure();
      r.ctx.resume();
      if (!r.nextTime || r.nextTime < r.ctx.currentTime) r.nextTime = r.ctx.currentTime + 0.1;
      r.master.gain.cancelScheduledValues(r.ctx.currentTime);
      r.master.gain.setTargetAtTime(volume, r.ctx.currentTime, 0.4);
      if (!r.interval) r.interval = setInterval(tick, 25);
    } else {
      // paused OR muted: stop the scheduler entirely so nothing leaks through.
      // Cut the master level quickly (tau 0.04 ≈ silent in ~0.15s) so long pad
      // notes don't ring on after pause — the music stops with the slideshow.
      const r = R.current;
      if (r.ctx) {
        r.master.gain.cancelScheduledValues(r.ctx.currentTime);
        r.master.gain.setTargetAtTime(0, r.ctx.currentTime, 0.04);
        if (r.interval) { clearInterval(r.interval); r.interval = null; }
      }
    }
  }, [playing, muted, hasCustom, trackUrl]);

  // Volume is its own effect so dragging the slider only adjusts the level —
  // it never re-seeks or restarts the audio (which made changes inaudible).
  React.useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
    const r = R.current;
    if (r.ctx && r.master && !hasCustom && playing && !muted) {
      r.master.gain.cancelScheduledValues(r.ctx.currentTime);
      r.master.gain.setTargetAtTime(volume, r.ctx.currentTime, 0.08);
    }
  }, [volume, muted, hasCustom, playing]);

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
      <audio ref={audioRef} loop preload="auto" />
      <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac,.opus,.weba" onChange={onPick} style={{ display: 'none' }} />

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 11, height: 52, padding: '0 18px 0 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(8,18,26,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', boxShadow: '0 4px 18px rgba(0,0,0,0.3)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
          <path d="M11 5 6 9H2v6h4l5 4z" fill="currentColor" stroke="none"/>
        </svg>
        <input type="range" min="0" max="100" value={Math.round(volume * 100)} onChange={(e) => setVolume(Number(e.target.value) / 100)} title={'Âm lượng ' + Math.round(volume * 100) + '%'} style={{ width: 96, accentColor: '#5cc6d6', cursor: 'pointer' }} />
      </div>

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

// ── Editable project: default storyboard + persistence ──────────────────────

const EditContext = React.createContext({ editing: false });

const DEFAULT_SEQ = [
  { type: 'title', title: 'CHUYẾN ĐI CHƠI BIỂN', sub: 'Một ngày hè đáng nhớ của gia đình mình', dur: 3.8 },
  { src: 'img/IMG_5718.jpeg', cap: 'Bắt đầu từ sân nhà…', dur: 3.2 },
  { src: 'img/IMG_5717.jpeg', cap: '484 Lý Thái Tổ', dur: 3.0 },
  { src: 'img/IMG_5715.jpeg', cap: 'Hai mẹ con lên đường', dur: 3.0 },
  { type: 'title', title: 'RA TỚI BIỂN', dur: 2.6, variant: 'mini' },
  { src: 'img/IMG_5710.jpeg', cap: 'Biển gọi tên mình rồi!', dur: 3.2 },
  { src: 'img/IMG_5709.jpeg', dur: 2.8 },
  { src: 'img/IMG_5690.jpeg', cap: 'Trời xanh, biển rộng', dur: 2.8 },
  { src: 'img/IMG_5703.jpeg', cap: 'Tạo dáng chút nào', dur: 3.0 },
  { src: 'img/IMG_5695.jpeg', cap: 'Nắm tay nhau ra khơi', dur: 3.2 },
  { src: 'img/IMG_5691.jpeg', cap: 'Vui hết cỡ!', dur: 3.0 },
  { src: 'img/IMG_5601.jpeg', cap: 'Sóng tới rồi!', dur: 2.8 },
  { src: 'img/IMG_5595.jpeg', dur: 2.6 },
  { src: 'img/IMG_5625.jpeg', cap: 'Cười thật tươi', dur: 3.0 },
  { src: 'img/IMG_5618.jpeg', dur: 2.6 },
  { src: 'img/IMG_5574.jpeg', cap: 'Cả nhà cùng nghịch nước', dur: 3.0 },
  { type: 'title', title: 'NHỮNG ĐIỀU THÚ VỊ', dur: 2.6, variant: 'mini' },
  { src: 'img/IMG_5671.jpeg', cap: 'Bạn cua nhỏ ghé chơi', dur: 3.0 },
  { src: 'img/IMG_5670.jpeg', cap: 'Máy bay vút qua trời', dur: 2.8 },
  { src: 'img/IMG_5664.jpeg', cap: 'Thuyền thúng phơi nắng', dur: 3.0 },
  { src: 'img/IMG_5669.jpeg', cap: 'Tập bơi nào!', dur: 3.0 },
  { type: 'title', title: 'HOÀNG HÔN', dur: 2.6, variant: 'mini' },
  { src: 'img/IMG_5682.jpeg', cap: 'Hoàng hôn buông xuống', dur: 3.4 },
  { src: 'img/IMG_5663.jpeg', dur: 2.8 },
  { src: 'img/IMG_5662.jpeg', cap: 'Hoa giấy bên đường', dur: 3.0 },
  { src: 'img/IMG_5661.jpeg', dur: 2.8 },
  { src: 'img/IMG_5570.jpeg', cap: 'Đi cùng nhau vui hơn', dur: 3.2 },
  { src: 'img/IMG_5569.jpeg', dur: 2.8 },
  { src: 'img/IMG_5559.jpeg', cap: 'Một chút bình yên', dur: 3.4 },
  { type: 'title', title: 'MÃI BÊN NHAU ♡', sub: 'Hẹn gặp lại nhé, biển ơi!', dur: 4.6, variant: 'final' },
].map((s, i) => Object.assign({ id: 'd' + i }, s));

const freshDefault = () => DEFAULT_SEQ.map((c) => Object.assign({}, c));

// IndexedDB project store: clip list (meta) + uploaded image blobs (imgs)
const projDB = () => new Promise((res, rej) => {
  const o = indexedDB.open('beachtrip-project', 1);
  o.onupgradeneeded = () => {
    const db = o.result;
    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    if (!db.objectStoreNames.contains('imgs')) db.createObjectStore('imgs');
  };
  o.onerror = () => rej(o.error);
  o.onsuccess = () => res(o.result);
});
const pdbGetClips = async () => { const db = await projDB(); return new Promise((res, rej) => { const rq = db.transaction('meta').objectStore('meta').get('clips'); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); }); };
const pdbSaveClips = async (clips) => { const db = await projDB(); return new Promise((res, rej) => { const tx = db.transaction('meta', 'readwrite'); tx.objectStore('meta').put(clips, 'clips'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); };
const pdbPutImg = async (key, blob) => { const db = await projDB(); return new Promise((res, rej) => { const tx = db.transaction('imgs', 'readwrite'); tx.objectStore('imgs').put(blob, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); };
const pdbGetImg = async (key) => { const db = await projDB(); return new Promise((res, rej) => { const rq = db.transaction('imgs').objectStore('imgs').get(key); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); }); };
const pdbClearAll = async () => { const db = await projDB(); return new Promise((res, rej) => { const tx = db.transaction(['meta', 'imgs'], 'readwrite'); tx.objectStore('meta').clear(); tx.objectStore('imgs').clear(); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); };

// Downscale an uploaded image to keep things light (long side ≤ 2000px, q=0.9)
function resizeToBlob(file, max = 2000, q = 0.9) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth, h = img.naturalHeight;
      const s = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * s); h = Math.round(h * s);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(new Error('toBlob failed')); }, 'image/jpeg', q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')); };
    img.src = url;
  });
}

// Pauses the stage automatically when the editor opens (lives inside the Stage)
function StageEditBridge() {
  const { setPlaying } = React.useContext(TimelineContext);
  const { editing } = React.useContext(EditContext);
  React.useEffect(() => { if (editing && setPlaying) setPlaying(false); }, [editing]);
  return null;
}

// ── Editor panel ────────────────────────────────────────────────────────────

function EditorPanel({ clips, urls, onUpdate, onRemove, onMove, onAddPhotos, onImportScript, onInsertTitle, onClearAll, onReset, onClose, busy }) {
  const fileRef = React.useRef(null);
  const pendingIndexRef = React.useRef(null);
  const scriptFileRef = React.useRef(null);
  const [showImport, setShowImport] = React.useState(false);
  const [scriptText, setScriptText] = React.useState('');
  const triggerAdd = (atIndex) => { pendingIndexRef.current = atIndex; if (fileRef.current) fileRef.current.click(); };
  const InsertRail = ({ index }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '-2px 6px' }}>
      <div style={{ flex: 1, height: 1, background: '#dde6e9' }} />
      <button onClick={() => triggerAdd(index)} disabled={busy} title="Chèn ảnh vào vị trí này" style={{ fontFamily: VFONT, fontSize: 12, fontWeight: 700, color: '#0c6d7e', background: '#e8f1f3', border: 'none', borderRadius: 999, padding: '4px 12px', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Chèn ảnh
      </button>
      <button onClick={() => onInsertTitle(index)} title="Chèn tiêu đề vào vị trí này" style={{ fontFamily: VFONT, fontSize: 12, fontWeight: 700, color: '#b4632a', background: '#fbeadd', border: 'none', borderRadius: 999, padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Tiêu đề
      </button>
      <div style={{ flex: 1, height: 1, background: '#dde6e9' }} />
    </div>
  );
  const inputStyle = { width: '100%', boxSizing: 'border-box', fontFamily: VFONT, fontSize: 14, fontWeight: 500, color: '#13303c', background: '#fff', border: '1px solid #d4dde2', borderRadius: 9, padding: '8px 10px', outline: 'none' };
  const labelStyle = { fontFamily: VFONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#7d909a', marginBottom: 5 };
  const iconBtn = { width: 30, height: 30, borderRadius: 8, border: '1px solid #d4dde2', background: '#fff', color: '#3a5562', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 };

  return (
    <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 408, maxWidth: '92vw', zIndex: 50, background: '#f3f6f7', boxShadow: '-18px 0 60px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', fontFamily: VFONT }}>
      <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0e4257', color: '#fff' }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em' }}>Chỉnh sửa video</div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.72)', marginTop: 2 }}>Ảnh & lời minh hoạ · {clips.length} cảnh</div>
        </div>
        <button onClick={onClose} title="Đóng" style={{ width: 38, height: 38, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
        </button>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #e0e7ea', background: '#fff' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => { onAddPhotos(e.target.files, pendingIndexRef.current); pendingIndexRef.current = null; e.target.value = ''; }} style={{ display: 'none' }} />
          <button onClick={() => triggerAdd(null)} disabled={busy} style={{ flex: 1, fontFamily: VFONT, fontSize: 14, fontWeight: 700, color: '#fff', background: busy ? '#88a4ae' : '#0c6d7e', border: 'none', borderRadius: 10, padding: '11px 12px', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            {busy ? 'Đang thêm…' : 'Thêm ảnh vào cuối'}
          </button>
          <button onClick={() => setShowImport((v) => !v)} title="Tải ảnh kèm kịch bản" style={{ fontFamily: VFONT, fontSize: 14, fontWeight: 700, color: '#0c6d7e', background: showImport ? '#cfe6ea' : '#e3eff1', border: 'none', borderRadius: 10, padding: '11px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>
            Kịch bản
          </button>
        </div>

        {showImport && (
          <div style={{ background: '#f1f7f8', border: '1px solid #d4e4e7', borderRadius: 11, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <div style={{ fontFamily: VFONT, fontSize: 12.5, fontWeight: 600, color: '#4a6470', lineHeight: 1.5 }}>
              Mỗi dòng = 1 ảnh, theo thứ tự tên file:<br />
              <span style={{ fontWeight: 800, color: '#0c6d7e' }}>Lời minh hoạ | Dòng phụ | Thời lượng | Vị trí</span>
              <span style={{ color: '#7d909a' }}> (đều có thể bỏ trống — mặc định 5 giây, vị trí bottom-left. Vị trí: tl tc tr ml c mr bl bc br)</span>
            </div>
            <textarea value={scriptText} onChange={(e) => setScriptText(e.target.value)} rows={5} placeholder={'Bình minh trên biển | Ngày đầu tiên | 5 | tl\nHoàng hôn | | 6 | c\nChụp cùng cả nhà'} style={{ width: '100%', boxSizing: 'border-box', fontFamily: VFONT, fontSize: 13, color: '#13303c', background: '#fff', border: '1px solid #d4dde2', borderRadius: 9, padding: '9px 11px', outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
            <input ref={scriptFileRef} type="file" accept="image/*" multiple onChange={(e) => { onImportScript(e.target.files, scriptText); e.target.value = ''; }} style={{ display: 'none' }} />
            <button onClick={() => { if (scriptFileRef.current) scriptFileRef.current.click(); }} disabled={busy} style={{ fontFamily: VFONT, fontSize: 14, fontWeight: 700, color: '#fff', background: busy ? '#88a4ae' : '#0e4257', border: 'none', borderRadius: 9, padding: '10px 12px', cursor: busy ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></svg>
              {busy ? 'Đang nhập…' : 'Chọn ảnh & áp dụng kịch bản'}
            </button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {clips.map((c, i) => {
          const isTitle = c.type === 'title';
          const thumb = c.imgKey ? urls[c.imgKey] : c.src;
          return (
            <React.Fragment key={c.id}>
            <InsertRail index={i} />
            <div style={{ background: '#fff', border: '1px solid #e3e9ec', borderRadius: 13, padding: 12, display: 'flex', gap: 12, boxShadow: '0 1px 3px rgba(20,48,60,0.05)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ width: 30, height: 22, borderRadius: 6, background: '#eef3f4', color: '#5a7079', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</div>
                <button onClick={() => onMove(c.id, -1)} disabled={i === 0} style={Object.assign({}, iconBtn, { opacity: i === 0 ? 0.35 : 1, width: 30, height: 26 })} title="Lên">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button onClick={() => onMove(c.id, 1)} disabled={i === clips.length - 1} style={Object.assign({}, iconBtn, { opacity: i === clips.length - 1 ? 0.35 : 1, width: 30, height: 26 })} title="Xuống">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {isTitle ? (
                  <React.Fragment>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#b4632a', background: '#fbeadd', borderRadius: 6, padding: '3px 8px', letterSpacing: '0.04em' }}>TIÊU ĐỀ</span>
                    </div>
                    <div>
                      <div style={labelStyle}>Dòng chữ lớn</div>
                      <input value={c.title || ''} onChange={(e) => onUpdate(c.id, { title: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <div style={labelStyle}>Dòng phụ (tuỳ chọn)</div>
                      <input value={c.sub || ''} onChange={(e) => onUpdate(c.id, { sub: e.target.value })} placeholder="—" style={inputStyle} />
                    </div>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <div style={{ width: '100%', aspectRatio: '16 / 9', borderRadius: 9, overflow: 'hidden', background: '#dfe7ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: '#8aa0a8', fontSize: 13 }}>—</span>}
                    </div>
                    <div>
                      <div style={labelStyle}>Lời minh hoạ</div>
                      <input value={c.cap || ''} onChange={(e) => onUpdate(c.id, { cap: e.target.value })} placeholder="Để trống nếu không cần chữ" style={inputStyle} />
                    </div>
                    <div>
                      <div style={labelStyle}>Dòng phụ (tuỳ chọn)</div>
                      <input value={c.sub || ''} onChange={(e) => onUpdate(c.id, { sub: e.target.value })} placeholder="—" style={inputStyle} />
                    </div>
                    <div>
                      <div style={labelStyle}>Vị trí lời minh hoạ</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, width: 96 }}>
                        {['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'].map((p) => {
                          const active = (c.pos || 'bottom-left') === p;
                          return (
                            <button key={p} onClick={() => onUpdate(c.id, { pos: p })} title={p} style={{ width: 28, height: 22, padding: 0, borderRadius: 5, cursor: 'pointer', border: active ? '1.5px solid #0c6d7e' : '1px solid #d4dde2', background: active ? '#0c6d7e' : '#fff', display: 'flex', alignItems: ['top-left', 'top-center', 'top-right'].indexOf(p) >= 0 ? 'flex-start' : ['bottom-left', 'bottom-center', 'bottom-right'].indexOf(p) >= 0 ? 'flex-end' : 'center', justifyContent: p.indexOf('left') >= 0 ? 'flex-start' : p.indexOf('right') >= 0 ? 'flex-end' : 'center' }}>
                              <span style={{ display: 'block', width: 10, height: 3, borderRadius: 2, margin: 4, background: active ? '#fff' : '#9fb2ba' }} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </React.Fragment>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#3a5562' }}>
                    Thời lượng
                    <input type="number" min="0.6" max="12" step="0.2" value={c.dur} onChange={(e) => { const v = parseFloat(e.target.value); onUpdate(c.id, { dur: isFinite(v) ? Math.min(12, Math.max(0.6, v)) : 3 }); }} style={{ width: 64, fontFamily: VFONT, fontSize: 14, fontWeight: 600, color: '#13303c', border: '1px solid #d4dde2', borderRadius: 8, padding: '6px 8px', outline: 'none' }} />
                    <span style={{ color: '#7d909a', fontSize: 13 }}>giây</span>
                  </label>
                  <button onClick={() => onRemove(c.id)} title="Xoá cảnh" style={Object.assign({}, iconBtn, { color: '#c0392b', borderColor: '#f0d2cd' })}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            </div>
            </React.Fragment>
          );
        })}
        <InsertRail index={clips.length} />
      </div>

      <div style={{ padding: '13px 18px', borderTop: '1px solid #e0e7ea', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onReset} style={{ fontFamily: VFONT, fontSize: 13, fontWeight: 600, color: '#7d909a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>↺ Khôi phục mặc định</button>
          <button onClick={() => { if (window.confirm('Xoá toàn bộ hình ảnh? Hành động này không thể hoàn tác.')) onClearAll(); }} disabled={busy || clips.length === 0} style={{ fontFamily: VFONT, fontSize: 13, fontWeight: 600, color: clips.length === 0 ? '#c2ccd1' : '#c0392b', background: 'none', border: 'none', cursor: clips.length === 0 ? 'default' : 'pointer', padding: 0 }}>🗑 Xoá toàn bộ</button>
        </div>
        <button onClick={onClose} style={{ fontFamily: VFONT, fontSize: 14, fontWeight: 700, color: '#fff', background: '#0e4257', border: 'none', borderRadius: 10, padding: '10px 22px', cursor: 'pointer' }}>Xong</button>
      </div>
    </div>
  );
}

function BeachTrip({ canEdit = true } = {}) {
  const OVERLAP = 0.5;
  const [clips, setClips] = React.useState(null); // null = loading from store
  const [urls, setUrls] = React.useState({});     // imgKey -> objectURL
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [restartSignal, setRestartSignal] = React.useState(0);
  const [isFs, setIsFs] = React.useState(false);
  const rootRef = React.useRef(null);
  React.useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFullscreen = () => {
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else if (rootRef.current && rootRef.current.requestFullscreen) { rootRef.current.requestFullscreen(); }
    } catch (e) {}
  };

  // Replay from the beginning whenever the set of images/clips changes.
  // We bump a signal the Stage watches (imperative seek-to-0 + play) instead of
  // remounting the Stage — remounting tore down the live music element, which is
  // what caused the soundtrack to go silent / need a manual click after edits.
  const restartFromStart = () => {
    try { localStorage.setItem('beachtrip:t', '0'); } catch (e) {}
    setRestartSignal((n) => n + 1);
  };

  // Load saved project (or defaults) + resolve uploaded image blobs to URLs
  React.useEffect(() => {
    let alive = true;
    (async () => {
      let saved = null;
      try { saved = await pdbGetClips(); } catch (e) {}
      const base = (saved && Array.isArray(saved) && saved.length) ? saved : freshDefault();
      const u = {};
      for (const c of base) {
        if (c.imgKey) {
          try { const blob = await pdbGetImg(c.imgKey); if (blob) u[c.imgKey] = URL.createObjectURL(blob); } catch (e) {}
        }
      }
      if (!alive) return;
      setUrls(u);
      setClips(base);
    })();
    return () => { alive = false; };
  }, []);

  const persist = (next) => { pdbSaveClips(next).catch(() => {}); return next; };
  const onUpdate = (id, patch) => setClips((prev) => persist(prev.map((c) => (c.id === id ? Object.assign({}, c, patch) : c))));
  const onRemove = (id) => { setClips((prev) => persist(prev.filter((c) => c.id !== id))); restartFromStart(); };
  const onMove = (id, dir) => {
    setClips((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const a = prev.slice(); const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
      return persist(a);
    });
    restartFromStart();
  };
  const onInsertTitle = (atIndex) => {
    setClips((prev) => {
      const at = (atIndex == null || atIndex > prev.length) ? prev.length : Math.max(0, atIndex);
      const a = prev.slice();
      a.splice(at, 0, { id: 'c' + Date.now(), type: 'title', title: 'TIÊU ĐỀ MỚI', sub: '', dur: 2.6, variant: 'mini' });
      return persist(a);
    });
    restartFromStart();
  };
  const onClearAll = async () => {
    try {
      const db = await projDB();
      await new Promise((r) => { const tx = db.transaction('imgs', 'readwrite'); tx.objectStore('imgs').clear(); tx.oncomplete = () => r(); tx.onerror = () => r(); });
    } catch (e) {}
    setUrls((prev) => { Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} }); return {}; });
    setClips(persist([]));
    restartFromStart();
  };
  // Bulk import: images paired with a per-line script. Each script line maps to
  // one image (in filename order): "Lời minh hoạ | Dòng phụ | Thời lượng".
  const onImportScript = async (files, scriptText) => {
    const arr = Array.from(files || []).filter((f) => f.type && f.type.indexOf('image/') === 0);
    if (!arr.length) return;
    arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const lines = (scriptText || '').split('\n').map((s) => s.trim()).filter(Boolean);
    setBusy(true);
    const stamp = Date.now();
    const newUrls = {};
    const newClips = [];
    for (let i = 0; i < arr.length; i++) {
      let blob;
      try { blob = await resizeToBlob(arr[i], 2000, 0.9); } catch (e) { blob = arr[i]; }
      const key = 'up_' + stamp + '_' + i;
      try { await pdbPutImg(key, blob); } catch (e) {}
      newUrls[key] = URL.createObjectURL(blob);
      const parts = (lines[i] || '').split('|').map((s) => s.trim());
      const cap = parts[0] || '';
      const sub = parts[1] || '';
      let dur = parseFloat(parts[2]);
      dur = isFinite(dur) ? Math.min(12, Math.max(0.6, dur)) : 5.0;
      const POSMAP = { tl: 'top-left', tc: 'top-center', tr: 'top-right', ml: 'middle-left', c: 'center', mr: 'middle-right', bl: 'bottom-left', bc: 'bottom-center', br: 'bottom-right' };
      const posKey = (parts[3] || '').toLowerCase().replace(/[\s_]+/g, '-');
      const pos = POSMAP[posKey] || (['top-left', 'top-center', 'top-right', 'middle-left', 'center', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right'].indexOf(posKey) >= 0 ? posKey : 'bottom-left');
      newClips.push({ id: 'c' + stamp + '_' + i, imgKey: key, cap: cap, sub: sub, dur: dur, pos: pos });
    }
    setUrls((u) => Object.assign({}, u, newUrls));
    setClips((prev) => persist(prev.concat(newClips)));
    setBusy(false);
    restartFromStart();
  };
  const onAddPhotos = async (files, atIndex) => {
    const arr = Array.from(files || []).filter((f) => f.type && f.type.indexOf('image/') === 0);
    if (!arr.length) return;
    setBusy(true);
    const stamp = Date.now();
    const newUrls = {};
    const newClips = [];
    for (let i = 0; i < arr.length; i++) {
      let blob;
      try { blob = await resizeToBlob(arr[i], 2000, 0.9); } catch (e) { blob = arr[i]; }
      const key = 'up_' + stamp + '_' + i;
      try { await pdbPutImg(key, blob); } catch (e) {}
      newUrls[key] = URL.createObjectURL(blob);
      newClips.push({ id: 'c' + stamp + '_' + i, imgKey: key, cap: '', dur: 5.0, pos: 'bottom-left' });
    }
    setUrls((u) => Object.assign({}, u, newUrls));
    setClips((prev) => {
      const at = (atIndex == null || atIndex > prev.length) ? prev.length : Math.max(0, atIndex);
      const a = prev.slice();
      a.splice(at, 0, ...newClips);
      return persist(a);
    });
    setBusy(false);
    restartFromStart();
  };
  const onReset = async () => {
    try { await pdbClearAll(); } catch (e) {}
    setUrls((prev) => { Object.values(prev).forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} }); return {}; });
    setClips(freshDefault());
    restartFromStart();
  };

  if (!clips) {
    return (
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(155deg,#0a2735 0%,#0e4257 55%,#0c6d7e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: VFONT, fontWeight: 800, fontSize: 34, color: '#fff' }}>Đang mở video…</div>
      </div>
    );
  }

  let t = 0;
  const items = clips.map((c) => {
    const dur = c.dur != null ? c.dur : 3.0;
    const start = t;
    t += (dur - OVERLAP);
    const src = c.imgKey ? urls[c.imgKey] : c.src;
    return Object.assign({}, c, { src, start, dur, end: start + dur });
  });
  const total = t + OVERLAP + 0.4;
  const photoSrcs = items.filter((it) => it.type !== 'title' && it.src).map((it) => it.src);

  return (
    <EditContext.Provider value={{ editing }}>
      <div ref={rootRef} style={{ position: 'absolute', inset: 0, background: '#06121a' }}>
        <PreloadGate srcs={photoSrcs}>
          <Stage restartSignal={restartSignal} width={1600} height={900} duration={total} background="#06121a" persistKey="beachtrip">
            {items.map((it, i) => (
              <Sprite key={it.id} start={it.start} end={it.end}>
                {it.type === 'title'
                  ? <TitleCard title={it.title} sub={it.sub} dur={it.dur} variant={it.variant || 'main'} />
                  : <PhotoFrame src={it.src} dur={it.dur} caption={it.cap} sub={it.sub} pos={it.pos || 'bottom-left'} />}
              </Sprite>
            ))}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 240px rgba(0,0,0,0.55)' }} />
            <BeachMusic />
            <StageEditBridge />
          </Stage>
        </PreloadGate>

        {!editing && (
          <button onClick={toggleFullscreen} title={isFs ? 'Thoát toàn màn hình' : 'Toàn màn hình'} style={{ position: 'absolute', top: 24, right: 24, zIndex: 40, width: 52, height: 52, borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(8,18,26,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 18px rgba(0,0,0,0.3)' }}>
            {isFs
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>}
          </button>
        )}

        {!editing && canEdit && (
          <button onClick={() => setEditing(true)} title="Chỉnh sửa ảnh & lời" style={{ position: 'absolute', top: 24, left: 24, zIndex: 40, height: 52, padding: '0 20px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(8,18,26,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontFamily: VFONT, fontSize: 15, fontWeight: 700, boxShadow: '0 4px 18px rgba(0,0,0,0.3)' }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Chỉnh sửa
          </button>
        )}

        {clips.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, pointerEvents: 'none', textAlign: 'center', padding: 24 }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <div style={{ fontFamily: VFONT, fontWeight: 800, fontSize: 26, color: 'rgba(255,255,255,0.92)' }}>Chưa có hình ảnh</div>
            <div style={{ fontFamily: VFONT, fontWeight: 500, fontSize: 16, color: 'rgba(255,255,255,0.6)' }}>Mở “Chỉnh sửa” để thêm ảnh hoặc nhập theo kịch bản.</div>
          </div>
        )}

        {editing && canEdit && (
          <EditorPanel
            clips={clips} urls={urls} busy={busy}
            onUpdate={onUpdate} onRemove={onRemove} onMove={onMove}
            onAddPhotos={onAddPhotos} onImportScript={onImportScript}
            onInsertTitle={onInsertTitle}
            onClearAll={onClearAll} onReset={onReset}
            onClose={() => setEditing(false)}
          />
        )}
      </div>
    </EditContext.Provider>
  );
}

window.BeachTrip = BeachTrip;

// ════════════════════════════════════════════════════════════════════════════
//  ĐĂNG NHẬP (Firebase Auth · Google) + PHÊ DUYỆT (Firestore)
//  Sửa cấu hình ở FIREBASE_CONFIG / ADMIN_EMAIL nếu cần.
// ════════════════════════════════════════════════════════════════════════════
const ADMIN_EMAIL = 'lqdieu1981@gmail.com';
// Chế độ "đăng nhập thử" (mock) tự TẮT khi chạy trên domain production thật,
// và tự BẬT khi xem trước / localhost. Thêm domain thật của bạn vào đây nếu dùng tên miền riêng.
const PROD_HOSTS = ['die4u.github.io', 'slideimages-ef18f.web.app', 'slideimages-ef18f.firebaseapp.com'];
const ALLOW_MOCK_LOGIN = (typeof location === 'undefined') ? true : !PROD_HOSTS.includes(location.hostname);
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyA5TOwFw2vvwfsXF7p3_-8imN64j4cULf8",
  authDomain: "slideimages-ef18f.firebaseapp.com",
  projectId: "slideimages-ef18f",
  storageBucket: "slideimages-ef18f.firebasestorage.app",
  messagingSenderId: "592591735292",
  appId: "1:592591735292:web:737d52f0b0ea8f51668a79",
  measurementId: "G-E313P3NG1J"
};
const FB_VER = '10.12.5';
const IDENT_KEY = 'beachtrip_identity_v1';

function _injectScript(src) {
  return new Promise((res, rej) => {
    if ([].some.call(document.scripts, (s) => s.src === src)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = false;
    s.onload = () => res();
    s.onerror = () => rej(new Error('Không tải được ' + src));
    document.head.appendChild(s);
  });
}
let _fbReady = null;
function loadFirebase() {
  if (_fbReady) return _fbReady;
  _fbReady = (async () => {
    const base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    if (!window.firebase) await _injectScript(base + 'firebase-app-compat.js');
    if (!window.firebase.auth) await _injectScript(base + 'firebase-auth-compat.js');
    if (!window.firebase.firestore) await _injectScript(base + 'firebase-firestore-compat.js');
    if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE_CONFIG);
    return { fb: window.firebase, auth: window.firebase.auth(), db: window.firebase.firestore() };
  })();
  return _fbReady;
}
const _sanitize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const _isAdminEmail = (e) => !!e && e.toLowerCase() === ADMIN_EMAIL.toLowerCase();
const _saveIdent = (id) => { try { localStorage.setItem(IDENT_KEY, JSON.stringify(id)); } catch (e) {} };
const _loadIdent = () => { try { return JSON.parse(localStorage.getItem(IDENT_KEY) || 'null'); } catch (e) { return null; } };
const _clearIdent = () => { try { localStorage.removeItem(IDENT_KEY); } catch (e) {} };

const ROLE_LABEL = { viewer: 'Quyền xem', editor: 'Xem + Sửa kịch bản' };
const STATUS_META = {
  pending:  { label: 'Chờ duyệt',  color: '#d99a2b', bg: 'rgba(217,154,43,0.16)' },
  approved: { label: 'Đã duyệt',   color: '#2bb3a3', bg: 'rgba(43,179,163,0.16)' },
  rejected: { label: 'Từ chối',    color: '#d97064', bg: 'rgba(217,112,100,0.16)' },
};
const SCREEN_BG = 'radial-gradient(120% 120% at 50% 0%, #0e4257 0%, #08222e 55%, #05141c 100%)';

function GoogleG({ size = 20 }) {
  return React.createElement('svg', { width: size, height: size, viewBox: '0 0 48 48' },
    React.createElement('path', { fill: '#FFC107', d: 'M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44a20 20 0 0 0 19.6-23.5z' }),
    React.createElement('path', { fill: '#FF3D00', d: 'M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.2 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z' }),
    React.createElement('path', { fill: '#4CAF50', d: 'M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z' }),
    React.createElement('path', { fill: '#1976D2', d: 'M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 36 44 30.5 44 24c0-1.2-.1-2.4-.4-3.5z' })
  );
}

function Avatar({ name, photo, size = 36 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const ring = { width: size, height: size, borderRadius: 999, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg,#13889a,#0c5566)', color: '#fff', fontFamily: VFONT, fontWeight: 800, fontSize: size * 0.42 };
  if (photo) return React.createElement('img', { src: photo, referrerPolicy: 'no-referrer', style: Object.assign({}, ring, { objectFit: 'cover' }) });
  return React.createElement('div', { style: ring }, initial);
}

function BeachTripApp() {
  const [phase, setPhase] = React.useState('loading'); // loading | signin | pending | rejected | app | error
  const [me, setMe] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  const [loginErr, setLoginErr] = React.useState('');
  const [showMock, setShowMock] = React.useState(false);
  const [mockEmail, setMockEmail] = React.useState('');
  const [mockName, setMockName] = React.useState('');
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const docUnsub = React.useRef(null);

  const startSession = React.useCallback(async (id) => {
    try {
      setPhase('loading');
      const { db, fb } = await loadFirebase();
      const ref = db.collection('users').doc(id.uid);
      const snap = await ref.get();
      const admin = _isAdminEmail(id.email);
      const ts = fb.firestore.FieldValue.serverTimestamp();
      if (!snap.exists) {
        await ref.set({
          email: id.email || '', displayName: id.displayName || id.email || '', photoURL: id.photoURL || '',
          role: admin ? 'editor' : 'viewer', status: admin ? 'approved' : 'pending',
          isAdmin: admin, mock: !!id.mock, createdAt: ts, updatedAt: ts,
        });
      } else {
        const patch = { email: id.email || '', displayName: id.displayName || snap.data().displayName || '', photoURL: id.photoURL || snap.data().photoURL || '' };
        if (admin) { patch.role = 'editor'; patch.status = 'approved'; patch.isAdmin = true; }
        await ref.update(patch);
      }
      if (docUnsub.current) docUnsub.current();
      docUnsub.current = ref.onSnapshot((s) => {
        if (!s.exists) { setPhase('signin'); return; }
        const d = s.data();
        setMe(Object.assign({ uid: id.uid }, d));
        setPhase(d.status === 'approved' ? 'app' : d.status === 'rejected' ? 'rejected' : 'pending');
      });
    } catch (e) {
      setLoginErr('Lỗi kết nối Firestore: ' + (e && e.message ? e.message : e) + '. Kiểm tra Rules cho phép đọc/ghi collection "users".');
      setPhase('error');
    }
  }, []);

  React.useEffect(() => {
    let alive = true; let unsubAuth = null;
    loadFirebase().then(({ auth }) => {
      unsubAuth = auth.onAuthStateChanged((u) => {
        if (!alive) return;
        if (u) {
          const id = { uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL, mock: false };
          _saveIdent(id); startSession(id);
        } else {
          const m = _loadIdent();
          if (m && m.mock) startSession(m);
          else setPhase('signin');
        }
      });
    }).catch((e) => {
      setLoginErr('Không tải được Firebase SDK: ' + (e && e.message ? e.message : e));
      setPhase('error');
    });
    return () => { alive = false; if (unsubAuth) unsubAuth(); if (docUnsub.current) docUnsub.current(); };
  }, [startSession]);

  const signInGoogle = async () => {
    setLoginErr(''); setBusy(true);
    try {
      const { auth, fb } = await loadFirebase();
      const provider = new fb.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider); // onAuthStateChanged tiếp quản
    } catch (e) {
      setBusy(false);
      const code = (e && e.code) || '';
      if (code.indexOf('unauthorized-domain') >= 0) {
        setLoginErr('Tên miền xem trước chưa được Firebase cấp phép. Hãy dùng “Đăng nhập thử” bên dưới để xem luồng, hoặc thêm domain vào Authentication → Settings → Authorized domains khi deploy.');
      } else if (code.indexOf('popup') >= 0) {
        setLoginErr('Cửa sổ Google bị chặn trong khung xem trước. Hãy dùng “Đăng nhập thử” bên dưới.');
      } else {
        setLoginErr('Không đăng nhập được: ' + (e && e.message ? e.message : e));
      }
      if (ALLOW_MOCK_LOGIN) setShowMock(true);
    }
  };

  const signInMock = () => {
    const email = (mockEmail || '').trim();
    if (!email || email.indexOf('@') < 1) { setLoginErr('Vui lòng nhập email hợp lệ.'); return; }
    setLoginErr('');
    const id = { uid: 'mock_' + _sanitize(email), email, displayName: (mockName || '').trim() || email.split('@')[0], photoURL: '', mock: true };
    _saveIdent(id); startSession(id);
  };

  const doSignOut = async () => {
    setAccountOpen(false); setAdminOpen(false);
    if (docUnsub.current) { docUnsub.current(); docUnsub.current = null; }
    try { const { auth } = await loadFirebase(); await auth.signOut(); } catch (e) {}
    _clearIdent(); setMe(null); setPhase('signin');
  };

  // ── chrome chung cho các màn full-screen ───────────────────────────────────
  const Centered = ({ children }) => React.createElement('div', {
    style: { position: 'absolute', inset: 0, background: SCREEN_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: VFONT, boxSizing: 'border-box' }
  }, children);

  if (phase === 'loading') {
    return React.createElement(Centered, null,
      React.createElement('div', { style: { color: 'rgba(255,255,255,0.92)', fontWeight: 700, fontSize: 22 } }, 'Đang tải…'));
  }

  if (phase === 'error') {
    return React.createElement(Centered, null,
      React.createElement('div', { style: { maxWidth: 460, textAlign: 'center', color: '#fff' } },
        React.createElement('div', { style: { fontWeight: 800, fontSize: 24, marginBottom: 12 } }, 'Có lỗi xảy ra'),
        React.createElement('div', { style: { fontSize: 15, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)', marginBottom: 20 } }, loginErr),
        React.createElement('button', { onClick: () => { setPhase('signin'); setLoginErr(''); }, style: btnGhost }, 'Quay lại')));
  }

  if (phase === 'signin') return renderSignin();
  if (phase === 'pending') return renderStatus('pending');
  if (phase === 'rejected') return renderStatus('rejected');

  // phase === 'app'
  const canEdit = !!me && (me.isAdmin || me.role === 'editor');
  return React.createElement('div', { style: { position: 'absolute', inset: 0, background: '#06121a' } },
    React.createElement(BeachTrip, { canEdit }),
    renderAccountChip(),
    adminOpen && me && me.isAdmin ? React.createElement(AdminPanel, { meUid: me.uid, onClose: () => setAdminOpen(false) }) : null
  );

  // ── render helpers ──────────────────────────────────────────────────────────
  function renderSignin() {
    return React.createElement(Centered, null,
      React.createElement('div', { style: cardStyle },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 26 } },
          React.createElement('div', { style: { fontSize: 13, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5fb6c4' } }, 'Chuyến đi biển'),
          React.createElement('div', { style: { fontSize: 27, fontWeight: 800, color: '#0e3a49', letterSpacing: '-0.02em', textAlign: 'center' } }, 'Đăng nhập để xem video'),
          React.createElement('div', { style: { fontSize: 14.5, fontWeight: 500, color: '#6b8893', textAlign: 'center', lineHeight: 1.55 } }, 'Tài khoản cần được quản trị viên phê duyệt trước khi truy cập.')
        ),
        React.createElement('button', { onClick: signInGoogle, disabled: busy, style: btnGoogle },
          React.createElement(GoogleG, { size: 21 }),
          React.createElement('span', null, busy ? 'Đang mở Google…' : 'Đăng nhập bằng Google')),
        loginErr ? React.createElement('div', { style: errBox }, loginErr) : null,
        ALLOW_MOCK_LOGIN ? React.createElement(React.Fragment, null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 4px' } },
            React.createElement('div', { style: { flex: 1, height: 1, background: '#e0e8eb' } }),
            React.createElement('div', { style: { fontSize: 12, fontWeight: 700, color: '#9bb0b8', letterSpacing: '0.08em' } }, showMock ? 'ĐĂNG NHẬP THỬ' : 'HOẶC'),
            React.createElement('div', { style: { flex: 1, height: 1, background: '#e0e8eb' } })),
          showMock
            ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 } },
                React.createElement('div', { style: { fontSize: 12.5, color: '#7d949d', lineHeight: 1.5 } }, 'Chế độ thử (không cần popup Google) — nhập email để mô phỏng người dùng. Quyền vẫn được lưu thật trên Firestore.'),
                React.createElement('input', { value: mockEmail, onChange: (e) => setMockEmail(e.target.value), placeholder: 'email@gmail.com', onKeyDown: (e) => { if (e.key === 'Enter') signInMock(); }, style: inputStyle2 }),
                React.createElement('input', { value: mockName, onChange: (e) => setMockName(e.target.value), placeholder: 'Tên hiển thị (tuỳ chọn)', style: inputStyle2 }),
                React.createElement('button', { onClick: signInMock, style: btnPrimary }, 'Vào thử'))
            : React.createElement('button', { onClick: () => setShowMock(true), style: { ...btnGhost, marginTop: 12 } }, 'Đăng nhập thử (xem trước luồng)')
        ) : null
      ));
  }

  function renderStatus(kind) {
    const isPending = kind === 'pending';
    const m = STATUS_META[kind];
    return React.createElement(Centered, null,
      React.createElement('div', { style: { ...cardStyle, textAlign: 'center' } },
        me ? React.createElement('div', { style: { display: 'flex', justifyContent: 'center', marginBottom: 16 } }, React.createElement(Avatar, { name: me.displayName, photo: me.photoURL, size: 56 })) : null,
        React.createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'center', padding: '5px 13px', borderRadius: 999, background: m.bg, color: m.color, fontSize: 13, fontWeight: 800, marginBottom: 14 } },
          React.createElement('span', { style: { width: 8, height: 8, borderRadius: 999, background: m.color } }), m.label),
        React.createElement('div', { style: { fontSize: 23, fontWeight: 800, color: '#0e3a49', marginBottom: 10 } }, isPending ? 'Đang chờ phê duyệt' : 'Truy cập bị từ chối'),
        React.createElement('div', { style: { fontSize: 15, color: '#6b8893', lineHeight: 1.6, marginBottom: 22 } },
          isPending
            ? 'Tài khoản của bạn đã được ghi nhận. Quản trị viên sẽ phê duyệt và cấp quyền. Trang sẽ tự mở khi được duyệt.'
            : 'Tài khoản của bạn chưa được cấp quyền truy cập. Vui lòng liên hệ quản trị viên.'),
        me ? React.createElement('div', { style: { fontSize: 13.5, color: '#9bb0b8', marginBottom: 22 } }, me.email) : null,
        React.createElement('button', { onClick: doSignOut, style: btnGhost }, 'Đăng xuất')));
  }

  function renderAccountChip() {
    if (!me) return null;
    const role = me.isAdmin ? 'editor' : me.role;
    return React.createElement('div', { style: { position: 'absolute', top: 24, right: 88, zIndex: 45, fontFamily: VFONT } },
      React.createElement('button', { onClick: () => setAccountOpen((v) => !v), title: 'Tài khoản', style: { display: 'flex', alignItems: 'center', gap: 9, height: 52, padding: '0 14px 0 8px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(8,18,26,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', color: '#fff', cursor: 'pointer', boxShadow: '0 4px 18px rgba(0,0,0,0.3)' } },
        React.createElement(Avatar, { name: me.displayName, photo: me.photoURL, size: 36 }),
        React.createElement('span', { style: { fontSize: 14.5, fontWeight: 700, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, me.displayName || me.email)),
      accountOpen ? React.createElement('div', { style: { position: 'absolute', top: 60, right: 0, width: 248, background: '#fff', borderRadius: 14, boxShadow: '0 18px 50px rgba(0,0,0,0.35)', overflow: 'hidden' } },
        React.createElement('div', { style: { padding: '15px 16px', borderBottom: '1px solid #eef2f3' } },
          React.createElement('div', { style: { fontSize: 15, fontWeight: 800, color: '#13303c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, me.displayName || '—'),
          React.createElement('div', { style: { fontSize: 13, color: '#7d949d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 } }, me.email),
          React.createElement('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 9, padding: '4px 10px', borderRadius: 999, background: '#e7f3f4', color: '#0c6d7e', fontSize: 12, fontWeight: 800 } }, ROLE_LABEL[role] || role, me.isAdmin ? ' · Admin' : '')),
        me.isAdmin ? React.createElement('button', { onClick: () => { setAccountOpen(false); setAdminOpen(true); }, style: menuItem },
          React.createElement('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }), React.createElement('circle', { cx: 9, cy: 7, r: 4 }), React.createElement('path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' })),
          'Trang duyệt người dùng') : null,
        React.createElement('button', { onClick: doSignOut, style: { ...menuItem, color: '#c0504d' } },
          React.createElement('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }), React.createElement('polyline', { points: '16 17 21 12 16 7' }), React.createElement('line', { x1: 21, y1: 12, x2: 9, y2: 12 })),
          'Đăng xuất')) : null);
  }
}

// ── Trang Admin: danh sách user + duyệt/quyền ─────────────────────────────────
function AdminPanel({ meUid, onClose }) {
  const [users, setUsers] = React.useState(null);
  const [archive, setArchive] = React.useState(null); // kho email bị từ chối
  const [filter, setFilter] = React.useState('all'); // all | pending | approved | rejected | archive
  React.useEffect(() => {
    let unsub = null; let alive = true;
    loadFirebase().then(({ db }) => {
      unsub = db.collection('users').onSnapshot((qs) => {
        if (!alive) return;
        const arr = qs.docs.map((d) => Object.assign({ uid: d.id }, d.data()));
        arr.sort((a, b) => {
          const ord = { pending: 0, approved: 1, rejected: 2 };
          if ((ord[a.status] ?? 9) !== (ord[b.status] ?? 9)) return (ord[a.status] ?? 9) - (ord[b.status] ?? 9);
          return (a.email || '').localeCompare(b.email || '');
        });
        setUsers(arr);
      }, () => setUsers([]));
    });
    return () => { alive = false; if (unsub) unsub(); };
  }, []);

  React.useEffect(() => {
    let unsub = null; let alive = true;
    loadFirebase().then(({ db }) => {
      unsub = db.collection('rejectedEmails').onSnapshot((qs) => {
        if (!alive) return;
        const arr = qs.docs.map((d) => Object.assign({ id: d.id }, d.data()));
        arr.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        setArchive(arr);
      }, () => setArchive([]));
    });
    return () => { alive = false; if (unsub) unsub(); };
  }, []);

  const patch = async (uid, data) => {
    const { db, fb } = await loadFirebase();
    await db.collection('users').doc(uid).update(Object.assign({ updatedAt: fb.firestore.FieldValue.serverTimestamp() }, data));
  };
  const reject = async (u) => {
    const { db, fb } = await loadFirebase();
    const ts = fb.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(u.uid).update({ status: 'rejected', updatedAt: ts });
    if (u.email) await db.collection('rejectedEmails').doc(_sanitize(u.email)).set({ email: u.email, displayName: u.displayName || '', photoURL: u.photoURL || '', rejectedAt: ts }, { merge: true });
  };
  const remove = async (uid, label) => {
    if (!window.confirm('Xoá tài khoản "' + (label || uid) + '"?\nNgười này có thể đăng nhập lại để chờ duyệt từ đầu.')) return;
    const { db } = await loadFirebase();
    await db.collection('users').doc(uid).delete();
  };
  const removeArchive = async (id, label) => {
    if (!window.confirm('Xoá "' + (label || id) + '" khỏi kho lưu trữ email từ chối?')) return;
    const { db } = await loadFirebase();
    await db.collection('rejectedEmails').doc(id).delete();
  };

  const list = (users || []).filter((u) => filter === 'all' || u.status === filter);
  const counts = (users || []).reduce((a, u) => { a[u.status] = (a[u.status] || 0) + 1; return a; }, {});
  const archiveList = archive || [];

  const tab = (key, label) => React.createElement('button', { key, onClick: () => setFilter(key), style: { fontFamily: VFONT, fontSize: 13.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: filter === key ? '#0c6d7e' : '#eef3f4', color: filter === key ? '#fff' : '#5a7682' } },
    label + (key !== 'all' && counts[key] ? ' · ' + counts[key] : ''));

  return React.createElement('div', { style: { position: 'absolute', inset: 0, zIndex: 9999, background: 'rgba(5,18,26,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: VFONT, boxSizing: 'border-box' } },
    React.createElement('div', { style: { width: 760, maxWidth: '100%', maxHeight: '90%', background: '#f4f7f8', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' } },
      React.createElement('div', { style: { padding: '20px 24px', background: '#0e4257', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        React.createElement('div', null,
          React.createElement('div', { style: { fontSize: 20, fontWeight: 800 } }, 'Duyệt người dùng'),
          React.createElement('div', { style: { fontSize: 13.5, color: 'rgba(255,255,255,0.72)', marginTop: 2 } }, (users ? users.length : 0) + ' tài khoản · ' + (counts.pending || 0) + ' chờ duyệt')),
        React.createElement('button', { onClick: onClose, style: { width: 38, height: 38, borderRadius: 999, border: 'none', background: 'rgba(255,255,255,0.16)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } },
          React.createElement('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round' }, React.createElement('line', { x1: 6, y1: 6, x2: 18, y2: 18 }), React.createElement('line', { x1: 18, y1: 6, x2: 6, y2: 18 })))),
      React.createElement('div', { style: { padding: '14px 24px', display: 'flex', gap: 8, borderBottom: '1px solid #e3eaec', background: '#fff' } },
        tab('all', 'Tất cả'), tab('pending', 'Chờ duyệt'), tab('approved', 'Đã duyệt'), tab('rejected', 'Từ chối'),
        React.createElement('div', { style: { flex: 1 } }),
        React.createElement('button', { onClick: () => setFilter('archive'), style: { fontFamily: VFONT, fontSize: 13.5, fontWeight: 700, padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: filter === 'archive' ? '#5a3a4a' : '#f1e6ea', color: filter === 'archive' ? '#fff' : '#a05a72' } }, 'Kho từ chối' + (archiveList.length ? ' · ' + archiveList.length : ''))),
      React.createElement('div', { style: { padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 } },
        filter === 'archive'
          ? (archive === null
              ? React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#8aa0a8', fontWeight: 600 } }, 'Đang tải kho…')
              : archiveList.length === 0
                ? React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#8aa0a8', fontWeight: 600 } }, 'Chưa có email từ chối nào được lưu.')
                : [React.createElement('div', { key: '_hint', style: { fontSize: 12.5, color: '#9bb0b8', fontWeight: 600, padding: '0 4px 2px', lineHeight: 1.5 } }, 'Email đã từng bị từ chối — lưu độc lập, giữ lại kể cả khi đã xoá tài khoản.')].concat(
                    archiveList.map((a) => React.createElement('div', { key: a.id, style: { background: '#fff', border: '1px solid #e6edef', borderRadius: 13, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 } },
                      React.createElement(Avatar, { name: a.displayName || a.email, photo: a.photoURL, size: 38 }),
                      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                        React.createElement('div', { style: { fontSize: 15, fontWeight: 800, color: '#13303c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, a.email),
                        a.displayName ? React.createElement('div', { style: { fontSize: 13, color: '#7d949d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 } }, a.displayName) : null),
                      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: STATUS_META.rejected.bg, color: STATUS_META.rejected.color, fontSize: 12.5, fontWeight: 800, flexShrink: 0 } },
                        React.createElement('span', { style: { width: 7, height: 7, borderRadius: 999, background: STATUS_META.rejected.color } }), 'Từ chối'),
                      React.createElement('button', { onClick: () => removeArchive(a.id, a.email), title: 'Xoá khỏi kho', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 9, border: '1px solid #f0dad6', background: '#fff', color: '#c0504d', cursor: 'pointer', flexShrink: 0 } },
                        React.createElement('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('polyline', { points: '3 6 5 6 21 6' }), React.createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }), React.createElement('line', { x1: 10, y1: 11, x2: 10, y2: 17 }), React.createElement('line', { x1: 14, y1: 11, x2: 14, y2: 17 }))))))
            )
          : users === null
            ? React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#8aa0a8', fontWeight: 600 } }, 'Đang tải danh sách…')
            : list.length === 0
              ? React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#8aa0a8', fontWeight: 600 } }, 'Không có tài khoản nào.')
              : list.map((u) => React.createElement(AdminRow, { key: u.uid, u, isSelf: u.uid === meUid, patch, reject, remove }))
      )));
}

function AdminRow({ u, isSelf, patch, reject, remove }) {
  const sm = STATUS_META[u.status] || STATUS_META.pending;
  const roleBtn = (key, label) => React.createElement('button', {
    key, disabled: u.isAdmin, onClick: () => patch(u.uid, { role: key }),
    style: { fontFamily: VFONT, fontSize: 12.5, fontWeight: 700, padding: '6px 11px', borderRadius: 8, cursor: u.isAdmin ? 'default' : 'pointer', border: '1px solid ' + (u.role === key ? '#0c6d7e' : '#d4dde2'), background: u.role === key ? '#0c6d7e' : '#fff', color: u.role === key ? '#fff' : '#5a7682', opacity: u.isAdmin ? 0.5 : 1 }
  }, label);
  const actBtn = (label, onClick, kind) => React.createElement('button', { onClick, style: { fontFamily: VFONT, fontSize: 13, fontWeight: 700, padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', background: kind === 'approve' ? '#0c6d7e' : kind === 'reject' ? '#f3e2e0' : '#eef3f4', color: kind === 'approve' ? '#fff' : kind === 'reject' ? '#c0504d' : '#5a7682' } }, label);

  return React.createElement('div', { style: { background: '#fff', border: '1px solid #e6edef', borderRadius: 13, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
      React.createElement(Avatar, { name: u.displayName, photo: u.photoURL, size: 42 }),
      React.createElement('div', { style: { flex: 1, minWidth: 0 } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          React.createElement('span', { style: { fontSize: 15.5, fontWeight: 800, color: '#13303c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, u.displayName || u.email),
          u.isAdmin ? React.createElement('span', { style: { fontSize: 11, fontWeight: 800, color: '#b4632a', background: '#fbeadd', padding: '2px 8px', borderRadius: 999 } }, 'ADMIN') : null,
          u.mock ? React.createElement('span', { style: { fontSize: 11, fontWeight: 700, color: '#8aa0a8', background: '#eef3f4', padding: '2px 8px', borderRadius: 999 } }, 'thử') : null),
        React.createElement('div', { style: { fontSize: 13, color: '#7d949d', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 } }, u.email)),
      React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, background: sm.bg, color: sm.color, fontSize: 12.5, fontWeight: 800, flexShrink: 0 } },
        React.createElement('span', { style: { width: 7, height: 7, borderRadius: 999, background: sm.color } }), sm.label)),
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 7 } },
        React.createElement('span', { style: { fontSize: 11.5, fontWeight: 700, color: '#9bb0b8', letterSpacing: '0.04em', textTransform: 'uppercase' } }, 'Quyền'),
        roleBtn('viewer', 'Xem'), roleBtn('editor', 'Xem + Kịch bản')),
      React.createElement('div', { style: { flex: 1 } }),
      isSelf
        ? React.createElement('span', { style: { fontSize: 12.5, color: '#9bb0b8', fontWeight: 600 } }, 'Tài khoản của bạn')
        : React.createElement('div', { style: { display: 'flex', gap: 8 } },
            u.status !== 'approved' ? actBtn('Duyệt', () => patch(u.uid, { status: 'approved' }), 'approve') : null,
            u.status !== 'rejected' ? actBtn('Từ chối', () => reject(u), 'reject') : null,
            u.status === 'approved' ? actBtn('Thu hồi', () => patch(u.uid, { status: 'pending' }), 'neutral') : null,
            u.status === 'rejected' ? actBtn('Mở lại', () => patch(u.uid, { status: 'pending' }), 'neutral') : null,
            React.createElement('button', { onClick: () => remove(u.uid, u.displayName || u.email), title: 'Xoá tài khoản', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 9, border: '1px solid #f0dad6', background: '#fff', color: '#c0504d', cursor: 'pointer', flexShrink: 0 } },
              React.createElement('svg', { width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('polyline', { points: '3 6 5 6 21 6' }), React.createElement('path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }), React.createElement('line', { x1: 10, y1: 11, x2: 10, y2: 17 }), React.createElement('line', { x1: 14, y1: 11, x2: 14, y2: 17 }))))));
}

// ── style tokens dùng chung cho lớp auth ─────────────────────────────────────
const cardStyle = { width: 420, maxWidth: '100%', background: '#fff', borderRadius: 22, padding: '34px 32px', boxShadow: '0 30px 80px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', fontFamily: VFONT };
const btnGoogle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, width: '100%', height: 52, borderRadius: 12, border: '1px solid #dadfe2', background: '#fff', color: '#27343a', fontFamily: VFONT, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' };
const btnPrimary = { width: '100%', height: 48, borderRadius: 11, border: 'none', background: '#0c6d7e', color: '#fff', fontFamily: VFONT, fontSize: 15.5, fontWeight: 700, cursor: 'pointer' };
const btnGhost = { width: '100%', height: 46, borderRadius: 11, border: '1px solid #d4dde2', background: '#fff', color: '#41606b', fontFamily: VFONT, fontSize: 15, fontWeight: 700, cursor: 'pointer' };
const inputStyle2 = { width: '100%', boxSizing: 'border-box', height: 46, fontFamily: VFONT, fontSize: 15, fontWeight: 500, color: '#13303c', background: '#fff', border: '1px solid #d4dde2', borderRadius: 11, padding: '0 14px', outline: 'none' };
const errBox = { marginTop: 14, padding: '11px 14px', background: '#fdeeec', border: '1px solid #f3d4cf', borderRadius: 11, color: '#b5483c', fontFamily: VFONT, fontSize: 13, fontWeight: 600, lineHeight: 1.5 };
const menuItem = { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '13px 16px', border: 'none', background: 'transparent', color: '#3a5562', fontFamily: VFONT, fontSize: 14.5, fontWeight: 700, cursor: 'pointer', textAlign: 'left' };

window.BeachTripApp = BeachTripApp;

