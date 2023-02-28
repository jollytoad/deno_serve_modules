import {
  createCommonResponse,
  DenoDir,
  DigestAlgorithm,
  DiskCache,
  extname,
  join,
  normalize,
  red,
  serveFile,
  Status,
} from "./deps.ts";

export interface ServeModOptions {
  /**
   * The URL root to match preceding the module specifier.
   *
   * @default {""}
   */
  urlRoot?: string;

  /**
   * Root path added to all module specifiers.
   *
   * @default {""}
   */
  moduleRoot?: string;

  /** Enable CORS via the "Access-Control-Allow-Origin" header.
   *
   * @default {false}
   */
  enableCors?: boolean;

  /** Do not print request level logs. Defaults to false.
   *
   * @default {false}
   */
  quiet?: boolean;

  /** The algorithm to use for generating the ETag.
   *
   * @default {"fnv1a"}
   */
  etagAlgorithm?: DigestAlgorithm;

  /** Headers to add to each response
   *
   * @default {[]}
   */
  headers?: string[];
}

let cacheDir: string | undefined;

/**
 * Serves modules from the Deno cache, via a bare specifier resolved against the import-map.
 *
 * Requests for .ts/.tsx will return the generated js file instead, all other files will
 * be returned as-is from the cache.
 *
 * @param req The request to handle
 */
export async function serveMod(req: Request, opts: ServeModOptions) {
  let response: Response | undefined = undefined;

  try {
    if (!cacheDir) {
      cacheDir = new DenoDir(undefined, true).gen.location;
    }

    const baseURL = new URL(req.url).origin;
    const match = new URLPattern(`${opts.urlRoot}/:specifier+`, baseURL).exec(
      req.url,
    );

    if (match) {
      const specifier = join(
        opts.moduleRoot ?? "",
        match.pathname.groups.specifier,
      );

      if (!isRelative(specifier)) {
        const resolved = new URL(import.meta.resolve(specifier));

        const filename =
          [".ts", ".tsx", ".jsx"].includes(extname(resolved.pathname))
            ? DiskCache.getCacheFilenameWithExtension(resolved, "js")
            : DiskCache.getCacheFilename(resolved);

        if (filename) {
          response = await serveFile(req, join(cacheDir, filename), {
            etagAlgorithm: opts.etagAlgorithm,
          });
        }
      }
    }
  } catch (e) {
    const err = e instanceof Error ? e : new Error("[non-error thrown]");
    if (!opts.quiet) console.error(red(err.message), e);
    response = await serveFallback(req, err);
  }

  response ??= createCommonResponse(Status.NotFound);

  if (opts.enableCors) {
    response.headers.append("access-control-allow-origin", "*");
    response.headers.append(
      "access-control-allow-headers",
      "Origin, X-Requested-With, Content-Type, Accept, Range",
    );
  }

  if (!opts.quiet) serverLog(req, response!.status);

  if (opts.headers) {
    for (const header of opts.headers) {
      const headerSplit = header.split(":");
      const name = headerSplit[0];
      const value = headerSplit.slice(1).join(":");
      response.headers.append(name, value);
    }
  }

  return response;
}

function isRelative(specifier: string) {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

function serveFallback(_req: Request, e: Error): Promise<Response> {
  if (e instanceof URIError) {
    return Promise.resolve(createCommonResponse(Status.BadRequest));
  } else if (e instanceof Deno.errors.NotFound) {
    return Promise.resolve(createCommonResponse(Status.NotFound));
  }

  return Promise.resolve(createCommonResponse(Status.InternalServerError));
}

function serverLog(req: Request, status: number) {
  const d = new Date().toISOString();
  const dateFmt = `[${d.slice(0, 10)} ${d.slice(11, 19)}]`;
  const normalizedUrl = normalizeURL(req.url);
  const s = `${dateFmt} [${req.method}] ${normalizedUrl} ${status}`;
  // using console.debug instead of console.log so chrome inspect users can hide request logs
  console.debug(s);
}

function normalizeURL(url: string): string {
  return normalize(decodeURIComponent(new URL(url).pathname));
}
