/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// TODO: rewrite these imports to account for the mobile reconciler not being inside the main library.
import type {LexicalEditor} from './LexicalEditor';
import type {NodeKey, NodeMap} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';

import invariant from 'shared/invariant';

import {$isElementNode, $isTextNode} from '.';
import {EditorState} from './LexicalEditorState';
import {
  $getSelection,
  $isRangeSelection,
  Point,
  PointType,
  RangeSelection,
} from './LexicalSelection';
import {getActiveEditor} from './LexicalUpdates';
import {$getNodeByKey, $setSelection} from './LexicalUtils';

export type RangeCacheItem = {
  location: number;
  preambleLength: number;
  childrenLength: number;
  textLength: number;
  postambleLength: number;
};

function entireRange(item: RangeCacheItem): Range {
  return {
    length:
      item.preambleLength +
      item.childrenLength +
      item.textLength +
      item.postambleLength,
    location: item.location,
  };
}

function textRange(item: RangeCacheItem): Range {
  return {
    length: item.textLength,
    location: item.location + item.preambleLength + item.childrenLength,
  };
}

type RangeCacheSearchResult = {
  nodeKey: NodeKey;
  type: RangeCacheSearchResultType;
  offset: number;
};

type RangeCacheSearchResultType =
  | 'startBoundary'
  | 'endBoundary'
  | 'text'
  | 'element'
  | 'illegal';

export type Range = {
  location: number;
  length: number;
};

function rangeByAddingOne(range: Range): Range {
  return {length: range.length + 1, location: range.location};
}

function rangeContains(range: Range, comparisonLocation: number): boolean {
  return (
    range.location <= comparisonLocation &&
    range.location + range.length >= comparisonLocation
  );
}

export function pointAtStringLocation(
  location: number,
  rangeCache: Map<NodeKey, RangeCacheItem>,
): Point | undefined {
  const searchResult = evaluateNode('root', location, rangeCache);
  if (searchResult == null || searchResult.offset == null) {
    return undefined;
  }

  switch (searchResult.type) {
    case 'startBoundary':
    case 'endBoundary':
    case 'illegal':
      return undefined;
    case 'text':
      return new Point(searchResult.nodeKey, searchResult.offset, 'text');
    case 'element':
      return new Point(searchResult.nodeKey, searchResult.offset, 'element');
  }
}

function evaluateNode(
  nodeKey: NodeKey,
  stringLocation: number,
  rangeCache: Map<NodeKey, RangeCacheItem>,
): RangeCacheSearchResult | null {
  const rangeCacheItem: RangeCacheItem? = rangeCache.get(nodeKey);
  const node = $getNodeByKey(nodeKey);
  if (rangeCacheItem === null || node === null) {
    return null;
  }

  if (
    !rangeContains(
      rangeByAddingOne(entireRange(rangeCacheItem)),
      stringLocation,
    )
  ) {
    return null;
  }

  if ($isTextNode(node)) {
    const expandedTextRange = rangeByAddingOne(textRange(rangeCacheItem));
    if (rangeContains(expandedTextRange, stringLocation)) {
      return {
        nodeKey: nodeKey,
        offset: stringLocation - expandedTextRange.location,
        type: 'text',
      };
    }
  }

  if ($isElementNode(node)) {
    // TODO: add searching fwd/bkwd
    const childrenArray = node.getChildrenKeys();

    let possibleBoundaryElementResult: RangeCacheSearchResult | null = null;
    for (const childKey of childrenArray) {
      const result = evaluateNode(childKey, stringLocation, rangeCache);
      if (result === null || result === undefined) {
        continue;
      }
      if (result.type === 'text' || result.type === 'element') {
        return result;
      }
      const childIndex = node.getChildrenKeys().indexOf(childKey);
      if (childIndex < 0) {
        continue;
      }
      if (result.type === 'startBoundary') {
        possibleBoundaryElementResult = {
          nodeKey: nodeKey,
          offset: childIndex,
          type: 'element',
        };
      }
      if (result.type === 'endBoundary') {
        possibleBoundaryElementResult = {
          nodeKey: nodeKey,
          offset: childIndex + 1,
          type: 'element',
        };
      }
    }
    if (possibleBoundaryElementResult != null) {
      return possibleBoundaryElementResult;
    }
  }

  if (entireRange(rangeCacheItem).length === 0) {
    if (stringLocation === rangeCacheItem.location) {
      return {nodeKey: nodeKey, offset: 0, type: 'element'};
    }

    return {nodeKey: nodeKey, offset: 0, type: 'startBoundary'};
  }

  if (stringLocation === rangeCacheItem.location) {
    if (rangeCacheItem.preambleLength === 0 && $isElementNode(node)) {
      return {nodeKey: nodeKey, offset: 0, type: 'element'};
    }

    return {nodeKey: nodeKey, offset: 0, type: 'startBoundary'};
  }

  if (
    stringLocation ===
    rangeCacheItem.location + entireRange(rangeCacheItem).length
  ) {
    // TODO: check this for an offbyone
    return {nodeKey: nodeKey, offset: 0, type: 'endBoundary'};
  }

  return {nodeKey: nodeKey, offset: 0, type: 'illegal'};
}

