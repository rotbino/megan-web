#!/usr/bin/env python3
"""رندر hero-mobile.jpg — بنر موبایل ایمچ با نام و شعار بیک‌شده (Playwright)."""
import pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/home/z/my-project')
HTML = ROOT / 'scripts' / 'hero-mobile.html'
OUT = ROOT / 'megan-web' / 'public' / 'images' / 'hero-mobile.jpg'

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 780, 'height': 820}, device_scale_factor=1)
    page.goto(HTML.as_uri())
    page.wait_for_timeout(900)  # فونت و تصویر
    page.screenshot(path=str(OUT), type='jpeg', quality=88)
    browser.close()

print('saved:', OUT, OUT.stat().st_size // 1024, 'KB')
