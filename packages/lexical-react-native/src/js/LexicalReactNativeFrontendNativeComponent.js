/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ViewProps} from 'react-native/Libraries/Components/View/ViewPropTypes';
import type {HostComponent} from 'react-native/Libraries/Renderer/shims/ReactNativeTypes';
import type {
  DirectEventHandler,
  Int32,
} from 'react-native/Libraries/Types/CodegenTypes';

import * as React from 'react';
import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

type SelectionChangedEvent = $ReadOnly<{|
  length: Int32,
  location: Int32,
|}>;

type InsertTextEvent = $ReadOnly<{|
  text?: string,
|}>;

type NativeProps = $ReadOnly<{|
  ...ViewProps,
  onInsertTextHandler?: DirectEventHandler<InsertTextEvent>,
  onSelectionChangedHandler?: DirectEventHandler<SelectionChangedEvent>,
|}>;

export type MyNativeViewType = HostComponent<NativeProps>;

interface NativeCommands {
  +deleteText: (
    viewRef: React.ElementRef<MyNativeViewType>,
    location: Int32,
    length: Int32,
  ) => void;
  +endEditing: (viewRef: React.ElementRef<MyNativeViewType>) => void;
  +insertText: (
    viewRef: React.ElementRef<MyNativeViewType>,
    text: string,
    location: Int32,
  ) => void;
  +startEditing: (viewRef: React.ElementRef<MyNativeViewType>) => void;
}

export const Commands: NativeCommands = codegenNativeCommands<NativeCommands>({
  supportedCommands: ['insertText', 'deleteText', 'startEditing', 'endEditing'],
});

export default (codegenNativeComponent<NativeProps>(
  'LexicalReactNativeFrontend',
): MyNativeViewType);
