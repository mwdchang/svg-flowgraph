import { Renderer } from '../core';

export const group = <V, E>(
  G: Renderer<V, E>,
  groupName: string,
  nodeIds: string[]
): void => {
  console.log(G, groupName, nodeIds);
};


export const ungroup = <V, E>(
  G: Renderer<V, E>,
  groupName: string
): void => {
  console.log(G, groupName);
};
