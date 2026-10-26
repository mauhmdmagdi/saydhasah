#!/usr/bin/env python3
"""
سكريبت التحديث التلقائي لأسعار المنتجات في موقع صيدها صح
يعمل عبر GitHub Actions دورياً (أو يدوياً)
يقوم بفحص صفحات المنتجات في أمازون وتحديث الأسعار ونسب الخصم تلقائياً في data/db.json
"""

import json
import os
import re
import shutil
import subprocess
import sys
import time
from typing import Optional, Tuple
from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

def clean_price(text: str) -> Optional[float]:
    """استخراج القيمة الرقمية للسعر من النص العربي/الإنجليزي"""
    if not text:
        return None
    cleaned = text.replace("ريال", "").replace("SAR", "").replace(",", "").strip()
    # استخراج أول رقم عشري أو صحيح
    match = re.search(r"(\d+(?:\.\d+)?)", cleaned)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            return None
    return None

def fetch_html_curl(url: str) -> Optional[str]:
    """جلب صفحة المنتج باستخدام curl لتخطي الحظر وجلب السعر المباشر"""
    curl_bin = shutil.which("curl.exe") or shutil.which("curl") or "curl"
    try:
        cmd = [
            curl_bin,
            "-sL",
            "--compressed",
            "--max-time", "25",
            "-A", USER_AGENT,
            "-H", "Accept-Language: ar-SA,ar;q=0.9,en-US;q=0.8",
            "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            url
        ]
        res = subprocess.run(cmd, capture_output=True, timeout=30)
        if res.returncode == 0 and res.stdout:
            return res.stdout.decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  ⚠️ خطأ أثناء جلب الرابط ({url}): {e}")
    return None

def extract_amazon_price(asin: str) -> Tuple[Optional[float], Optional[float]]:
    """جلب السعر الحالي وسعر الخصم الأصلي من أمازون السعودية"""
    url = f"https://www.amazon.sa/dp/{asin}"
    html = fetch_html_curl(url)
    if not html or len(html) < 2000:
        return None, None

    soup = BeautifulSoup(html, "html.parser")

    # 1. البحث عن السعر الحالي (Current Price)
    current_price = None
    curr_selectors = [
        "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
        "#corePrice_feature_div .a-price .a-offscreen",
        "span.apexPriceToPay .a-offscreen",
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price .a-offscreen"
    ]
    for sel in curr_selectors:
        el = soup.select_one(sel)
        if el and el.text:
            p = clean_price(el.text)
            if p and p > 0:
                current_price = p
                break

    # 2. البحث عن السعر قبل الخصم (Original / List Price)
    original_price = None
    orig_selectors = [
        "span.a-price.a-text-price .a-offscreen",
        "#basisPrice .a-offscreen",
        "#listPrice",
        "#priceblock_listprice"
    ]
    for sel in orig_selectors:
        el = soup.select_one(sel)
        if el and el.text:
            p = clean_price(el.text)
            if p and p > 0:
                original_price = p
                break

    return current_price, original_price

def extract_asin(url: str) -> Optional[str]:
    """استخراج رمز ASIN من رابط أمازون"""
    if not url:
        return None
    match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
    if match:
        return match.group(1)
    match_k = re.search(r"[?&]k=([A-Z0-9]{10})", url)
    if match_k:
        return match_k.group(1)
    return None

def main():
    db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "db.json")
    if not os.path.exists(db_path):
        # البحث في المسار النسبي المباشر
        db_path = "data/db.json"
    
    if not os.path.exists(db_path):
        print(f"❌ لم يتم العثور على ملف قاعدة البيانات: {db_path}")
        sys.exit(1)

    with open(db_path, "r", encoding="utf-8") as f:
        db_data = json.load(f)

    products = db_data.get("products", [])
    print(f"🔍 تم العثور على {len(products)} منتج في قاعدة البيانات.")

    updated_count = 0
    scanned_count = 0

    for idx, prod in enumerate(products):
        store = prod.get("store", "").lower()
        store_link = prod.get("storeLink", "")
        prod_id = prod.get("id", f"p_{idx}")
        prod_name = prod.get("name", "")[:40]

        # فحص منتجات أمازون
        if store == "amazon" or "amazon.sa" in store_link:
            asin = extract_asin(store_link)
            if not asin:
                continue

            scanned_count += 1
            print(f"[{scanned_count}] فحص: {prod_name}... (ASIN: {asin})")
            
            try:
                curr_price, orig_price = extract_amazon_price(asin)
                if curr_price and curr_price > 0:
                    old_curr = prod.get("currentPrice", 0)
                    old_orig = prod.get("originalPrice", 0)

                    # إذا تغير السعر
                    if abs(curr_price - old_curr) > 0.05:
                        print(f"  ✨ تحديث السعر لـ ({prod_id}): {old_curr} ⬅️ {curr_price} ريال")
                        prod["currentPrice"] = round(curr_price, 2)
                        
                        if orig_price and orig_price >= curr_price:
                            prod["originalPrice"] = round(orig_price, 2)
                            prod["discount"] = round((1 - curr_price / orig_price) * 100)
                        elif old_orig > curr_price:
                            prod["discount"] = round((1 - curr_price / old_orig) * 100)
                        else:
                            prod["originalPrice"] = round(curr_price, 2)
                            prod["discount"] = 0
                        
                        updated_count += 1
                    else:
                        print(f"  ✔️ السعر الحالي مطابق: {curr_price} ريال")
                else:
                    print("  ℹ️ لم يتغير السعر أو لم نتمكن من قراءته، الاحتفاظ بالسعر الحالي.")
            except Exception as exc:
                print(f"  ⚠️ خطأ أثناء فحص المنتج {prod_id}: {exc}")

            # تأخير خفيف بين الطلبات لتجنب الضغط
            time.sleep(1.0)

    print("\n" + "=" * 50)
    print(f"📊 ملخص الفحص:")
    print(f"  - تم فحص: {scanned_count} منتج")
    print(f"  - تم تحديث أسعار: {updated_count} منتج")
    print("=" * 50)

    if updated_count > 0:
        with open(db_path, "w", encoding="utf-8") as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
        print("💾 تم حفظ التحديثات بنجاح في data/db.json!")
    else:
        print("👌 جميع الأسعار محدثة، لا توجد تغييرات جديدة.")

if __name__ == "__main__":
    main()
