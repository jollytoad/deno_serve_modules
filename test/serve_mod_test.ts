import { assertStringIncludes } from "https://deno.land/std@0.178.0/testing/asserts.ts";
import { serveMod } from "../mod.ts";
import { withServer } from "./with_server.ts";

// This ensures the public module is transpiled and cached
import "./hello.ts";

Deno.test({
  name: "fetch hello.ts",
  fn: withServer(
    (req) =>
      serveMod(req, {
        moduleRoot: "$public",
        urlRoot: "mod",
      }),
    { hostname: "localhost", port: 8910 },
    async () => {
      const content = await (await fetch("http://localhost:8910/mod/hello.ts"))
        .text();

      assertStringIncludes(content, 'const hello = "Hello";');
    },
  ),
});