export function updateRangeCacheForTextChange(nodeKey: NodeKey, delta: number) {
  const editor = getActiveEditor();
  const node = $getNodeByKey(nodeKey);
  // invariant($isTextNode(node));
  if (!$isTextNode(node)) {
    return;
  }

  const rangeCache = editor.getRangeCache();
  const rangeCacheItem = rangeCache.get(nodeKey);
  if (rangeCacheItem === null) {
    return;
  }
  // invariant(rangeCacheItem != undefined);
  rangeCacheItem.textLength = node.getTextPart().length;
  rangeCache.set(nodeKey, rangeCacheItem);

  const parentKeys = node.getParentKeys();
  for (const parentKey of parentKeys) {
    const parentRCItem = rangeCache.get(parentKey);
    if (parentRCItem === undefined) {
      continue;
    }
    //     invariant(rangeCacheItem != undefined);
    parentRCItem.childrenLength += delta;
    rangeCache.set(parentKey, parentRCItem);
  }

  updateNodeLocationFor('root', false, nodeKey, parentKeys, delta);
}

function updateNodeLocationFor(
  nodeKey: NodeKey,
  nodeIsAfterChangedNode: boolean,
  changedNodeKey: NodeKey,
  changedNodeParents: Array<NodeKey>,
  delta: number,
) {
  const editor = getActiveEditor();
  const rangeCache: Map<NodeKey, RangeCacheItem> = editor.getRangeCache();

  if (nodeIsAfterChangedNode) {
    const rangeCacheItem = rangeCache.get(nodeKey);
    if (rangeCacheItem === undefined) {
      continue;
    }
    rangeCacheItem.location += delta;
    rangeCache.set(nodeKey, rangeCacheItem);
  }

  let isAfter = nodeIsAfterChangedNode;

  const elementNode = $getNodeByKey(nodeKey);
  // invariant(elementNode != null);
  if (elementNode === null) {
    return;
  }
  if (
    $isElementNode(elementNode) &&
    (isAfter || changedNodeParents.includes(nodeKey))
  ) {
    for (const child of elementNode.getChildrenKeys()) {
      updateNodeLocationFor(
        child,
        isAfter,
        changedNodeKey,
        changedNodeParents,
        delta,
      );
      if (child === changedNodeKey || changedNodeParents.includes(child)) {
        isAfter = true;
      }
    }
  }
}

function i_createPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
): PointType {
  // @ts-expect-error: intentionally cast as we use a class for perf reasons
  return new Point(key, offset, type);
}

