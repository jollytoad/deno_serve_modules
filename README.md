# deno_serve_modules

[![deno doc](https://doc.deno.land/badge.svg)](https://doc.deno.land/https://deno.land/x/serve_modules/mod.ts)

A very simple HTTP handler to serve modules from the Deno cache, modelled on
`serveDir` in std lib.

It takes the URLs path following the `urlRoot`, prepends the `moduleRoot` and
then resolves this as a bare specifier using `import.meta.resolve`. So the idea
is that you can map these URLs to any module you want in your import map.

Also, for `.ts`/`.tsx`/`.jsx` files, the JS file generated and cached by Deno
will be returned.

This requires these modules to have already be transpiled/cached by deno, so
you'll want to `deno cache` them or ensure they are imported from server module.

## Permissions

This module makes use of [`deno_cache`](https://deno.land/x/deno_cache) to read
the files, and therefore requires the appropriate permissions that it requires.
See those [docs](https://deno.land/x/deno_cache#permissions) for full details.

## Example

Given the following simple server:

```ts
await serve((req) =>
  serveMod(req, {
    moduleRoot: "$public",
    urlRoot: "mod",
  })
);
```

and the import map:

```json
{
  "imports": {
    "$public/hello.ts": "./hello.ts"
  }
}
```

The URL `/mod/hello.ts` will resolve to the transpiled JS of `$public/hello.ts`.

## Known Bugs

There are a couple of outstanding bugs in `deno_cache` awaiting PR merges...

- https://github.com/denoland/deno_cache/pull/18
- https://github.com/denoland/deno_cache/pull/21

Until those issues are solved, this module will depend upon a patched fork of
`deno_cache` imported directly from my own
[repository](https://github.com/jollytoad/deno_cache/tree/fixes).
