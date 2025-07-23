#!/bin/bash

# Script to upload all coach basics documents to RAG system
# Uses the new v2 script that supports multiple coaches

echo "🧹 Cleaning RAG system first..."
echo "Please run the following SQL in Supabase:"
echo "1. Run scripts/clean-rag-system.sql"
echo "2. Run supabase/migrations/009_shared_documents.sql"
echo ""
echo "Press Enter when you've run both scripts..."
read

echo "📚 Uploading diet-specific basics documents..."
echo ""

# Upload each diet's basics document to its specific coach
echo "📎 Uploading carnivore-basics.md to both carnivore coaches..."
node scripts/add-document-to-rag-v2.js "coach-content/carnivore/carnivore-basics.md" \
    --coaches carnivore,carnivore-pro \
    --title "Carnivore Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading paleo-basics.md..."
node scripts/add-document-to-rag-v2.js "coach-content/paleo/paleo-basics.md" \
    --coaches paleo \
    --title "Paleo Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading lowcarb-basics.md..."
node scripts/add-document-to-rag-v2.js "coach-content/lowcarb/lowcarb-basics.md" \
    --coaches lowcarb \
    --title "Low Carb Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading keto-basics.md..."
node scripts/add-document-to-rag-v2.js "coach-content/keto/keto-basics.md" \
    --coaches keto \
    --title "Keto Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading ketovore-basics.md..."
node scripts/add-document-to-rag-v2.js "coach-content/ketovore/ketovore-basics.md" \
    --coaches ketovore \
    --title "Ketovore Diet Basics Guide" \
    --type guide

echo ""
echo "📎 Uploading lion-basics.md..."
node scripts/add-document-to-rag-v2.js "coach-content/lion/lion-basics.md" \
    --coaches lion \
    --title "Lion Diet Basics Guide" \
    --type guide

echo ""
echo "📚 Now uploading PHD Guidebook to all diet coaches (stored only once!)..."
echo ""

# Upload PHD guidebook once, linked to all diet coaches
node scripts/add-document-to-rag-v2.js "coach-content/shared/Comprehensive Summary of the Proper Human Diet (PHD) Guidebook.md" \
    --coaches all-diet \
    --title "Proper Human Diet (PHD) Comprehensive Guide" \
    --type guide \
    --supplied-by "Dr. Ken Berry" \
    --supplier-type "partner_doctor"

echo ""
echo "✅ All documents uploaded successfully!"
echo ""
echo "📊 Summary:"
echo "   - 6 diet-specific basics documents (one per diet)"
echo "   - 1 PHD guidebook (shared by all diet coaches)"
echo "   - Total unique documents: 7"
echo "   - Total coach-document links: 13"