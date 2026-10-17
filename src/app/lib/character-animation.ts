import { AnimationClip, MathUtils } from 'three';

export function typingClip(clip: AnimationClip) {
  return new AnimationClip(
    'typing_limbs',
    clip.duration,
    clip.tracks.filter((track) =>
      /^(thigh|shin|foot|forearm|hand|f_|palm|thumb|upper_arm|toe|heel)/.test(track.name),
    ),
  );
}

export function eyebrowClip(clip: AnimationClip) {
  return new AnimationClip(
    'brow_expression',
    clip.duration,
    clip.tracks.filter((track) => /^eyebrow_[LR]\./.test(track.name)),
  );
}

export function damp(current: number, target: number, delta: number) {
  return MathUtils.lerp(current, target, 1 - Math.exp(-5 * delta));
}

export function pointerTarget(x: number, y: number, width: number, height: number) {
  return {
    x: MathUtils.clamp((x / Math.max(width, 1)) * 2 - 1, -1, 1),
    y: MathUtils.clamp((y / Math.max(height, 1)) * 2 - 1, -1, 1),
  };
}
