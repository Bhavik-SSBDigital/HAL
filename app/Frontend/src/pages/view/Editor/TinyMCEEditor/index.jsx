import React, { useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';

const TinyMCEEditor = () => {
  const handleEditorChange = (content) => {
    console.log(content);
  };

  return (
    <Editor
      initialValue="<p>This is the initial content of the editor</p>"
      init={{
        height: 500,
        menubar: false,
        license_key: "GPL",
        plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap'],
        toolbar:
          'undo redo | formatselect | bold italic | alignleft aligncenter alignright | outdent indent | numlist bullist | image',
      }}
      onEditorChange={handleEditorChange}
    />
  );
};

export default TinyMCEEditor;
