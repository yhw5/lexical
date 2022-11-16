/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export type Key = string;
export type Chunk = {
  key: Key;
  data: string;
  properties: {
    display: 'inline' | 'block';
  };
};
export type DoublyChunk = {
  key: Key;
  next: null | Chunk;
  previous: null | Chunk;
  value: Chunk;
};

const keyDoublyChunk = new Map<Key, DoublyChunk>();
const domTextNodeDoublyChunk = new Map<Text, DoublyChunk>();
const rootElementFirstChunk = new Map<HTMLElement, null | DoublyChunk>();

let nextKey = 1;
function generateKey(): Key {
  return String(nextKey++);
}

export function update(domRecord: MutationRecord): void {}

export function getFirstChunk(rootElement: HTMLElement): null | DoublyChunk {
  //
}
