/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Key} from './update';

export type DocumentKey = string;

export type EvaluationType = 'spellcheck_error' | 'spellcheck_warning';
export type EvaluationItem = {
  key: Key;
  offset: number;
  length: number;
  type: EvaluationType;
  message: string;
  suggestion: null | string;
};
export type PartialEvaluation = {
  items: EvaluationItem[];
};
export type Evaluation = PartialEvaluation;

const rootElementDocumentKey = new Map<HTMLElement, DocumentKey>();
const documentData = new Map<
  DocumentKey,
  {
    mutationsQueue: MutationType[];
  }
>();

let isConnected = false;

export function initialize(connect: () => void, disconnect: () => void) {
  //
}

export function connect(): void {
  //
}

export function onConnect(): void {
  isConnected = true;
  flushQueue();
}

export function disconnect(): void {
  //
}

export function onDisconnect(): void {
  isConnected = false;
}

export function registerElement(domElement: HTMLElement): void {
  //
}

export function createDocument(): Promise<DocumentKey> {
  //
  return new Promise((resolve) => {
    resolve('123');
  });
}

export function dispatchMutation(
  documentKey: DocumentKey,
  mutation: MutationType,
): Promise<boolean> {
  //
}

export function subscribe(
  documentKey: DocumentKey,
  cb: (documentKey: DocumentKey, type: PartialEvaluation) => void,
): Promise<boolean> {
  //
}

export function queue(
  domElement: HTMLElement,
  mutations: MutationType[],
): void {
  // if element doesn't exist in Map; create document key and send all the chunks
}

export function flushQueue(): void {
  // for (const {mutationsQueue} of )
}
