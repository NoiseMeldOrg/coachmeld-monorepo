-- Manual PDF Upload Process
-- Replace the values below with your actual PDF content

-- Step 1: Create a document source entry
INSERT INTO document_sources (
    coach_id,
    title,
    source_type,
    metadata,
    process_status
) VALUES (
    'carnivore', -- Change to your coach ID
    'Your PDF Title Here',
    'pdf',
    jsonb_build_object(
        'title', 'Your PDF Title',
        'author', 'Author Name',
        'access_tier', 'premium', -- or 'free'
        'tags', ARRAY['carnivore', 'research', 'nutrition'],
        'upload_method', 'manual'
    ),
    'completed'
) RETURNING id;

-- Step 2: Copy the returned ID and use it below
-- Let's say the ID is '123e4567-e89b-12d3-a456-426614174000'

-- Step 3: Insert document chunks
-- You'll need to manually copy text from your PDF and create chunks
INSERT INTO coach_documents (
    coach_id,
    source_id,
    title,
    content,
    chunk_index,
    total_chunks,
    metadata,
    is_active
) VALUES 
(
    'carnivore',
    '123e4567-e89b-12d3-a456-426614174000', -- Use the ID from step 1
    'Introduction to Carnivore Diet',
    'First 1000 characters of your PDF text here...',
    0,
    3, -- Total number of chunks you'll create
    '{"section": "introduction"}'::jsonb,
    true
),
(
    'carnivore',
    '123e4567-e89b-12d3-a456-426614174000',
    'Benefits of Carnivore Diet',
    'Next 1000 characters of your PDF text here...',
    1,
    3,
    '{"section": "benefits"}'::jsonb,
    true
),
(
    'carnivore',
    '123e4567-e89b-12d3-a456-426614174000',
    'Implementation Guide',
    'Final chunk of your PDF text here...',
    2,
    3,
    '{"section": "implementation"}'::jsonb,
    true
);