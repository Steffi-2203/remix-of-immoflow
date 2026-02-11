/**
 * server/lib/htmlTransform.ts
 *
 * HTML transformation helpers for injecting CSP nonces and SRI attributes
 * into script, style, and link tags before serving to the client.
 */

import type { SriEntry } from './sri';

/**
 * Inject a CSP nonce into all <script>, <style>, and <link rel="stylesheet"> tags.
 * Skips tags that already have a nonce attribute.
 */
export function injectNonce(html: string, nonce: string): string {
  // Inject nonce into <script ...> tags (but not if nonce already present)
  html = html.replace(/<script(?![^>]*\bnonce\b)([^>]*)>/gi, `<script nonce="${nonce}"$1>`);

  // Inject nonce into <style ...> tags
  html = html.replace(/<style(?![^>]*\bnonce\b)([^>]*)>/gi, `<style nonce="${nonce}"$1>`);

  // Inject nonce into <link rel="stylesheet" ...> tags
  html = html.replace(/<link(?![^>]*\bnonce\b)([^>]*rel=["']stylesheet["'][^>]*)>/gi, `<link nonce="${nonce}"$1>`);

  return html;
}

/**
 * Inject SRI integrity + crossorigin attributes into <script src="..."> and
 * <link href="..."> tags whose paths match entries in the SRI map.
 *
 * Asset paths in HTML are expected to start with "/" (e.g. "/assets/index-abc123.js").
 * The SRI map keys are relative (e.g. "assets/index-abc123.js").
 */
export function injectSri(html: string, sriMap: Record<string, SriEntry>): string {
  if (!sriMap || Object.keys(sriMap).length === 0) return html;

  // <script src="/assets/xxx.js">
  html = html.replace(
    /<script([^>]*)\ssrc=["']\/([^"']+)["']([^>]*)>/gi,
    (match, before, assetPath, after) => {
      const entry = sriMap[assetPath];
      if (!entry || match.includes('integrity=')) return match;
      return `<script${before} src="/${assetPath}" integrity="${entry.integrity}" crossorigin="${entry.crossorigin}"${after}>`;
    },
  );

  // <link href="/assets/xxx.css" rel="stylesheet">
  html = html.replace(
    /<link([^>]*)\shref=["']\/([^"']+)["']([^>]*)>/gi,
    (match, before, assetPath, after) => {
      const entry = sriMap[assetPath];
      if (!entry || match.includes('integrity=')) return match;
      return `<link${before} href="/${assetPath}" integrity="${entry.integrity}" crossorigin="${entry.crossorigin}"${after}>`;
    },
  );

  return html;
}
