/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Eventually this will be the user facing entry point for Lexical RN, being a
// wrapper around the communication between the Editor and Frontend. For now it contiains
// demo/debug code. @amyworrall

import { $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  applyNativeSelection,
createEditor,
} from 'lexical';
import React, {useCallback, useEffect,useRef, useState} from 'react';
import {Text, TouchableOpacity, View} from 'react-native';

import LexicalReactNativeFrontend, {Commands} from './LexicalReactNativeFrontendNativeComponent';

const LexicalReactNative = () => {
  const inputRef = useRef<React.ElementRef<RNLexicalNativeFrontend> | null>();

  const [editor, setEditor] = useState(null);

  const editText = useCallback(() => {
    editor.update(() => {
      const root = $getRoot();
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode('Hello world');
      paragraphNode.append(textNode);
      root.append(paragraphNode);
    });
  }, [editor]);

  const editText2 = useCallback(() => {
    // Commands.replaceText(inputRef.curent, 'Replace')
    editor.update(() => {
      const root = $getRoot();
      root.clear();
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode('Bye');
      paragraphNode.append(textNode);
      root.append(paragraphNode);
    });
  }, [editor]);

  const onSelectionChange = useCallback(
    (event) => {
      const selectionRange: Range = {
        length: event.nativeEvent.length,
        location: event.nativeEvent.location,
      };
      editor.update(() => {
        applyNativeSelection(selectionRange, editor);
      });
    },
    [editor],
  );

  const onInsertText = useCallback(
    (event) => {
      editor.update(() => {
        let selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          applyNativeSelection({length: 0, location: 0}, editor);
          selection = $getSelection();
        }
        selection.insertText(event.nativeEvent.text);
      });
    },
    [editor],
  );

  useEffect(() => {
    const config = {
      frontendCommunication: {
        delete: (location: number, length: number) => {
          Commands.deleteText(inputRef.current, location, length);
        },
        endEditing: () => {
          Commands.endEditing(inputRef.current);
        },
        insert: (string: string, location: number) => {
          Commands.insertText(inputRef.current, string, location);
        },
        startEditing: () => {
          Commands.startEditing(inputRef.current);
        },
      },
      namespace: 'MyEditor',
      theme: {},
    };

    const e = createEditor(config);
    setEditor(e);
  }, []);

  return (
    <View>
      <View style={{height: 300, width: '100%'}} />
      <LexicalReactNativeFrontend
        ref={inputRef}
        onSelectionChangedHandler={onSelectionChange}
        onInsertTextHandler={onInsertText}
        style={{height: 200, width: '100%'}}
      />
      <TouchableOpacity onPress={editText}>
        <Text>Append "Hello World"</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={editText2}>
        <Text>Replace all text with "Bye"</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LexicalReactNative;