export function applyNativeSelection(range: Range, editor: LexicalEditor) {
  //     const selection = $getSelection();
  const rangeCache = editor.getRangeCache();

  const anchorOffset = pointAtStringLocation(range.location, rangeCache);
  const focusOffset = pointAtStringLocation(
    range.location + range.length,
    rangeCache,
  );

  if (anchorOffset === undefined || focusOffset === undefined) {
    return;
  }

  const anchor = i_createPoint(
    anchorOffset.key,
    anchorOffset.offset,
    anchorOffset.type,
  );
  const focus = i_createPoint(
    focusOffset.key,
    focusOffset.offset,
    focusOffset.type,
  );

  // TODO: @amyworrall Decide if we should always re-create selection here.
  // if (!$isRangeSelection(selection)) {
  const newSelection = new RangeSelection(anchor, focus, 0);
  $setSelection(newSelection);

  const testSelection = $getSelection();
  if (testSelection == null || !$isRangeSelection(testSelection)) {
    return;
  }
  // } else {
  //   selection.anchor.set(anchor.key, anchor.offset, anchor.type);
  //   selection.focus.set(focus.key, focus.offset, focus.type);
  // }
}

type NodePart = 'preamble' | 'text' | 'postamble';

type ReconcilerInsertion = {
  location: number;
  nodeKey: NodeKey;
  part: NodePart;
};

type IntentionallyMarkedAsDirtyElement = boolean;

export type ReconcilerState = {
  prevEditorState: EditorState;
  nextEditorState: EditorState;
  prevRangeCache: Map<NodeKey, RangeCacheItem>;
  nextRangeCache: Map<NodeKey, RangeCacheItem>;
  locationCursor: number;
  rangesToDelete: Array<Range>;
  rangesToAdd: Array<ReconcilerInsertion>;
  dirtyLeaves: Set<NodeKey>;
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
};

export type FrontendStartEditing = () => void;
export type FrontendEndEditing = () => void;
export type FrontendInsert = (string: string, location: number) => void;
export type FrontendDelete = (location: number, length: number) => void;

export type FrontendCommunication = {
  startEditing: FrontendStartEditing;
  endEditing: FrontendEndEditing;
  insert: FrontendInsert;
  delete: FrontendDelete;
};

// // Reconciler entry point
export function updateEditorState(
  currentEditorState: EditorState,
  pendingEditorState: EditorState,
  editor: LexicalEditor,
  frontendCommunication: FrontendCommunication,
) {
  const reconcilerState: ReconcilerState = {
    dirtyElements: editor._dirtyElements,
    dirtyLeaves: editor._dirtyLeaves,
    locationCursor: 0,
    nextEditorState: pendingEditorState,
    nextRangeCache: new Map(editor.getRangeCache()),
    prevEditorState: currentEditorState,
    prevRangeCache: editor.getRangeCache(),
    rangesToAdd: [],
    rangesToDelete: [],
  };

  reconcileNode('root', reconcilerState);

  frontendCommunication.startEditing();

  for (const deletionRange of reconcilerState.rangesToDelete.reverse()) {
    if (deletionRange.length > 0) {
      frontendCommunication.delete(
        deletionRange.location,
        deletionRange.length,
      );
    }
  }

  for (const insertion of reconcilerState.rangesToAdd) {
    const string = stringFromInsertion(
      insertion,
      reconcilerState.nextEditorState,
    );
    if (string.length > 0) {
      frontendCommunication.insert(string, insertion.location);
    }
  }

  editor.setRangeCache(reconcilerState.nextRangeCache);
  frontendCommunication.endEditing();
}

