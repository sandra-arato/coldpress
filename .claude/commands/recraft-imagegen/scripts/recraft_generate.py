#!/usr/bin/env python3
"""
Generate images from text prompts using Recraft API.

Usage:
    python recraft_generate.py "prompt" output.png [options]

Examples:
    python recraft_generate.py "a futuristic city at night" city.png
    python recraft_generate.py "logo for Acme Corp" logo.svg --model recraftv4_vector
    python recraft_generate.py "product photo on white" product.png --model recraftv4_pro --size 1:1
    python recraft_generate.py "cozy illustration" art.png --model recraftv3 --style "Hand-drawn"
    python recraft_generate.py "landscape" out.png --n 4

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

MODELS = [
    "recraftv4", "recraftv4_pro", "recraftv4_vector", "recraftv4_pro_vector",
    "recraftv3", "recraftv3_vector", "recraftv2", "recraftv2_vector",
]


def api_headers():
    key = os.environ.get("RECRAFT_API_KEY")
    if not key:
        raise EnvironmentError("RECRAFT_API_KEY not set. Add it to your .env file.")
    return {"Authorization": f"Bearer {key}"}


def save_image(img: dict, path: str):
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


def generate(prompt, output, model="recraftv4", size=None, style=None,
             style_id=None, negative_prompt=None, n=1):
    payload = {"prompt": prompt, "model": model, "n": n}
    if size:
        payload["size"] = size
    if style:
        payload["style"] = style
    if style_id:
        payload["style_id"] = style_id
    if negative_prompt:
        payload["negative_prompt"] = negative_prompt

    r = requests.post(
        f"{BASE_URL}/images/generations",
        headers={**api_headers(), "Content-Type": "application/json"},
        json=payload,
    )
    r.raise_for_status()
    images = r.json()["data"]

    if n == 1:
        save_image(images[0], output)
        print(f"Saved: {output}")
    else:
        base, ext = os.path.splitext(output)
        for i, img in enumerate(images):
            path = f"{base}_{i + 1}{ext}"
            save_image(img, path)
            print(f"Saved: {path}")


def main():
    parser = argparse.ArgumentParser(description="Generate images using Recraft API")
    parser.add_argument("prompt", help="Text prompt describing the image")
    parser.add_argument("output", help="Output file path (e.g., output.png, output.svg)")
    parser.add_argument("--model", "-m", default="recraftv4", choices=MODELS)
    parser.add_argument("--size", "-s", help="Aspect ratio or dimensions (e.g., 1:1, 16:9, 1024x1024)")
    parser.add_argument("--style", help="Predefined style name (V2/V3 only)")
    parser.add_argument("--style-id", help="Custom style UUID")
    parser.add_argument("--negative-prompt", help="Elements to exclude (V2/V3 only)")
    parser.add_argument("--n", type=int, default=1, choices=range(1, 7),
                        help="Number of images to generate (1-6)")
    args = parser.parse_args()

    try:
        generate(
            prompt=args.prompt,
            output=args.output,
            model=args.model,
            size=args.size,
            style=args.style,
            style_id=args.style_id,
            negative_prompt=args.negative_prompt,
            n=args.n,
        )
    except requests.HTTPError as e:
        print(f"API error {e.response.status_code}: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
