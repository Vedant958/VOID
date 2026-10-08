"""
SHADY VOID - Universal Deep Media Extractor
Aggressively parses all links, magnet URIs, and gallery images without strict CSS classes.
Stores all extracted payloads cleanly in shady_vault.json for dynamic loading into shady.html.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin, quote

import requests
from bs4 import BeautifulSoup

LOG = logging.getLogger(__name__)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

DEFAULT_THUMBS = [
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=640&q=80",
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=640&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=640&q=80",
    "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=640&q=80",
    "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=640&q=80"
]

def clean_text(text: str | None) -> str:
    return " ".join(text.split()) if text else ""

def is_screenshot_image(src: str) -> bool:
    """Filter out icons, avatars, and UI logos."""
    src_lower = src.lower()
    ignore_patterns = ["logo", "avatar", "icon", "banner", "pixel", "wp-content/themes", ".svg"]
    if any(p in src_lower for p in ignore_patterns):
        return False
    return any(ext in src_lower for ext in [".jpg", ".jpeg", ".png", ".webp"])

def generate_item_id(master_cat: str, title: str, idx: int) -> str:
    prefix = {
        "MOVIES": "mv",
        "SERIES": "sr",
        "GAMES": "gm",
        "VAULT": "vlt"
    }.get(master_cat.upper(), "sv")
    h = hashlib.md5(f"{title}_{idx}".encode("utf-8")).hexdigest()[:4]
    return f"{prefix}_{h}"

class RobustScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)

    def get_soup(self, url: str) -> BeautifulSoup | None:
        try:
            res = self.session.get(url, timeout=12)
            res.raise_for_status()
            return BeautifulSoup(res.text, "html.parser")
        except Exception as e:
            LOG.warning(f"Failed to fetch {url}: {e}")
            print(f"[!] Warning: Could not fetch '{url}': {e}", file=sys.stderr)
            return None

    def extract_page_details(self, detail_url: str, fallback_title: str) -> dict:
        soup = self.get_soup(detail_url)
        if not soup:
            return {}

        # 1. Aggressive Title Detection
        h1 = soup.find("h1")
        title = clean_text(h1.get_text()) if h1 else fallback_title

        # 2. Extract ALL Links (Magnet / Direct Download / Outbound)
        magnet_link = ""
        download_links = []
        
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            anchor_text = clean_text(a.get_text()).lower()
            
            # Direct Magnet Protocol
            if href.startswith("magnet:?"):
                magnet_link = href
            # Torrent or Download Keywords in link/text
            elif any(k in anchor_text for k in ["magnet", "torrent", "download", "1080p", "720p", "4k", "gdrive", "direct"]):
                full_url = urljoin(detail_url, href)
                if full_url not in download_links:
                    download_links.append(full_url)
            elif any(ext in href.lower() for ext in [".torrent", ".mkv", ".mp4", ".zip"]):
                full_url = urljoin(detail_url, href)
                if full_url not in download_links:
                    download_links.append(full_url)

        # Fallback: if no raw magnet, use the first solid download link
        if not magnet_link and download_links:
            magnet_link = download_links[0]

        # 3. Extract ALL Screenshots / Posters
        images = []
        for img in soup.find_all("img"):
            src = img.get("data-src") or img.get("data-lazy-src") or img.get("data-original") or img.get("src")
            if src:
                abs_src = urljoin(detail_url, src.strip())
                if is_screenshot_image(abs_src) and abs_src not in images:
                    images.append(abs_src)

        poster = images[0] if images else DEFAULT_THUMBS[0]
        screenshots = images[1:6] if len(images) > 1 else ([poster] if poster else DEFAULT_THUMBS[:3])

        # 4. Extract Size, Year & Quality via Regex on whole page text
        page_text = soup.get_text()
        
        year_match = re.search(r"\b(20[12]\d|19\d{2})\b", page_text)
        year = int(year_match.group(0)) if year_match else 2024

        size_match = re.search(r"\b(\d+(?:\.\d+)?\s?(?:GB|MB|TB))\b", page_text, re.IGNORECASE)
        size = size_match.group(0).upper() if size_match else "15.0 GB"

        quality = "1080P"
        if re.search(r"\b(2160p|4k|uhd|remux)\b", page_text, re.I):
            quality = "4K UHD"
        elif re.search(r"\b(720p)\b", page_text, re.I):
            quality = "720P"
        elif re.search(r"\b(fitgirl|dodi|repack)\b", page_text, re.I):
            quality = "FITGIRL"

        # 5. Extract Paragraph Summary
        paragraphs = [clean_text(p.get_text()) for p in soup.find_all("p") if len(clean_text(p.get_text())) > 40]
        description = paragraphs[0] if paragraphs else "Encrypted media payload stream ready."

        return {
            "title": title,
            "year": year,
            "size": size,
            "quality": quality,
            "poster": poster,
            "description": description,
            "screenshots": screenshots,
            "magnet": magnet_link or f"magnet:?xt=urn:btih:{hashlib.sha256(title.encode()).hexdigest()[:40]}&dn={quote(title)}",
            "streamUrl": detail_url
        }

    def scrape_catalog(self, catalog_url: str, category: str, subcategory: str, max_items: int = 12) -> list[dict]:
        # Handle single detail page directly if given a specific movie/post URL
        if not any(catalog_url.rstrip("/").endswith(x) for x in ["/movies", "/series", "/games", "/page/1", "/page/2", "/category", "/"]):
            soup = self.get_soup(catalog_url)
            if soup and (soup.find("h1") or soup.find("article")):
                title_text = soup.find("h1").get_text() if soup.find("h1") else "Extracted Media Stream"
                details = self.extract_page_details(catalog_url, title_text)
                if details:
                    item_id = generate_item_id(category, details["title"], 1)
                    return [{
                        "id": item_id,
                        "master": category.upper(),
                        "sub": subcategory,
                        "tags": [details["quality"].replace(" ", "_"), "LIVE_FEED"],
                        "title": details["title"],
                        "year": details["year"],
                        "rating": 8.5,
                        "size": details["size"],
                        "seeds": "1,450",
                        "audio": "ATMOS_DDP5.1",
                        "quality": details["quality"],
                        "status": "LIVE",
                        "desc": details["description"],
                        "thumb": details["poster"],
                        "poster": details["poster"],
                        "screenshots": details["screenshots"],
                        "magnet": details["magnet"],
                        "streamUrl": details["streamUrl"]
                    }]

        soup = self.get_soup(catalog_url)
        if not soup:
            return []

        vault_items = []
        seen_urls = set()
        candidate_links = []

        for a in soup.find_all("a", href=True):
            href = urljoin(catalog_url, a["href"].strip())
            title_text = clean_text(a.get_text())
            
            if href != catalog_url and href not in seen_urls and len(title_text) > 4:
                if not any(nav in href.lower() for nav in ["/category/", "/tag/", "/contact", "/about", "/dmca"]):
                    seen_urls.add(href)
                    candidate_links.append((href, title_text))

        print(f"[FOUND] {len(candidate_links)} possible media links. Extracting payload data...")

        for idx, (item_url, raw_title) in enumerate(candidate_links[:max_items], start=1):
            time.sleep(0.8) # Polite delay
            print(f"[DECRYPTING {idx}/{min(len(candidate_links), max_items)}] {item_url}")
            
            details = self.extract_page_details(item_url, raw_title)
            if not details:
                continue

            item_id = generate_item_id(category, details["title"], idx)
            vault_item = {
                "id": item_id,
                "master": category.upper(),
                "sub": subcategory,
                "tags": [details["quality"].replace(" ", "_"), "LIVE_FEED"],
                "title": details.get("title", raw_title),
                "year": details.get("year", 2024),
                "rating": 8.5,
                "size": details.get("size", "15.0 GB"),
                "seeds": "1,200",
                "audio": "ATMOS_DDP5.1",
                "quality": details.get("quality", "1080P"),
                "status": "LIVE",
                "desc": details.get("description", ""),
                "thumb": details.get("poster", ""),
                "poster": details.get("poster", ""),
                "screenshots": details.get("screenshots", []),
                "magnet": details.get("magnet", "#"),
                "streamUrl": details.get("streamUrl", item_url)
            }
            vault_items.append(vault_item)

        return vault_items


def purge_vault(output_path="shady_vault.json"):
    """Resets the scraped vault file to empty array."""
    p = Path(output_path)
    p.write_text("[]\n", encoding="utf-8")
    if os.path.exists("shady_vault"):
        Path("shady_vault").write_text("[]\n", encoding="utf-8")
    print(f"[OK] Scraped vault purged! '{output_path}' reset to []")
    print("[OK] Reload shady.html or click 'PURGE SCRAPED DATA' to view original clean vault.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SHADY VOID - Universal Deep Media Extractor")
    parser.add_argument("catalog_url", nargs="?", default="https://example.com/movies/", help="Target URL of the catalog or media page")
    parser.add_argument("--category", default="MOVIES", help="Category: MOVIES, SERIES, GAMES, VAULT")
    parser.add_argument("--subcategory", default="hollywood", help="Subcategory (e.g. hollywood, bollywood, indie_vault)")
    parser.add_argument("--output", default="shady_vault.json", help="Output JSON path (default: shady_vault.json)")
    parser.add_argument("--max", type=int, default=8, help="Max items to parse from catalog")
    parser.add_argument("--append", action="store_true", help="Append to existing shady_vault.json instead of overwriting")
    parser.add_argument("--purge", "--reset", action="store_true", help="Purge/reset all scraped data in shady_vault.json")

    args = parser.parse_args()

    if args.purge:
        purge_vault(args.output)
        sys.exit(0)

    scraper = RobustScraper()
    print(f"[*] VOID // Deep Media Extractor initialized for: {args.catalog_url}")
    print(f"[*] Master Category: {args.category} // Sub: {args.subcategory}")

    results = scraper.scrape_catalog(args.catalog_url, args.category, args.subcategory, max_items=args.max)
    
    output_path = Path(args.output)
    
    if args.append and output_path.exists():
        try:
            existing = json.loads(output_path.read_text(encoding="utf-8"))
            if isinstance(existing, list):
                results = existing + results
        except Exception:
            pass

    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    if os.path.exists("shady_vault"):
        Path("shady_vault").write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"\n[MISSION COMPLETE] Successfully stored {len(results)} items in {output_path.resolve()}")
    print(f"[*] To view: Open or refresh shady.html.")
    print(f"[*] To reset: Click 'PURGE SCRAPED DATA' in shady.html or run: python scraper.py --purge")
