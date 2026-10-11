/**
 * The parts of a headless browser this helper uses. Both Puppeteer's and
 * Playwright's `Browser` satisfy it, so bring whichever you already run.
 */
export interface PdfBrowser {
  newPage(): Promise<{
    setContent(html: string, options?: { waitUntil?: "load" }): Promise<unknown>;
    pdf(options?: object): Promise<Uint8Array>;
    close(): Promise<unknown>;
  }>;
}

/**
 * Options for {@link htmlToPdf}.
 */
export interface PdfOptions {
  /** Paper size. @defaultValue `"A4"` */
  format?: "A4" | "Letter" | "Legal" | "A3" | "A5";
  /** Page margins, as CSS lengths. @defaultValue `"18mm"` on every side */
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  /** Print background colours, such as code block shading. @defaultValue `true` */
  printBackground?: boolean;
  landscape?: boolean;
}

/**
 * Renders an HTML page to PDF in a headless browser, on your server.
 *
 * Pass a complete page, e.g. from `toHtmlDocument()` or `wrapHtmlDocument()`.
 * The HTML is loaded as a page, so only render documents you trust or have
 * sanitised: scripts in it would run in that browser.
 *
 * @example
 * ```ts
 * import puppeteer from "puppeteer";
 * import { wrapHtmlDocument } from "@openedit/export";
 * import { htmlToPdf } from "@openedit/export/server";
 *
 * const browser = await puppeteer.launch();
 * const pdf = await htmlToPdf(browser, wrapHtmlDocument(html, { title: "Report" }));
 * await browser.close();
 * ```
 */
export async function htmlToPdf(
  browser: PdfBrowser,
  html: string,
  options: PdfOptions = {},
): Promise<Uint8Array> {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "load" });
    const margin = { top: "18mm", right: "18mm", bottom: "18mm", left: "18mm", ...options.margin };
    return await page.pdf({
      format: options.format ?? "A4",
      margin,
      printBackground: options.printBackground ?? true,
      landscape: options.landscape ?? false,
    });
  } finally {
    await page.close();
  }
}
