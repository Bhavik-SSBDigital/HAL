import React, { useState } from 'react';
import {
  Editor,
  EditorState,
  RichUtils,
  Modifier,
  getDefaultKeyBinding,
} from 'draft-js';
import 'draft-js/dist/Draft.css';
import styles from './DraftEditor.module.css'; // Importing CSS Module

const DraftEditor = () => {
  const [editorState, setEditorState] = useState(() =>
    EditorState.createEmpty(),
  );

  // Handle inline style toggling
  const handleBold = () => {
    const newState = RichUtils.toggleInlineStyle(editorState, 'BOLD');
    setEditorState(newState);
  };

  const handleItalic = () => {
    const newState = RichUtils.toggleInlineStyle(editorState, 'ITALIC');
    setEditorState(newState);
  };

  const handleUnderline = () => {
    const newState = RichUtils.toggleInlineStyle(editorState, 'UNDERLINE');
    setEditorState(newState);
  };

  const handleAlignLeft = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'align-left');
    setEditorState(newState);
  };

  const handleAlignCenter = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'align-center');
    setEditorState(newState);
  };

  const handleAlignRight = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'align-right');
    setEditorState(newState);
  };

  // Handle block types for lists and headings
  const handleH1 = () => {
    const newState = RichUtils.toggleBlockType(editorState, 'header-one');
    setEditorState(newState);
  };

  const handleOrderedList = () => {
    const newState = RichUtils.toggleBlockType(
      editorState,
      'ordered-list-item',
    );
    setEditorState(newState);
  };

  const handleUnorderedList = () => {
    const newState = RichUtils.toggleBlockType(
      editorState,
      'unordered-list-item',
    );
    setEditorState(newState);
  };

  // Change font size dynamically
  const handleFontSizeChange = (size) => {
    const currentContent = editorState.getCurrentContent();
    const selection = editorState.getSelection();
    const newContent = Modifier.setInlineStyleOverride(
      currentContent,
      selection,
      `font-size-${size}`,
    );
    const newState = EditorState.push(
      editorState,
      newContent,
      'change-inline-style',
    );
    setEditorState(newState);
  };

  // Handle custom keyboard commands
  const handleKeyCommand = (command) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      setEditorState(newState);
      return 'handled';
    }
    return 'not-handled';
  };

  const keyBindingFn = (e) => {
    return getDefaultKeyBinding(e);
  };

  return (
    <div className={styles.editorContainer}>
      {/* Toolbar for text formatting */}
      <div className={styles.toolbar}>
        <button
          onClick={handleBold}
          className={styles.toolbarButton}
          style={{ fontWeight: 'bold' }}
        >
          Bold
        </button>
        <button
          onClick={handleItalic}
          className={styles.toolbarButton}
          style={{ fontStyle: 'italic' }}
        >
          Italic
        </button>
        <button
          onClick={handleUnderline}
          className={styles.toolbarButton}
          style={{ textDecoration: 'underline' }}
        >
          Underline
        </button>
        <button onClick={handleAlignLeft} className={styles.toolbarButton}>
          Align Left
        </button>
        <button onClick={handleAlignCenter} className={styles.toolbarButton}>
          Align Center
        </button>
        <button onClick={handleAlignRight} className={styles.toolbarButton}>
          Align Right
        </button>
        <button onClick={handleH1} className={styles.toolbarButton}>
          H1
        </button>
        <button onClick={handleOrderedList} className={styles.toolbarButton}>
          OL
        </button>
        <button onClick={handleUnorderedList} className={styles.toolbarButton}>
          UL
        </button>
        {/* Font size dropdown */}
        <select
          onChange={(e) => handleFontSizeChange(e.target.value)}
          className={styles.fontSizeSelector}
        >
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
        </select>
      </div>

      {/* Editor component */}
      <Editor
        editorState={editorState}
        onChange={setEditorState}
        handleKeyCommand={handleKeyCommand}
        keyBindingFn={keyBindingFn}
        placeholder="Start typing..."
      />
    </div>
  );
};

export default DraftEditor;
