const fs = require('fs');
const pdf = require('pdf-parse');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You need service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadPDF(filePath, coachId, metadata) {
  try {
    // 1. Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // 2. Extract text from PDF
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    // 3. Generate file hash
    const fileHash = crypto.createHash('sha256').update(dataBuffer).digest('hex');
    
    // 4. Create document source record
    const { data: source, error: sourceError } = await supabase
      .from('document_sources')
      .insert({
        coach_id: coachId,
        title: metadata.title || path.basename(filePath),
        source_type: 'pdf',
        file_hash: fileHash,
        file_size_bytes: dataBuffer.length,
        metadata: metadata,
        process_status: 'completed'
      })
      .select()
      .single();
    
    if (sourceError) throw sourceError;
    
    // 5. Chunk the text (simple version - every 1000 characters)
    const chunkSize = 1000;
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - 200) { // 200 char overlap
      chunks.push(text.substring(i, i + chunkSize));
    }
    
    // 6. Insert chunks into coach_documents
    const documents = chunks.map((chunk, index) => ({
      coach_id: coachId,
      source_id: source.id,
      title: `${metadata.title} - Part ${index + 1}`,
      content: chunk,
      chunk_index: index,
      total_chunks: chunks.length,
      metadata: metadata,
      is_active: true
    }));
    
    const { error: docsError } = await supabase
      .from('coach_documents')
      .insert(documents);
    
    if (docsError) throw docsError;
    
    console.log(`✅ Successfully uploaded ${filePath}`);
    console.log(`   Created ${chunks.length} chunks`);
    
  } catch (error) {
    console.error('Error uploading PDF:', error);
  }
}

// Usage example
const filePath = process.argv[2];
const coachId = process.argv[3] || 'carnivore';

if (!filePath) {
  console.log('Usage: node upload-pdf.js <path-to-pdf> [coach-id]');
  process.exit(1);
}

uploadPDF(filePath, coachId, {
  title: path.basename(filePath, '.pdf'),
  access_tier: 'premium',
  author: 'Unknown',
  tags: ['pdf', 'uploaded']
});