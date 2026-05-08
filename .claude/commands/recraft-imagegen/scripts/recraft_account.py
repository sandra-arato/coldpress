#!/usr/bin/env python3
"""
Check Recraft API account info and remaining credits.

Usage:
    python recraft_account.py

Environment:
    RECRAFT_API_KEY — required, read from .env if present
"""

import os
import sys

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "https://external.api.recraft.ai/v1"


def main():
    key = os.environ.get("RECRAFT_API_KEY")
    if not key:
        print("Error: RECRAFT_API_KEY not set. Add it to your .env file.", file=sys.stderr)
        sys.exit(1)

    try:
        r = requests.get(
            f"{BASE_URL}/users/me",
            headers={"Authorization": f"Bearer {key}"},
        )
        r.raise_for_status()
        user = r.json()
        credits = user.get("credits", 0)
        print(f"Name:    {user.get('name', 'N/A')}")
        print(f"Email:   {user.get('email', 'N/A')}")
        print(f"Credits: {credits} API units  (~${credits / 1000:.2f} USD remaining)")
    except requests.HTTPError as e:
        print(f"API error {e.response.status_code}: {e.response.text}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
