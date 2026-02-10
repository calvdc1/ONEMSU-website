#!/usr/bin/env bash
# Exit on error
set -o errexit

# Build React Frontend
npm install
npm run build

# Install Python Dependencies
pip install -r requirements.txt
