#!/usr/bin/env node
// Stealth HTTP fetch via Crawlee's CheerioCrawler (anti-blocking headers/TLS
// fingerprints; no browser). Used as a fetch-url fallback tier for sites that
// block naive fetchers but don't need JS rendering.
//
// Usage:  node crawlee-fetch.mjs <url>
// Output: "Title: ...\nURL: ...\n\n<readable text>"  on stdout (exit 0)
//         on failure: message on stderr, exit 1
import { CheerioCrawler, Configuration, log, LogLevel } from 'crawlee';

const url = process.argv[2];
if (!url) { process.stderr.write('usage: crawlee-fetch.mjs <url>\n'); process.exit(2); }

log.setLevel(LogLevel.OFF);                       // keep stdout clean for content only

let ok = false;
const crawler = new CheerioCrawler(
  {
    maxRequestRetries: 2,
    requestHandlerTimeoutSecs: 30,
    maxConcurrency: 1,
    async requestHandler({ $, request }) {
      $('script, style, noscript, nav, header, footer, aside, form, iframe, svg').remove();
      const title = ($('title').first().text() || $('h1').first().text() || '').trim();
      const root = $('article').text() ? $('article')
                 : $('main').text() ? $('main')
                 : $('[role=main]').text() ? $('[role=main]')
                 : $('body');
      const text = root.text().replace(/\s+/g, ' ').trim();
      process.stdout.write(`Title: ${title}\nURL: ${request.loadedUrl}\n\n${text}\n`);
      ok = true;
    },
    failedRequestHandler({ request }, err) {
      process.stderr.write(`FAILED ${request.url}: ${err?.message || 'unknown'}\n`);
    },
  },
  new Configuration({ persistStorage: false }),   // in-memory; no ./storage on disk
);

await crawler.run([url]);
process.exit(ok ? 0 : 1);
