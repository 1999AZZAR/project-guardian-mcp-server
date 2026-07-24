#!/usr/bin/env bash
# Wrapper for Trivy container scanning

set -euo pipefail

IMAGE_NAME=$1

if [ -z "$IMAGE_NAME" ]; then
    echo "Usage: $0 <image_name>" >&2
    exit 2
fi

if ! command -v trivy &> /dev/null; then
    echo "Trivy not found. Install it from https://aquasecurity.github.io/trivy/" >&2
    exit 2
fi

echo "Scanning image: $IMAGE_NAME..."
trivy image --severity HIGH,CRITICAL --exit-code 1 --quiet -- "$IMAGE_NAME"