function reconcileNode(key: NodeKey, reconcilerState: ReconcilerState) {
  const prevNode = reconcilerState.prevEditorState._nodeMap.get(key);
  const nextNode = reconcilerState.nextEditorState._nodeMap.get(key);
  const prevRange = reconcilerState.prevRangeCache.get(key);

  if (
    prevNode === undefined ||
    nextNode === undefined ||
    prevRange === undefined
  ) {
    return;
  }
  //   invariant(prevNode != undefined && nextNode != undefined && prevRange != undefined);

  //   // TODO: handle treat all nodes as dirty
  const isDirty =
    reconcilerState.dirtyElements.get(key) !== undefined ||
    reconcilerState.dirtyLeaves.has(key);

  if (prevNode === nextNode && !isDirty) {
    if (prevRange.location !== reconcilerState.locationCursor) {
      updateLocationOfNonDirtyNode(key, reconcilerState);
    } else {
      reconcilerState.locationCursor +=
        prevRange.preambleLength +
        prevRange.textLength +
        prevRange.childrenLength +
        prevRange.postambleLength;
    }
    return;
  }

  const nextRangeCacheItem: RangeCacheItem = {
    childrenLength: 0,
    location: reconcilerState.locationCursor,
    postambleLength: 0,
    preambleLength: 0,
    textLength: 0,
  };

  const nextPreambleLength = nextNode.getPreamble().length;
  createAddRemoveRanges(
    key,
    prevRange.location,
    prevRange.preambleLength,
    nextPreambleLength,
    reconcilerState,
    'preamble',
  );
  nextRangeCacheItem.preambleLength = nextPreambleLength;

  // right, now we have finished the preamble, and the cursor is in the right place. Time for children.
  if ($isElementNode(nextNode)) {
    const cursorBeforeChildren = reconcilerState.locationCursor;
    reconcileChildren(key, reconcilerState);
    nextRangeCacheItem.childrenLength =
      reconcilerState.locationCursor - cursorBeforeChildren;
  }

  const nextTextLength = nextNode.getTextPart().length;
  createAddRemoveRanges(
    key,
    prevRange.location + prevRange.preambleLength + prevRange.childrenLength,
    prevRange.textLength,
    nextTextLength,
    reconcilerState,
    'text',
  );
  nextRangeCacheItem.textLength = nextTextLength;

  const nextPostambleLength = nextNode.getPostamble().length;
  createAddRemoveRanges(
    key,
    prevRange.location +
      prevRange.preambleLength +
      prevRange.childrenLength +
      prevRange.textLength,
    prevRange.postambleLength,
    nextPostambleLength,
    reconcilerState,
    'postamble',
  );
  nextRangeCacheItem.postambleLength = nextPostambleLength;

  reconcilerState.nextRangeCache.set(key, nextRangeCacheItem);
}

// // original iOS: attributedStringFromInsertion, and it had Theme as a param
function stringFromInsertion(
  insertion: ReconcilerInsertion,
  state: EditorState,
): string {
  const node = state._nodeMap.get(insertion.nodeKey);
  // invariant(node != undefined);
  if (node === undefined) {
    return '';
  }
  switch (insertion.part) {
    case 'preamble':
      return node.getPreamble();
    case 'text':
      return node.getTextPart();
    case 'postamble':
      return node.getPostamble();
  }
  return '';
}

function updateLocationOfNonDirtyNode(
  key: NodeKey,
  reconcilerState: ReconcilerState,
) {
  const prevRangeCacheItem = reconcilerState.prevRangeCache.get(key);
  if (prevRangeCacheItem === undefined) {
    return;
  }
  //   invariant(prevRangeCacheItem != null);
  const nextRangeCacheItem: RangeCacheItem = {
    childrenLength: prevRangeCacheItem.childrenLength,
    location: prevRangeCacheItem.location,
    postambleLength: prevRangeCacheItem.postambleLength,
    preambleLength: prevRangeCacheItem.preambleLength,
    textLength: prevRangeCacheItem.textLength,
  };

  nextRangeCacheItem.location = reconcilerState.locationCursor;
  reconcilerState.nextRangeCache.set(key, nextRangeCacheItem);
  const nextNode = reconcilerState.nextEditorState._nodeMap.get(key);
  if (nextNode == null) {
    return;
  }
  //   invariant (nextNode != null);

  reconcilerState.locationCursor += nextRangeCacheItem.preambleLength;
  if ($isElementNode(nextNode)) {
    for (const childNodeKey of nextNode.getChildrenKeys()) {
      updateLocationOfNonDirtyNode(childNodeKey, reconcilerState);
    }
  }

  reconcilerState.locationCursor += nextRangeCacheItem.textLength;
  reconcilerState.locationCursor += nextRangeCacheItem.postambleLength;
}

function createAddRemoveRanges(
  key: NodeKey,
  prevLocation: number,
  prevLength: number,
  nextLength: number,
  reconcilerState: ReconcilerState,
  part: NodePart,
) {
  if (prevLength > 0) {
    const prevRange: Range = {length: prevLength, location: prevLocation};
    reconcilerState.rangesToDelete.push(prevRange);
  }
  if (nextLength > 0) {
    const insertion: ReconcilerInsertion = {
      location: reconcilerState.locationCursor,
      nodeKey: key,
      part: part,
    };
    reconcilerState.rangesToAdd.push(insertion);
  }
  reconcilerState.locationCursor += nextLength;
}

