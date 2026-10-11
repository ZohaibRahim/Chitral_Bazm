"""Download candidate fonts from their official sources into scripts/fonts/sources/ (git-ignored).

Integrity:
- google/fonts files are checked against the git blob SHA-1 published by the GitHub contents API (fonts.json).
- Every font file's SHA-256 is recorded in fonts.lock.json on first download and verified on every later run.
Font binaries are never committed; the OFL text is kept next to each font.
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SOURCES = HERE / "sources"
MANIFEST = HERE / "fonts.json"
LOCK = HERE / "fonts.lock.json"


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "khowar-lyrics-archive-font-tooling"})
    with urllib.request.urlopen(req, timeout=120) as resp:  # noqa: S310 - fixed https URLs from the manifest
        return resp.read()


def git_blob_sha1(data: bytes) -> str:
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()  # noqa: S324 - git object id, not security


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    lock = json.loads(LOCK.read_text(encoding="utf-8")) if LOCK.exists() else {}
    for font in manifest["fonts"]:
        dest = SOURCES / font["id"]
        dest.mkdir(parents=True, exist_ok=True)
        target = dest / font["file"]
        if not target.exists():
            print(f"downloading {font['family']} ...")
            payload = fetch(font["url"])
            if "zip_member" in font:
                with zipfile.ZipFile(io.BytesIO(payload)) as zf:
                    names = zf.namelist()
                    member = next(n for n in names if n.endswith("/" + font["zip_member"]) or n == font["zip_member"])
                    lic = next(n for n in names if n.endswith("/" + font["zip_license_member"]) or n == font["zip_license_member"])
                    target.write_bytes(zf.read(member))
                    (dest / "OFL.txt").write_bytes(zf.read(lic))
            else:
                if git_blob_sha1(payload) != font["git_blob_sha1"]:
                    print(f"FAIL {font['id']}: git blob SHA-1 mismatch; upstream changed. Re-verify the source before updating fonts.json.")
                    return 1
                target.write_bytes(payload)
                (dest / "OFL.txt").write_bytes(fetch(font["license_url"]))
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        recorded = lock.get(font["id"])
        if recorded is None:
            lock[font["id"]] = {"file": font["file"], "sha256": digest, "bytes": target.stat().st_size}
            print(f"recorded {font['id']} sha256={digest}")
        elif recorded["sha256"] != digest:
            print(f"FAIL {font['id']}: sha256 does not match fonts.lock.json")
            return 1
        else:
            print(f"ok {font['id']} sha256 verified")
    LOCK.write_text(json.dumps(lock, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
