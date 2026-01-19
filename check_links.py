#!/usr/bin/env python3
"""Static-site broken link checker.

- Scans all *.html in the repo root.
- Validates internal links (root-relative and relative) point to existing files.
- Optionally checks external http(s) URLs.

Usage:
  python3 check_links.py
  python3 check_links.py --check-external

Exit codes:
  0: no internal broken links
  2: internal broken links found
  3: external link check enabled and broken externals found
"""

from __future__ import annotations

import argparse
import dataclasses
import html
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parent


@dataclasses.dataclass(frozen=True)
class LinkRef:
    source_file: Path
    tag: str
    attr: str
    raw_url: str


@dataclasses.dataclass(frozen=True)
class Finding:
    kind: str  # "internal" | "external"
    message: str
    ref: LinkRef


_TAG_ATTRS: dict[str, tuple[str, ...]] = {
    "a": ("href",),
    "img": ("src", "srcset"),
    "script": ("src",),
    "link": ("href",),
    "source": ("src", "srcset"),
    "video": ("src",),
    "audio": ("src",),
    "iframe": ("src",),
}


# Very small, dependency-free attribute parser for HTML tags.
_ATTR_RE = re.compile(r"\b([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:\"([^\"]*)\"|'([^']*)'|([^\s>]+))")
_TAG_RE = re.compile(r"<\s*([a-zA-Z][a-zA-Z0-9:-]*)\b([^>]*)>", re.IGNORECASE | re.DOTALL)


def iter_html_files() -> Iterable[Path]:
    for p in sorted(ROOT.glob("*.html")):
        if p.is_file():
            yield p


def parse_tag_attrs(tag_text: str) -> dict[str, str]:
    attrs: dict[str, str] = {}
    for m in _ATTR_RE.finditer(tag_text):
        key = m.group(1).lower()
        val = m.group(2) or m.group(3) or m.group(4) or ""
        attrs[key] = html.unescape(val)
    return attrs


def extract_links_from_html(text: str, *, source_file: Path) -> list[LinkRef]:
    refs: list[LinkRef] = []
    for m in _TAG_RE.finditer(text):
        tag = m.group(1).lower()
        if tag not in _TAG_ATTRS:
            continue
        attrs_text = m.group(2)
        attrs = parse_tag_attrs(attrs_text)

        # Skip resource-hint link tags for broken-link purposes.
        if tag == "link":
            rel = {r.strip().lower() for r in attrs.get("rel", "").split() if r.strip()}
            if rel.intersection({"preconnect", "dns-prefetch"}):
                continue

        for attr in _TAG_ATTRS[tag]:
            if attr not in attrs:
                continue
            raw = attrs[attr].strip()
            if not raw:
                continue
            if attr == "srcset":
                # Format: "url1 1x, url2 2x" or "url w".
                parts = [p.strip() for p in raw.split(",") if p.strip()]
                for part in parts:
                    url = part.split()[0].strip()
                    if url:
                        refs.append(LinkRef(source_file, tag, attr, url))
            else:
                refs.append(LinkRef(source_file, tag, attr, raw))
    return refs


def normalize_internal_url(raw_url: str) -> str:
    """Normalize a URL for internal filesystem checks (strip query/fragment)."""
    url = raw_url.strip()
    if not url:
        return url
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme:
        # mailto:, tel:, javascript:, data:, http(s), etc.
        return url
    return urllib.parse.urlunsplit(("", "", parsed.path, "", ""))


def normalize_external_url(raw_url: str) -> str:
    """Normalize an external URL for requesting (strip fragment, keep query)."""
    url = raw_url.strip()
    if not url:
        return url
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in ("http", "https"):
        return url
    return urllib.parse.urlunsplit(
        (parsed.scheme, parsed.netloc, parsed.path, parsed.query, "")
    )


def to_ascii_request_url(url: str) -> str:
    """Convert a potentially-unicode URL into an ASCII-safe request URL.

    - IDNA-encodes hostname.
    - Percent-encodes path/query where needed.
    """
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme not in ("http", "https"):
        return url

    netloc = parsed.netloc.encode("idna").decode("ascii")
    path = urllib.parse.quote(parsed.path, safe="/%")
    query = urllib.parse.quote(parsed.query, safe="=&%")
    return urllib.parse.urlunsplit((parsed.scheme, netloc, path, query, ""))


def is_ignorable(url: str) -> bool:
    u = url.strip()
    if not u or u.startswith("#"):
        return True
    lower = u.lower()
    if lower.startswith(("mailto:", "tel:", "javascript:", "data:")):
        return True
    return False


