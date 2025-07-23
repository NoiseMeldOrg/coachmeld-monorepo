#!/bin/bash

# Script to add a document to multiple coaches
# Usage: ./scripts/add-shared-document.sh "path/to/document.md" "Document Title"

DOCUMENT_PATH="$1"
TITLE="$2"

if [ -z "$DOCUMENT_PATH" ] || [ -z "$TITLE" ]; then
    echo "Usage: $0 <document-path> <title>"
    exit 1
fi

# All diet coaches that should have access to PHD guidebook
COACHES=("carnivore" "carnivore-pro" "paleo" "lowcarb" "keto" "ketovore" "lion")

echo "🚀 Adding '$TITLE' to all diet coaches..."
echo ""

for coach in "${COACHES[@]}"; do
    echo "📎 Adding to $coach coach..."
    node scripts/add-document-to-rag.js "$DOCUMENT_PATH" \
        --coach "$coach" \
        --title "$TITLE" \
        --type guide \
        --description "Comprehensive guide to proper human nutrition principles"
    echo ""
done

echo "✅ Document added to all diet coaches!"