import { Renderer } from '../core';
import { D3SelectionINode } from '../types';
/**
 * Centralize provided node in the SVG canvas
 *
 * FIXME: need offset multiplier depending on how nodes are drawn
 *
 * @param {string} nodeId - id
 * @param {number} duration - animation transition time in millis
 *
 * See: https://observablehq.com/@d3/programmatic-zoom
 */
export declare const moveTo: <V, E>(G: Renderer<V, E>, node: D3SelectionINode<V>, duration: number) => void;
export declare const moveToLabel: <V, E>(G: Renderer<V, E>, label: string, duration: number) => void;