// copied from main reconciler
function createChildrenArray(
  element: ElementNode,
  nodeMap: NodeMap,
): Array<NodeKey> {
  const children = [];
  let nodeKey = element.__first;
  while (nodeKey !== null) {
    const node = nodeMap.get(nodeKey);
    if (node === undefined) {
      invariant(false, 'createChildrenArray: node does not exist in nodeMap');
    }
    children.push(nodeKey);
    nodeKey = node.__next;
  }
  return children;
}

function reconcileChildren(key: NodeKey, reconcilerState: ReconcilerState) {
  const prevNode = reconcilerState.prevEditorState._nodeMap.get(key);
  const nextNode = reconcilerState.nextEditorState._nodeMap.get(key);
  if (!$isElementNode(prevNode) || !$isElementNode(nextNode)) {
    return;
  }
  //   invariant($isElementNode(prevNode) && $isElementNode(nextNode));

  const prevChildren = createChildrenArray(
    prevNode,
    reconcilerState.prevEditorState._nodeMap,
  );
  const nextChildren = createChildrenArray(
    nextNode,
    reconcilerState.nextEditorState._nodeMap,
  );

  reconcileNodeChildren(
    prevChildren,
    nextChildren,
    prevChildren.length,
    nextChildren.length,
    reconcilerState,
  );
}

function reconcileNodeChildren(
  prevChildren: Array<NodeKey>,
  nextChildren: Array<NodeKey>,
  prevChildrenLength: number,
  nextChildrenLength: number,
  reconcilerState: ReconcilerState,
) {
  const prevEndIndex = prevChildrenLength - 1;
  const nextEndIndex = nextChildrenLength - 1;
  let prevIndex = 0;
  let nextIndex = 0;

  let prevChildrenSet: Set<NodeKey> | undefined;
  let nextChildrenSet: Set<NodeKey> | undefined;

  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex];
    const nextKey = nextChildren[nextIndex];

    if (prevKey === nextKey) {
      reconcileNode(nextKey, reconcilerState);
      prevIndex++;
      nextIndex++;
    } else {
      if (prevChildrenSet === undefined) {
        prevChildrenSet = new Set(prevChildren);
      }
      if (nextChildrenSet === undefined) {
        nextChildrenSet = new Set(nextChildren);
      }

      const nextHasPrevKey = nextChildren.includes(prevKey);
      const prevHasNextKey = prevChildren.includes(nextKey);

      if (!nextHasPrevKey) {
        // remove prev
        destroyNode(prevKey, reconcilerState);
        prevIndex++;
      } else if (!prevHasNextKey) {
        createNode(nextKey, reconcilerState);
        nextIndex++;
      } else {
        // Move next -- destroy old and then insert new. (The counterpart will occur later in the loop!)
        destroyNode(prevKey, reconcilerState);
        createNode(nextKey, reconcilerState);
        prevIndex++;
        nextIndex++;
      }
    }
  }

  const appendNewChildren: boolean = prevIndex > prevEndIndex;
  const removeOldChildren: boolean = nextIndex > nextEndIndex;

  if (appendNewChildren && !removeOldChildren) {
    createChildren(nextChildren, nextIndex, nextEndIndex, reconcilerState);
  } else if (removeOldChildren && !appendNewChildren) {
    destroyChildren(prevChildren, prevIndex, prevEndIndex, reconcilerState);
  }
}

