require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.48.0/min/vs' } });
require(["vs/editor/editor.main"], function () {
    window.editor = monaco.editor.create(document.getElementById('output'), {
        value: 'To get started, select a context and namespace from bottom left, and type a kubectl command in the textbox below.',
        language: "ini",
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        automaticLayout: true,
    });

    console.log("Done")
});