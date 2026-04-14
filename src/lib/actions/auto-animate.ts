/**
 * Svelte action wrapper for @formkit/auto-animate.
 *
 * auto-animate's AnimationController doesn't declare `update`/`destroy`
 * so TypeScript rejects it as a Svelte Action. This cast is the recommended
 * workaround until the upstream type is fixed.
 *
 * Usage:
 *   import { autoAnimate } from '$lib/actions/auto-animate';
 *   <ul use:autoAnimate> ... </ul>
 */
import _autoAnimate from '@formkit/auto-animate';
import type { Action } from 'svelte/action';

export const autoAnimate = _autoAnimate as unknown as Action;
