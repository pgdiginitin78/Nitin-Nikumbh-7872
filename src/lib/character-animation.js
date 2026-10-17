import { AnimationClip, MathUtils } from 'three';

export function typingClip(clip) {
  return new AnimationClip(
    'typing_limbs',
    clip.duration,
    clip.tracks.filter((track) =>
      /^(thigh|shin|foot|forearm|hand|f_|palm|thumb|upper_arm|toe|heel)/.test(track.name)
    )
  );
}

export function eyebrowClip(clip) {
  return new AnimationClip(
    'brow_expression',
    clip.duration,
    clip.tracks.filter((track) => /^eyebrow_[LR]\./.test(track.name))
  );
}

export function damp(current, target, delta) {
  return MathUtils.lerp(current, target, 1 - Math.exp(-5 * delta));
}

export function pointerTarget(x, y, width, height) {
  return {
    x: MathUtils.clamp((x / Math.max(width, 1)) * 2 - 1, -1, 1),
    y: MathUtils.clamp((y / Math.max(height, 1)) * 2 - 1, -1, 1),
  };
}
