<script setup lang="ts">
/**
 * Decorative moving layer behind the site content (sparkles, music notes or bubbles),
 * tinted with the accent colour. Purely visual: hidden from screen readers, never clickable,
 * and frozen for visitors who ask for reduced motion.
 */
import type { BgEffect } from '~/utils/site'

const props = defineProps<{ effect: BgEffect }>()

const COUNTS: Record<Exclude<BgEffect, 'none'>, number> = { sparkle: 30, notes: 16, bubbles: 18 }
const NOTES = ['♪', '♫', '♬', '♩']

/** fixed pseudo-random sequence, so the layout doesn't reshuffle on every visit */
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

const items = computed(() => {
  if (props.effect === 'none') return []
  return Array.from({ length: COUNTS[props.effect] }, (_, i) => {
    const r = (k: number) => rand(i * 7 + k)
    return {
      i,
      glyph: props.effect === 'sparkle' ? '✦' : props.effect === 'notes' ? NOTES[i % NOTES.length] : '',
      style: {
        '--x': `${(r(1) * 100).toFixed(2)}%`,
        '--y': `${(r(2) * 100).toFixed(2)}%`,
        '--s': (0.55 + r(3) * 0.9).toFixed(2),
        '--d': `${(props.effect === 'sparkle' ? 2.5 + r(4) * 3.5 : 14 + r(4) * 14).toFixed(2)}s`,
        // negative delay: start mid-animation so the screen isn't empty at first
        '--delay': `${(-r(5) * 28).toFixed(2)}s`,
        '--sway': `${((r(6) - 0.5) * 80).toFixed(0)}px`,
      },
    }
  })
})
</script>

<template>
  <div v-if="effect !== 'none'" class="gh-fx" :class="`fx-${effect}`" aria-hidden="true">
    <i v-for="it in items" :key="`${effect}-${it.i}`" :style="it.style">{{ it.glyph }}</i>
  </div>
</template>

<style scoped>
.gh-fx {
  position: fixed;
  inset: 0;
  /* .mh-site isolates its stacking context, so -1 sits above the site background but under everything else */
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}
.gh-fx i {
  position: absolute;
  left: var(--x);
  font-style: normal;
  line-height: 1;
  animation-duration: var(--d);
  animation-delay: var(--delay);
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

/* sparkle: stars that twinkle in place */
.fx-sparkle i {
  top: var(--y);
  font-size: calc(22px * var(--s));
  color: color-mix(in srgb, var(--accent) 80%, #fff);
  text-shadow: 0 0 6px color-mix(in srgb, var(--accent) 60%, #fff), 0 0 16px #fff;
  animation-name: fx-twinkle;
  animation-timing-function: ease-in-out;
}
@keyframes fx-twinkle {
  0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
  50% { opacity: 0.95; transform: scale(1) rotate(45deg); }
}

/* notes: drift up from the bottom, swaying a little */
.fx-notes i {
  bottom: -40px;
  font-size: calc(26px * var(--s));
  color: color-mix(in srgb, var(--accent) 60%, transparent);
  animation-name: fx-rise-sway;
  animation-timing-function: linear;
}

/* bubbles: soft rings rising from the bottom */
.fx-bubbles i {
  bottom: -60px;
  width: calc(42px * var(--s));
  height: calc(42px * var(--s));
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, rgb(255 255 255 / 0.8));
  background:
    radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.9) 0 8%, transparent 14%),
    radial-gradient(circle at 50% 50%, transparent 55%, color-mix(in srgb, var(--accent) 22%, transparent) 100%);
  animation-name: fx-rise-sway;
  animation-timing-function: linear;
}

@keyframes fx-rise-sway {
  0% { opacity: 0; transform: translate(0, 0) rotate(-8deg); }
  10% { opacity: 1; }
  50% { transform: translate(var(--sway), -55vh) rotate(8deg); }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translate(0, calc(-100vh - 80px)) rotate(-8deg); }
}

@media (prefers-reduced-motion: reduce) {
  .gh-fx i {
    animation: none;
    opacity: 0.6;
  }
  .fx-notes i,
  .fx-bubbles i {
    bottom: auto;
    top: var(--y);
  }
}
</style>