function destroyNode(key: NodeKey, reconcilerState: ReconcilerState) {
  const prevNode = reconcilerState.prevEditorState._nodeMap.get(key);
  const prevRangeCacheItem = reconcilerState.prevRangeCache.get(key);
  //   invariant(prevNode != null && prevRangeCacheItem != null);
  if (prevNode === undefined || prevRangeCacheItem === undefined) {
    return;
  }

  const prevPreambleRange: Range = {
    length: prevRangeCacheItem.preambleLength,
    location: prevRangeCacheItem.location,
  };
  reconcilerState.rangesToDelete.push(prevPreambleRange);

  if ($isElementNode(prevNode)) {
    const childrenArray = createChildrenArray(
      prevNode,
      reconcilerState.prevEditorState._nodeMap,
    );
    if (childrenArray.length > 0) {
      destroyChildren(
        childrenArray,
        0,
        childrenArray.length - 1,
        reconcilerState,
      );
    }
  }

  const prevTextRange: Range = {
    length: prevRangeCacheItem.textLength,
    location:
      prevRangeCacheItem.location +
      prevRangeCacheItem.preambleLength +
      prevRangeCacheItem.childrenLength,
  };
  reconcilerState.rangesToDelete.push(prevTextRange);

  const prevPostambleRange: Range = {
    length: prevRangeCacheItem.postambleLength,
    location:
      prevRangeCacheItem.location +
      prevRangeCacheItem.preambleLength +
      prevRangeCacheItem.childrenLength +
      prevRangeCacheItem.textLength,
  };
  reconcilerState.rangesToDelete.push(prevPostambleRange);

  if (reconcilerState.nextEditorState._nodeMap.get(key) == null) {
    reconcilerState.nextRangeCache.delete(key);
  }
}

function createNode(key: NodeKey, reconcilerState: ReconcilerState) {
  const nextNode = reconcilerState.nextEditorState._nodeMap.get(key);
  //   invariant(nextNode != null);
  if (nextNode === undefined) {
    return;
  }

  const nextRangeCacheItem: RangeCacheItem = {
    childrenLength: 0,
    location: reconcilerState.locationCursor,
    postambleLength: 0,
    preambleLength: 0,
    textLength: 0,
  };

  const nextPreambleLength = nextNode.getPreamble().length;
  const preambleInsertion: ReconcilerInsertion = {
    location: reconcilerState.locationCursor,
    nodeKey: key,
    part: 'preamble',
  };
  reconcilerState.rangesToAdd.push(preambleInsertion);
  reconcilerState.locationCursor += nextPreambleLength;
  nextRangeCacheItem.preambleLength = nextPreambleLength;

  if ($isElementNode(nextNode) && nextNode.getChildrenSize() > 0) {
    const cursorBeforeChildren = reconcilerState.locationCursor;
    // TODO: use createChildrenArray
    createChildren(
      nextNode.getChildrenKeys(),
      0,
      nextNode.getChildrenSize() - 1,
      reconcilerState,
    );
    nextRangeCacheItem.childrenLength =
      reconcilerState.locationCursor - cursorBeforeChildren;
  }

  const nextTextLength = nextNode.getTextPart().length;
  const textInsertion: ReconcilerInsertion = {
    location: reconcilerState.locationCursor,
    nodeKey: key,
    part: 'text',
  };
  reconcilerState.rangesToAdd.push(textInsertion);
  reconcilerState.locationCursor += nextTextLength;
  nextRangeCacheItem.textLength = nextTextLength;

  const nextPostambleLength = nextNode.getPostamble().length;
  const postambleInsertion: ReconcilerInsertion = {
    location: reconcilerState.locationCursor,
    nodeKey: key,
    part: 'postamble',
  };
  reconcilerState.rangesToAdd.push(postambleInsertion);
  reconcilerState.locationCursor += nextPostambleLength;
  nextRangeCacheItem.postambleLength = nextPostambleLength;

  reconcilerState.nextRangeCache.set(key, nextRangeCacheItem);
}

function createChildren(
  children: Array<NodeKey>,
  startIndex: number,
  endIndex: number,
  reconcilerState: ReconcilerState,
) {
  for (let i = startIndex; i <= endIndex; i++) {
    const child = children[i];
    createNode(child, reconcilerState);
  }
}

function destroyChildren(
  children: Array<NodeKey>,
  startIndex: number,
  endIndex: number,
  reconcilerState: ReconcilerState,
) {
  for (let i = startIndex; i <= endIndex; i++) {
    const child = children[i];
    destroyNode(child, reconcilerState);
  }
}
