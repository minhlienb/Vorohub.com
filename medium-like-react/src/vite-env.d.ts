// Type declarations for non-TS module imports. Vite handles .css,
// .svg, .png, etc. at build time, so the imports are real but we
// need to tell TypeScript that.
declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';

// EditorJS plugins don't ship their own .d.ts files. We type them as
// `any` for the static export and the default-exported constructor
// shape; call sites in WritePage use the default export which we
// already type via the import('...') promise.
declare module '@editorjs/editorjs' {
  const EditorJS: any;
  export default EditorJS;
}
declare module '@editorjs/header';
declare module '@editorjs/list';
declare module '@editorjs/quote';
declare module '@editorjs/delimiter';
declare module '@editorjs/image';
declare module '@editorjs/link';
declare module '@editorjs/marker';
declare module '@editorjs/inline-code';
declare module '@editorjs/code';
