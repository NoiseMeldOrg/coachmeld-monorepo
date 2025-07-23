#!/bin/bash

# Script to upload all coach basics documents to RAG system
# First, ensure the RAG system is clean

echo "🧹 Cleaning RAG system first..."
echo "Please run the following SQL in Supabase:"
echo "cat scripts/clean-rag-system.sql"
echo ""
echo "Press Enter when you've cleaned the database..."
read

echo "📚 Uploading diet-specific basics documents..."
echo ""

# Upload each diet's basics document
echo "📎 Uploading carnivore-basics.md..."
node scripts/add-document-to-rag.js "coach-content/carnivore/carnivore-basics.md" \
    --coach carnivore \
    --title "Carnivore Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading carnivore-basics.md to carnivore-pro..."
node scripts/add-document-to-rag.js "coach-content/carnivore/carnivore-basics.md" \
    --coach carnivore-pro \
    --title "Carnivore Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading paleo-basics.md..."
node scripts/add-document-to-rag.js "coach-content/paleo/paleo-basics.md" \
    --coach paleo \
    --title "Paleo Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading lowcarb-basics.md..."
node scripts/add-document-to-rag.js "coach-content/lowcarb/lowcarb-basics.md" \
    --coach lowcarb \
    --title "Low Carb Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading keto-basics.md..."
node scripts/add-document-to-rag.js "coach-content/keto/keto-basics.md" \
    --coach keto \
    --title "Keto Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading ketovore-basics.md..."
node scripts/add-document-to-rag.js "coach-content/ketovore/ketovore-basics.md" \
    --coach ketovore \
    --title "Ketovore Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading lion-basics.md..."
node scripts/add-document-to-rag.js "coach-content/lion/lion-basics.md" \
    --coach lion \
    --title "Lion Diet Basics Guide" \
    --type guide

echo ""
echo "📚 Now uploading PHD Guidebook to all diet coaches..."
echo ""

# Upload PHD guidebook to all diet coaches
./scripts/add-shared-document.sh "coach-content/shared/Comprehensive Summary of the Proper Human Diet (PHD) Guidebook.md" "Proper Human Diet (PHD) Comprehensive Guide"

echo ""
echo "✅ All documents uploaded successfully!"