// file-type v22 ships ESM-only with an export map that this project's
// CommonJS `moduleResolution` can't statically resolve — the dynamic
// `import('file-type')` used in cloudinary.service.ts works fine at
// runtime regardless, this just satisfies the compiler without widening
// moduleResolution project-wide for one dependency.
declare module 'file-type';
