#!/usr/bin/env python3
"""
Edit images using Recraft API. Most operations require V3/V3-vector models.

Operations:
    img2img      — Transform an image with a prompt (requires --strength)
    inpaint      — Regenerate a masked region (requires --mask)
    replace-bg   — Replace the background with a prompted scene
    generate-bg  — Generate background in a masked area (requires --mask)
    erase        — Erase a masked region cleanly (requires --mask)
    variate      — Remix/variate an image (requires --size)

Mask convention: white pixels = region to modify, black pixels = keep intact.

Usage:
    python recraft_edit.py --operation img2img input.png out.png --prompt "winter" --strength 0.5
    python recraft_edit.py --operation inpaint input.png out.png --mask mask.png --prompt "glowing moon"
    python recraft_edit.py --operation replace-bg input.png out.png --prompt "forest at dusk"
    python recraft_edit.py --operation generate-bg input.png out.png --mask mask.png --prompt "city skyline"
    python recraft_edit.py --operation erase input.png out.png --mask mask.png
    python recraft_edit.py --operation variate input.png out.png --size 1024x1024

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

EDIT_MODELS = ["recraftv3", "recraftv3_vector"]

ENDPOINTS = {
    "img2img": "/images/imageToImage",
    "inpaint": "/images/inpaint",
    "replace-bg": "/images/replaceBackground",
    "generate-bg": "/images/generateBackground",
    "erase": "/images/eraseRegion",
    "variate": "/images/variateImage",
}


def api_headers():
    key = os.environ.get("RECRAFT_API_KEY")
    if not key:
        raise EnvironmentError("RECRAFT_API_KEY not set. Add it to your .env file.")
    return {"Authorization": f"Bearer {key}"}


def save_response_image(result: dict, path: str):
    # Most ops return {"data": [{url, b64_json}]}, variate/erase may differ
    if "data" in result:
        img = result["data"][0]
    elif "image" in result:
        img = result["image"]
    else:
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


def edit(operation, image_path, output_path, prompt=None, mask_path=None,
         strength=None, size=None, model="recraftv3", style=None,
         negative_prompt=None, n=1):
    endpoint = BASE_URL + ENDPOINTS[operation]

    files = {"image": open(image_path, "rb")}
    data = {}

    if mask_path:
        files["mask"] = open(mask_path, "rb")
    if prompt:
        data["prompt"] = prompt
    if strength is not None:
        data["strength"] = str(strength)
    if size:
        data["size"] = size
    if style:
        data["style"] = style
    if negative_prompt:
        data["negative_prompt"] = negative_prompt
    if n > 1:
        data["n"] = str(n)
    if operation not in ("erase", "variate"):
        data["model"] = model

    try:
        r = requests.post(endpoint, headers=api_headers(), files=files, data=data)
        r.raise_for_status()
    finally:
        for f in files.values():
            f.close()

    result = r.json()

    if n == 1:
        save_response_image(result, output_path)
        print(f"Saved: {output_path}")
    else:
        images = result.get("data", [result.get("image")])
        base, ext = os.path.splitext(output_path)
        for i, img in enumerate(images):
            path = f"{base}_{i + 1}{ext}"
            if img.get("b64_json"):
                with open(path, "wb") as f:
                    f.write(base64.b64decode(img["b64_json"]))
            elif img.get("url"):
                resp = requests.get(img["url"])
                resp.raise_for_status()
                with open(path, "wb") as f:
                    f.write(resp.content)
            print(f"Saved: {path}")


def main():
    parser = argparse.ArgumentParser(description="Edit images using Recraft API")
    parser.add_argument("--operation", "-op", required=True, choices=list(ENDPOINTS.keys()))
    parser.add_argument("input", help="Input image file path")
    parser.add_argument("output", help="Output file path")
    parser.add_argument("--prompt", "-p", help="Text prompt")
    parser.add_argument("--mask", help="Mask image (white=modify, black=keep)")
    parser.add_argument("--strength", type=float,
                        help="Transformation strength 0.0–1.0 (img2img only)")
    parser.add_argument("--size", "-s", help="Output dimensions for variate (e.g., 1024x1024)")
    parser.add_argument("--model", "-m", default="recraftv3", choices=EDIT_MODELS)
    parser.add_argument("--style", help="Style name (e.g., 'Illustration')")
    parser.add_argument("--negative-prompt", help="Elements to exclude")
    parser.add_argument("--n", type=int, default=1, choices=range(1, 7))
    args = parser.parse_args()

    if args.operation == "img2img" and args.strength is None:
        parser.error("--strength is required for img2img (e.g., 0.5)")
    if args.operation in ("inpaint", "generate-bg", "erase") and not args.mask:
        parser.error(f"--mask is required for {args.operation}")
    if args.operation == "variate" and not args.size:
        parser.error("--size is required for variate (e.g., 1024x1024)")

    try:
        edit(
            operation=args.operation,
            image_path=args.input,
            output_path=args.output,
            prompt=args.prompt,
            mask_path=args.mask,
            strength=args.strength,
            size=args.size,
            model=args.model,
            style=args.style,
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
