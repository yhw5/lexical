/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './SlideComponent.css';

import {CheckListPlugin} from '@lexical/react/LexicalCheckListPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LinkPlugin} from '@lexical/react/LexicalLinkPlugin';
import {ListPlugin} from '@lexical/react/LexicalListPlugin';
import {MarkdownShortcutPlugin} from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {LexicalNestedComposer} from '@lexical/react/LexicalNestedComposer';
import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {$getNodeByKey, $getSelection, LexicalEditor, NodeKey} from 'lexical';
import * as React from 'react';
import {useEffect, useState} from 'react';

import CodeHighlightPlugin from '../plugins/CodeHighlightPlugin';
import CodeSandboxPlugin from '../plugins/CodeSandboxPlugin';
import ExcalidrawPlugin from '../plugins/ExcalidrawPlugin/index';
import ImagesPlugin from '../plugins/ImagesPlugin';
import {PLAYGROUND_TRANSFORMERS} from '../plugins/MarkdownTransformers';
import TreeViewPlugin from '../plugins/TreeViewPlugin';

export default function SlideComponent({
  nodeKey,
  slide: _slideName,
  content,
}: {
  nodeKey: NodeKey;
  slide: string;
  content: LexicalEditor;
}): JSX.Element {
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    setIsActive(content.getEditorState().read(() => $getSelection() !== null));
    return content.registerUpdateListener(({editorState}) => {
      setIsActive(editorState.read(() => $getSelection() !== null));
    });
  }, [content]);
  return (
    <div className="SlideComponent__slide-container">
      <div className="SlideComponent__slide">
        {isActive && (
          <div className="SlideComponent__toolbar">
            <button
              className="SlideComponent__toolbar-item"
              onClick={() => {
                const parentEditor = content._parentEditor;
                if (parentEditor === null) {
                  return;
                }
                parentEditor.update(() => {
                  const slide = $getNodeByKey(nodeKey);
                  if (slide === null) {
                    return;
                  }
                  const previousSlide = slide.getPreviousSibling();
                  if (previousSlide === null) {
                    return;
                  }
                  previousSlide.insertBefore(slide);
                });
              }}
              title="Move before">
              <i className="icon slide-up" />
            </button>
            <button
              className="SlideComponent__toolbar-item "
              onClick={() => {
                const parentEditor = content._parentEditor;
                if (parentEditor === null) {
                  return;
                }
                parentEditor.update(() => {
                  const slide = $getNodeByKey(nodeKey);
                  if (slide === null) {
                    return;
                  }
                  const nextSlide = slide.getNextSibling();
                  if (nextSlide === null) {
                    return;
                  }
                  nextSlide.insertAfter(slide);
                });
              }}
              title="Move after">
              <i className="icon slide-down" />
            </button>
            <button
              className="SlideComponent__toolbar-item"
              onClick={() => {
                const parentEditor = content._parentEditor;
                if (parentEditor === null) {
                  return;
                }
                parentEditor.update(() => {
                  const slide = $getNodeByKey(nodeKey);
                  if (slide === null) {
                    return;
                  }
                  alert('Needs fixing');
                  // slide.remove();
                });
              }}
              title="Delete">
              <i className="icon slide-delete" />
            </button>
          </div>
        )}
        <LexicalNestedComposer initialEditor={content}>
          <RichTextPlugin
            contentEditable={<ContentEditable />}
            placeholder={<></>}
          />
          <ListPlugin />
          <CheckListPlugin />
          <ExcalidrawPlugin />
          <HistoryPlugin />
          <LinkPlugin />
          <ImagesPlugin />
          <CodeHighlightPlugin />
          <MarkdownShortcutPlugin transformers={PLAYGROUND_TRANSFORMERS} />
          <ExcalidrawPlugin />
          <CodeSandboxPlugin />
          {/* @ts-ignore */}
          {window.__DEBUG__ && <TreeViewPlugin />}
        </LexicalNestedComposer>
      </div>
    </div>
  );
}
