#!/usr/bin/env python3
"""
Process images using Recraft API (no generation — pure transforms).

Operations:
    vectorize        — Convert raster PNG/JPG to SVG vector (10 credits)
    remove-bg        — Remove background, returns PNG with transparency (10 credits)
    crisp-upscale    — Increase resolution with sharpness enhancement (4 credits)
    creative-upscale — Upscale with detail/face refinement (250 credits)

Usage:
    python recraft_process.py --operation vectorize input.png output.svg
    python recraft_process.py --operation remove-bg input.png output.png
    python recraft_process.py --operation crisp-upscale input.png output.png
    python recraft_process.py --operation creative-upscale input.png output.png

Environment:
    RECRAFT_API_KEY — required, read from .env if present
"""

import argparse
import base64
import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://external.api.recraft.ai/v1"

OPERATIONS = {
    "vectorize": "/images/vectorize",
    "remove-bg": "/images/removeBackground",
    "crisp-upscale": "/images/crispUpscale",
    "creative-upscale": "/images/creativeUpscale",
}

CREDITS = {
    "vectorize": 10,
    "remove-bg": 10,
    "crisp-upscale": 4,
    "creative-upscale": 250,
}


def api_headers():
    key = os.environ.get("RECRAFT_API_KEY")
    if not key:
        raise EnvironmentError("RECRAFT_API_KEY not set. Add it to your .env file.")
    return {"Authorization": f"Bearer {key}"}


def save_result(result: dict, path: str):
    img = result.get("image")
    if not img:
        raise ValueError(f"Unexpected response keys: {list(result.keys())}")

    if img.get("b64_json"):
        with open(path, "wb") as f:
            f.write(base64.b64decode(img["b64_json"]))
    elif img.get("url"):
        r = requests.get(img["url"])
        r.raise_for_status()
        with open(path, "wb") as f:
            f.write(r.content)
    else:
        raise ValueError("No image data in response")


def process(operation, image_path, output_path):
    endpoint = BASE_URL + OPERATIONS[operation]

    with open(image_path, "rb") as f:
        r = requests.post(
            endpoint,
            headers=api_headers(),
            files={"file": f},
            data={"response_format": "url"},
        )
    r.raise_for_status()

    save_result(r.json(), output_path)
    credits = CREDITS[operation]
    print(f"Saved: {output_path}  ({credits} credits used)")


def main():
    parser = argparse.ArgumentParser(description="Process images using Recraft API")
    parser.add_argument("--operation", "-op", required=True, choices=list(OPERATIONS.keys()))
    parser.add_argument("input", help="Input image file path")
    parser.add_argument("output", help="Output file path")
    args = parser.parse_args()

    if args.operation == "creative-upscale":
        print("Note: creative-upscale costs 250 credits (~$0.25). Proceeding...")

    try:
        process(args.operation, args.input, args.output)
    except requests.HTTPError as e:
        print(f"API error {e.response.status_code}: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
