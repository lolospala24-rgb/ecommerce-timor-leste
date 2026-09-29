import { BadRequestException } from '@nestjs/common';

/**
 * Strips the known SVG-based XSS vectors before a custom Quick Menu icon
 * is ever stored/served: <script> elements, on* event-handler attributes,
 * javascript: URIs in href/xlink:href, and <foreignObject> (which can embed
 * arbitrary HTML). Upload is admin-only (see @Roles(Role.ADMIN) on the
 * controller), but that's not a reason to skip sanitizing — an admin
 * account could be compromised, or an admin could unknowingly upload an
 * SVG sourced from somewhere untrusted.
 *
 * This is a targeted, dependency-free sanitizer for a narrow, known threat
 * model (not a general-purpose SVG sanitization library) — proportionate to
 * an admin-only icon upload feature rather than a public user-content path.
 */
export function sanitizeSvg(raw: string): string {
  let svg = raw;

  // Must actually look like an SVG document, not any other XML/text file
  // renamed to .svg.
  if (!/<svg[\s>]/i.test(svg)) {
    throw new BadRequestException('File does not look like a valid SVG');
  }

  // <script>...</script> and self-closing/empty <script/>
  svg = svg.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  svg = svg.replace(/<script\b[^>]*\/?>/gi, '');

  // <foreignObject> can embed arbitrary HTML (including <script>) inside an
  // otherwise-inert SVG — drop the whole element.
  svg = svg.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi, '');
  svg = svg.replace(/<foreignObject\b[^>]*\/?>/gi, '');

  // on* event-handler attributes (onload, onclick, onmouseover, ...) on any
  // element, whether double- or single-quoted.
  svg = svg.replace(/\son\w+\s*=\s*"(?:[^"\\]|\\.)*"/gi, '');
  svg = svg.replace(/\son\w+\s*=\s*'(?:[^'\\]|\\.)*'/gi, '');

  // javascript: (and data:text/html, another script-execution vector) URIs
  // in href/xlink:href.
  svg = svg.replace(/((?:xlink:)?href\s*=\s*)"(?:\s*javascript:|\s*data:text\/html)[^"]*"/gi, '$1""');
  svg = svg.replace(/((?:xlink:)?href\s*=\s*)'(?:\s*javascript:|\s*data:text\/html)[^']*'/gi, "$1''");

  // <!ENTITY ...> / <!DOCTYPE ... [ ... ]> can be used for XXE-style entity
  // expansion — SVG icons never legitimately need a DTD.
  svg = svg.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/gi, '');
  svg = svg.replace(/<!ENTITY[^>]*>/gi, '');

  return svg;
}
