import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { normalizeUrl } from "@/lib/url-utils";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { type, url, fileHash } = body;

    // Validate input
    if (!type || !['file', 'youtube', 'web'].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be 'file', 'youtube', or 'web'" },
        { status: 400 }
      );
    }

    // Check file duplicates by hash
    if (type === 'file' && fileHash) {
      const { data: existing, error } = await supabase
        .from('document_sources')
        .select('id, title, file_name, created_at')
        .eq('file_hash', fileHash)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return NextResponse.json({
        isDuplicate: !!existing,
        existingDocument: existing ? {
          id: existing.id,
          title: existing.title,
          uploadedAt: existing.created_at
        } : null,
        message: existing 
          ? `This file has already been uploaded as "${existing.title}"` 
          : null
      });
    }

    // Check URL duplicates (YouTube or web)
    if ((type === 'youtube' || type === 'web') && url) {
      // Normalize the URL
      const { normalized, type: urlType } = normalizeUrl(url);
      
      if (!normalized) {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }

      if (type === 'youtube' && urlType !== 'youtube') {
        return NextResponse.json(
          { error: "Not a valid YouTube URL" },
          { status: 400 }
        );
      }

      // Check for existing document with this URL
      const { data: existing, error } = await supabase
        .from('document_sources')
        .select('id, title, source_url, created_at')
        .eq('source_url', normalized)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return NextResponse.json({
        isDuplicate: !!existing,
        existingDocument: existing,
        normalizedUrl: normalized,
        message: existing 
          ? `This ${type} has already been added as "${existing.title}"` 
          : null
      });
    }

    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error checking duplicate:", error);
    return NextResponse.json(
      { error: "Failed to check for duplicates" },
      { status: 500 }
    );
  }
}