def resolve_internal_target(ref: LinkRef) -> Path | None:
    url = normalize_internal_url(ref.raw_url)
    if is_ignorable(url):
        return None

    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme in ("http", "https"):
        return None

    path = parsed.path
    if not path:
        return None

    # Root-relative.
    if path.startswith("/"):
        candidate = ROOT / path.lstrip("/")
    else:
        candidate = ref.source_file.parent / path

    # If path ends with '/', treat as directory index.
    if str(candidate).endswith(os.sep) or path.endswith("/"):
        candidate = candidate / "index.html"

    # If path is "/" exactly.
    if path == "/":
        candidate = ROOT / "index.html"

    return candidate.resolve()


def internal_exists(target: Path) -> bool:
    # Allow URLs that refer to directories (served as index.html) and files.
    if target.exists():
        return True

    # Special-case: link to "/foo" where repo has "/foo.html" (common pattern).
    if target.suffix == "":
        alt = target.with_suffix(".html")
        if alt.exists():
            return True

    return False


def check_external_url(url: str, *, timeout: float = 8.0) -> tuple[bool, str]:
    url = to_ascii_request_url(normalize_external_url(url))
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "tingyuun-link-checker/1.0 (+https://tingyuun.github.io/)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            code = getattr(resp, "status", 200)
            if 200 <= code < 400:
                return True, f"HTTP {code}"
            if code in (403, 429):
                return False, f"HTTP {code} (可能防爬/封鎖)"
            return False, f"HTTP {code}"
    except urllib.error.HTTPError as e:
        if e.code in (403, 429):
            return False, f"HTTP {e.code} (可能防爬/封鎖)"
        return False, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return False, f"URL error: {e.reason}"
    except Exception as e:  # noqa: BLE001
        return False, f"Error: {e}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check-external", action="store_true", help="Also check http(s) URLs")
    ap.add_argument(
        "--external-limit",
        type=int,
        default=80,
        help="Max number of distinct external URLs to check (default: 80)",
    )
    ap.add_argument(
        "--external-delay",
        type=float,
        default=0.15,
        help="Delay (seconds) between external requests (default: 0.15)",
    )
    args = ap.parse_args()

    findings: list[Finding] = []
    internal_checked = 0

    external_refs: list[LinkRef] = []

    for html_file in iter_html_files():
        text = html_file.read_text(encoding="utf-8", errors="ignore")
        for ref in extract_links_from_html(text, source_file=html_file):
            url = normalize_internal_url(ref.raw_url)
            if is_ignorable(url):
                continue

            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme in ("http", "https"):
                external_refs.append(ref)
                continue

            target = resolve_internal_target(ref)
            if target is None:
                continue
            internal_checked += 1
            if not internal_exists(target):
                findings.append(
                    Finding(
                        kind="internal",
                        message=f"Not found: {target.relative_to(ROOT)}",
                        ref=ref,
                    )
                )

    if args.check_external:
        # Deduplicate by normalized absolute URL.
        seen: set[str] = set()
        urls: list[tuple[str, LinkRef]] = []
        for ref in external_refs:
            u = normalize_external_url(ref.raw_url)
            if u in seen:
                continue
            seen.add(u)
            urls.append((u, ref))

        urls = urls[: max(0, args.external_limit)]

        for i, (u, ref) in enumerate(urls, start=1):
            ok, reason = check_external_url(u)
            if not ok:
                findings.append(
                    Finding(kind="external", message=f"{reason}: {u}", ref=ref)
                )
            if args.external_delay > 0 and i < len(urls):
                time.sleep(args.external_delay)

    # Print report.
    internal_broken = [f for f in findings if f.kind == "internal"]
    external_broken = [f for f in findings if f.kind == "external"]

    print(f"Checked internal refs: {internal_checked}")
    print(f"Broken internal links: {len(internal_broken)}")
    if args.check_external:
        print(
            "Checked external URLs (unique): "
            + str(
                min(
                    len(set(normalize_external_url(r.raw_url) for r in external_refs)),
                    args.external_limit,
                )
            )
        )
        print(f"Broken external links: {len(external_broken)}")

    def print_group(title: str, items: list[Finding]) -> None:
        if not items:
            return
        print("\n" + title)
        print("-" * len(title))
        for f in items:
            sf = f.ref.source_file.relative_to(ROOT)
            print(f"{sf}: <{f.ref.tag} {f.ref.attr}>=\"{f.ref.raw_url}\" -> {f.message}")

    print_group("Broken internal links", internal_broken)
    print_group("Broken external links", external_broken)

    if internal_broken:
        return 2
    if args.check_external and external_broken:
        return 3
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
