#!/usr/bin/env tsx
import { readdir, readFile, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const COACHMELD_MIGRATIONS_DIR = '../coach-meld/supabase/migrations';
const TYPES_FILE = './types/coachmeld.ts';
const LAST_SYNC_FILE = './.last-migration-sync';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isArray?: boolean;
}

interface TableDefinition {
  name: string;
  columns: TableColumn[];
}

// Map SQL types to TypeScript types
function sqlToTsType(sqlType: string): string {
  const typeMap: Record<string, string> = {
    'uuid': 'string',
    'text': 'string',
    'varchar': 'string',
    'char': 'string',
    'boolean': 'boolean',
    'bool': 'boolean',
    'integer': 'number',
    'int': 'number',
    'bigint': 'number',
    'smallint': 'number',
    'decimal': 'number',
    'numeric': 'number',
    'real': 'number',
    'double precision': 'number',
    'timestamp': 'string',
    'timestamptz': 'string',
    'date': 'string',
    'time': 'string',
    'jsonb': 'any',
    'json': 'any',
    'vector': 'number[]',
    'text[]': 'string[]',
  };

  // Handle vector(dimension) type
  if (sqlType.startsWith('vector(')) {
    return 'number[]';
  }

  return typeMap[sqlType.toLowerCase()] || 'any';
}

// Parse CREATE TABLE statements from SQL
function parseCreateTable(sql: string): TableDefinition[] {
  const tables: TableDefinition[] = [];
  
  // Match CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/gi;
  let match;

  while ((match = tableRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnsText = match[2];
    
    // Skip if it's a view or function
    if (sql.includes(`CREATE OR REPLACE VIEW ${tableName}`) || 
        sql.includes(`CREATE VIEW ${tableName}`)) {
      continue;
    }

    const columns: TableColumn[] = [];
    
    // Parse columns
    const lines = columnsText.split(',').map(line => line.trim());
    for (const line of lines) {
      // Skip constraints, indexes, etc.
      if (line.match(/^(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX)/i)) {
        continue;
      }

      // Parse column definition
      const columnMatch = line.match(/^(\w+)\s+(.+?)(?:\s+(NOT\s+NULL|NULL|DEFAULT|REFERENCES).*)?$/i);
      if (columnMatch) {
        const name = columnMatch[1];
        let type = columnMatch[2].trim();
        const nullable = !line.includes('NOT NULL');
        
        // Clean up type
        type = type.replace(/\s+DEFAULT.*/i, '');
        type = type.replace(/\s+REFERENCES.*/i, '');
        
        columns.push({
          name,
          type: type.toLowerCase(),
          nullable,
          isArray: type.includes('[]')
        });
      }
    }

    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  return tables;
}

// Parse ALTER TABLE statements
function parseAlterTable(sql: string, existingTables: TableDefinition[]): void {
  // Match ALTER TABLE ADD COLUMN statements
  const alterRegex = /ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)\s+(.+?)(?:;|$)/gi;
  let match;

  while ((match = alterRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const columnName = match[2];
    let columnType = match[3].trim();
    
    // Find existing table
    const table = existingTables.find(t => t.name === tableName);
    if (table) {
      const nullable = !columnType.includes('NOT NULL');
      columnType = columnType.replace(/\s+NOT\s+NULL/i, '');
      columnType = columnType.replace(/\s+DEFAULT.*/i, '');
      
      // Add column if it doesn't exist
      if (!table.columns.find(c => c.name === columnName)) {
        table.columns.push({
          name: columnName,
          type: columnType.toLowerCase(),
          nullable,
          isArray: columnType.includes('[]')
        });
      }
    }
  }
}

// Generate TypeScript interface from table definition
function generateInterface(table: TableDefinition): string {
  const interfaceName = table.name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  let output = `export interface ${interfaceName} {\n`;
  
  for (const column of table.columns) {
    const tsType = sqlToTsType(column.type);
    const optional = column.nullable ? '?' : '';
    output += `  ${column.name}${optional}: ${tsType}\n`;
  }
  
  output += '}\n';
  return output;
}

// Get last sync timestamp
async function getLastSyncTime(): Promise<Date | null> {
  try {
    const content = await readFile(LAST_SYNC_FILE, 'utf-8');
    return new Date(content.trim());
  } catch {
    return null;
  }
}

// Save last sync timestamp
async function saveLastSyncTime(): Promise<void> {
  await writeFile(LAST_SYNC_FILE, new Date().toISOString());
}

// Main sync function
async function syncTypes(): Promise<void> {
  console.log('🔄 Checking for new migrations in CoachMeld...');
  
  const lastSync = await getLastSyncTime();
  const migrationFiles = await readdir(COACHMELD_MIGRATIONS_DIR);
  const sqlFiles = migrationFiles.filter(f => f.endsWith('.sql')).sort();
  
  let hasNewMigrations = false;
  const tables: Map<string, TableDefinition> = new Map();
  
  // Read and parse all migration files
  for (const file of sqlFiles) {
    const filePath = join(COACHMELD_MIGRATIONS_DIR, file);
    const fileStat = await stat(filePath);
    
    // Check if file is newer than last sync
    if (lastSync && fileStat.mtime <= lastSync) {
      continue;
    }
    
    hasNewMigrations = true;
    console.log(`📄 Processing migration: ${file}`);
    
    const sql = await readFile(filePath, 'utf-8');
    
    // Parse CREATE TABLE statements
    const newTables = parseCreateTable(sql);
    for (const table of newTables) {
      // Only track document-related tables
      if (table.name.includes('document') || table.name.includes('coach') || 
          table.name.includes('rag') || table.name.includes('embed')) {
        tables.set(table.name, table);
        console.log(`  ✅ Found table: ${table.name}`);
      }
    }
    
    // Parse ALTER TABLE statements
    parseAlterTable(sql, Array.from(tables.values()));
  }
  
  if (!hasNewMigrations) {
    console.log('✅ No new migrations found since last sync');
    return;
  }
  
  // Generate TypeScript file
  console.log('\n📝 Generating TypeScript types...');
  
  let output = `// Types matching CoachMeld's database schema
// IMPORTANT: These types mirror the actual database tables in CoachMeld
// If the database schema changes in CoachMeld, update these types to match
// This is the source of truth for database structure in the admin tool
//
// Last synced: ${new Date().toISOString()}
// Auto-generated from CoachMeld migrations - DO NOT EDIT MANUALLY
// Run: npm run sync-types to update

`;

  // Generate interfaces for each table
  for (const [tableName, table] of Array.from(tables)) {
    output += generateInterface(table);
    output += '\n';
  }

  // Add any custom types that aren't directly from tables
  output += `// View types for displaying grouped documents
export interface DocumentWithSource extends CoachDocuments {
  source?: DocumentSources
}

export interface DocumentGroup {
  source: DocumentSources
  documents: CoachDocuments[]
  totalChunks: number
}

// Search result types
export interface SearchResult {
  id: string
  document_id: string
  content: string
  similarity: number
  metadata?: any
  chunk_index: number
  document_title: string
  source_name?: string
}
`;

  // Write the file
  await writeFile(TYPES_FILE, output);
  await saveLastSyncTime();
  
  console.log(`✅ Updated ${TYPES_FILE}`);
  console.log('\n⚠️  Please review the generated types and adjust if needed');
}

// Run the sync
syncTypes().catch(console.error);