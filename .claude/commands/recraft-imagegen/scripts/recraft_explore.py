#!/usr/bin/env python3
"""
Explore diverse image variations using Recraft API.

Commands:
    explore   — Generate a diverse set of explorations from a prompt
                Prints image IDs which can be used with the 'similar' command.
    similar   — Generate variations based on a specific explore result

Usage:
    python recraft_explore.py explore "abstract landscape" out.png
    python recraft_explore.py explore "abstract landscape" out.png --n 4
    python recraft_explore.py similar <image_id_from_explore> variation.png --similarity 3

Note: 'similar' only works with image IDs from an 'explore' call,
      not from regular generation.

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


def explore(prompt, output_path, model="recraftv4", n=1):
    r = requests.post(
        f"{BASE_URL}/images/explore",
        headers={**api_headers(), "Content-Type": "application/json"},
        json={"prompt": prompt, "model": model, "n": n},
    )
    r.raise_for_status()
    images = r.json()["data"]

    if n == 1:
        save_image(images[0], output_path)
        image_id = images[0].get("id", "")
        print(f"Saved: {output_path}")
        if image_id:
            print(f"Image ID (use with 'similar'): {image_id}")
    else:
        base, ext = os.path.splitext(output_path)
        for i, img in enumerate(images):
            path = f"{base}_{i + 1}{ext}"
            save_image(img, path)
            image_id = img.get("id", "")
            print(f"Saved: {path}  ID: {image_id}")


def similar(source_image_id, output_path, similarity=3, n=1):
    r = requests.post(
        f"{BASE_URL}/images/explore/similar",
        headers={**api_headers(), "Content-Type": "application/json"},
        json={"source_image_id": source_image_id, "similarity": similarity, "n": n},
    )
    r.raise_for_status()
    images = r.json()["data"]

    if n == 1:
        save_image(images[0], output_path)
        print(f"Saved: {output_path}")
    else:
        base, ext = os.path.splitext(output_path)
        for i, img in enumerate(images):
            path = f"{base}_{i + 1}{ext}"
            save_image(img, path)
            print(f"Saved: {path}")


def main():
    parser = argparse.ArgumentParser(description="Explore images using Recraft API")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_explore = subparsers.add_parser("explore", help="Generate diverse explorations from a prompt")
    p_explore.add_argument("prompt")
    p_explore.add_argument("output")
    p_explore.add_argument("--model", default="recraftv4")
    p_explore.add_argument("--n", type=int, default=1, choices=range(1, 7))

    p_similar = subparsers.add_parser("similar", help="Generate variations from an explore result")
    p_similar.add_argument("source_image_id", help="Image ID from a prior explore call")
    p_similar.add_argument("output")
    p_similar.add_argument("--similarity", type=int, default=3, choices=range(1, 6),
                           help="Similarity 1–5 (5=closest match)")
    p_similar.add_argument("--n", type=int, default=1, choices=range(1, 7))

    args = parser.parse_args()

    try:
        if args.command == "explore":
            explore(args.prompt, args.output, args.model, args.n)
        else:
            similar(args.source_image_id, args.output, args.similarity, args.n)
    except requests.HTTPError as e:
        print(f"API error {e.response.status_code}: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
