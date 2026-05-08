#!/usr/bin/env python3
"""
Create a custom Recraft style from 1–5 reference images (40 credits).
Returns a UUID you can pass to recraft_generate.py via --style-id.

Usage:
    python recraft_style.py --base digital_illustration ref1.png ref2.png
    python recraft_style.py --base realistic_image ref.jpg --save-id style_id.txt

Base styles:
    digital_illustration  — For illustrations, drawings, artwork
    realistic_image       — For photographic / realistic output
    vector_illustration   — For vector/SVG output
    icon                  — For icon sets and pictograms

Then use the style UUID:
    python recraft_generate.py "coffee shop logo" logo.png --style-id $(cat style_id.txt)

Environment:
    RECRAFT_API_KEY — required, read from .env if present
"""

import argparse
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://external.api.recraft.ai/v1"

BASE_STYLES = ["digital_illustration", "realistic_image", "vector_illustration", "icon"]


def api_headers():
    key = os.environ.get("RECRAFT_API_KEY")
    if not key:
        raise EnvironmentError("RECRAFT_API_KEY not set. Add it to your .env file.")
    return {"Authorization": f"Bearer {key}"}


def create_style(base_style, image_paths, save_id_path=None):
    if not image_paths:
        raise ValueError("At least one reference image is required")
    if len(image_paths) > 5:
        raise ValueError("Maximum 5 reference images allowed")

    files = [("files", open(p, "rb")) for p in image_paths]
    try:
        r = requests.post(
            f"{BASE_URL}/styles",
            headers=api_headers(),
            files=files,
            data={"style": base_style},
        )
        r.raise_for_status()
    finally:
        for _, f in files:
            f.close()

    style_id = r.json()["id"]
    print(f"Style ID: {style_id}")

    if save_id_path:
        with open(save_id_path, "w") as f:
            f.write(style_id)
        print(f"Saved to: {save_id_path}")

    return style_id


def main():
    parser = argparse.ArgumentParser(description="Create a custom Recraft style (40 credits)")
    parser.add_argument("images", nargs="+", help="Reference image files (1–5)")
    parser.add_argument("--base", required=True, choices=BASE_STYLES,
                        help="Base style category")
    parser.add_argument("--save-id", metavar="FILE",
                        help="Save the style UUID to this file for later reuse")
    args = parser.parse_args()

    try:
        create_style(args.base, args.images, args.save_id)
    except requests.HTTPError as e:
        print(f"API error {e.response.status_code}: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
