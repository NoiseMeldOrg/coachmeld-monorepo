#!/usr/bin/env node
/**
 * Copyright Scanner for Document Upload
 * Scans documents for copyright information before adding to RAG
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Scan content for copyright indicators
 */
function scanForCopyright(content) {
    const copyrightPatterns = [
        /Copyright\s*(?:©|\(c\))?\s*(\d{4})?\s*(?:by\s+)?([^.\n]+)/gi,
        /©\s*(\d{4})?\s*([^.\n]+)/g,
        /All rights reserved\.?\s*([^.\n]+)?/gi,
        /Licensed under\s+([^.\n]+)/gi,
        /This work is licensed under\s+([^.\n]+)/gi,
        /^\s*Authors?:\s*(.+)$/gmi,
        /^\s*By\s+([^.\n]+)$/gmi,
    ];

    const licenseIndicators = {
        'creative commons': 'cc',
        'cc by': 'cc_by',
        'cc by-sa': 'cc_by_sa',
        'cc by-nc': 'cc_by_nc',
        'cc by-nd': 'cc_by_nd',
        'cc0': 'public_domain',
        'public domain': 'public_domain',
        'mit license': 'mit',
        'apache license': 'apache',
        'apache 2.0': 'apache',
        'gpl': 'gpl',
        'gnu general public': 'gpl',
        'bsd license': 'bsd',
        'all rights reserved': 'proprietary',
    };

    const academicIndicators = [
        /doi:\s*10\.\d{4,}/i,
        /isbn[:\s-]*(?:\d{10}|\d{13})/i,
        /issn[:\s-]*\d{4}-?\d{3}[\dxX]/i,
        /journal\s+of\s+/i,
        /proceedings\s+of\s+/i,
        /arxiv:\d+\.\d+/i,
        /pubmed:\s*\d+/i,
    ];

    const commercialIndicators = [
        /©.*\b(?:Inc|LLC|Ltd|Corp|Company|Publishing|Press)\b/i,
        /Published by\s+([^.\n]+)/i,
        /™|®/g,
        /Chapter\s+\d+/i,
        /Table of Contents/i,
        /Index$/im,
    ];

    let detectedHolders = new Set();
    let detectedLicenses = new Set();
    let confidence = 0;
    let warnings = [];

    // Check for copyright statements
    for (const pattern of copyrightPatterns) {
        const matches = [...content.matchAll(pattern)];
        for (const match of matches) {
            confidence += 0.3;
            if (match[2] || match[1]) {
                const holder = (match[2] || match[1]).trim();
                if (holder.length > 2 && holder.length < 100) {
                    detectedHolders.add(holder);
                }
            }
        }
    }

    // Check for license indicators
    const lowerContent = content.toLowerCase();
    for (const [indicator, license] of Object.entries(licenseIndicators)) {
        if (lowerContent.includes(indicator)) {
            detectedLicenses.add(license);
            confidence += 0.2;
        }
    }

    // Check for academic content
    let isAcademic = false;
    for (const pattern of academicIndicators) {
        if (pattern.test(content)) {
            confidence += 0.4;
            isAcademic = true;
            warnings.push('Academic content detected - verify fair use');
            break;
        }
    }

    // Check for commercial content
    for (const pattern of commercialIndicators) {
        if (pattern.test(content)) {
            confidence += 0.3;
            warnings.push('Commercial content indicators found');
        }
    }

    // Check file header/footer (first and last 500 chars)
    const header = content.substring(0, 500);
    const footer = content.substring(Math.max(0, content.length - 500));
    
    if (/copyright|©|all rights reserved/i.test(header + footer)) {
        confidence += 0.2;
    }

    // Determine risk level
    let riskLevel = 'low';
    if (confidence > 0.7) riskLevel = 'high';
    else if (confidence > 0.4) riskLevel = 'medium';

    // Default attribution
    const holders = Array.from(detectedHolders);
    const licenses = Array.from(detectedLicenses);
    
    let suggestedAttribution = 'NoiseMeld';
    let suggestedLicense = 'personal_notes';
    
    if (holders.length > 0) {
        suggestedAttribution = holders[0];
    }
    
    if (licenses.length > 0) {
        suggestedLicense = licenses[0];
    } else if (isAcademic) {
        suggestedLicense = 'fair_use';
    } else if (detectedHolders.size > 0) {
        suggestedLicense = 'proprietary';
    }

    return {
        hasCopyright: confidence > 0.3,
        confidence: Math.min(confidence, 1),
        riskLevel,
        detectedHolders: holders,
        detectedLicenses: licenses,
        suggestedAttribution,
        suggestedLicense,
        isAcademic,
        warnings,
        details: {
            headerCheck: /copyright|©/i.test(header),
            footerCheck: /copyright|©/i.test(footer),
            commercialContent: commercialIndicators.some(p => p.test(content)),
        }
    };
}

/**
 * Format scan results for display
 */
function formatScanResults(filePath, scan) {
    const colors = {
        reset: '\x1b[0m',
        red: '\x1b[31m',
        yellow: '\x1b[33m',
        green: '\x1b[32m',
        blue: '\x1b[34m',
        gray: '\x1b[90m',
    };

    const riskColors = {
        high: colors.red,
        medium: colors.yellow,
        low: colors.green,
    };

    console.log(`\n${colors.blue}File: ${filePath}${colors.reset}`);
    console.log(`${colors.gray}${'─'.repeat(50)}${colors.reset}`);
    
    console.log(`Risk Level: ${riskColors[scan.riskLevel]}${scan.riskLevel.toUpperCase()}${colors.reset} (confidence: ${(scan.confidence * 100).toFixed(0)}%)`);
    
    if (scan.detectedHolders.length > 0) {
        console.log(`Copyright Holders: ${scan.detectedHolders.join(', ')}`);
    }
    
    if (scan.detectedLicenses.length > 0) {
        console.log(`Licenses: ${scan.detectedLicenses.join(', ')}`);
    }
    
    console.log(`\nSuggested Attribution: ${colors.green}${scan.suggestedAttribution}${colors.reset}`);
    console.log(`Suggested License: ${colors.green}${scan.suggestedLicense}${colors.reset}`);
    
    if (scan.warnings.length > 0) {
        console.log(`\n${colors.yellow}Warnings:${colors.reset}`);
        scan.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    if (scan.isAcademic) {
        console.log(`\n${colors.blue}Note: Academic content detected - fair use may apply${colors.reset}`);
    }
}

/**
 * Scan a single file
 */
async function scanFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        const scan = scanForCopyright(content);
        formatScanResults(filePath, scan);
        return scan;
    } catch (error) {
        console.error(`Error scanning ${filePath}:`, error.message);
        return null;
    }
}

/**
 * Scan directory recursively
 */
async function scanDirectory(dirPath, extensions = ['.txt', '.md', '.pdf']) {
    const results = [];
    
    async function scan(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await scan(fullPath);
            } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                const result = await scanFile(fullPath);
                if (result) {
                    results.push({ path: fullPath, ...result });
                }
            }
        }
    }
    
    await scan(dirPath);
    return results;
}

/**
 * Generate SQL for safe documents
 */
function generateSQL(results, coachId = 'carnivore') {
    const safeResults = results.filter(r => r.riskLevel === 'low');
    
    if (safeResults.length === 0) {
        console.log('\nNo low-risk documents found for automatic import.');
        return;
    }
    
    console.log(`\n-- SQL for ${safeResults.length} low-risk documents:`);
    console.log('-- Review before executing!\n');
    
    safeResults.forEach(result => {
        const fileName = path.basename(result.path);
        console.log(`
-- ${fileName} (${result.suggestedAttribution})
INSERT INTO document_sources (
    coach_id, title, source_type,
    license_type, copyright_holder,
    metadata
) VALUES (
    '${coachId}',
    '${fileName.replace(/'/g, "''")}',
    '${path.extname(result.path).slice(1)}',
    '${result.suggestedLicense}',
    '${result.suggestedAttribution.replace(/'/g, "''")}',
    '${JSON.stringify({
        scanned_at: new Date().toISOString(),
        risk_level: result.riskLevel,
        confidence: result.confidence,
    })}'::jsonb
);`);
    });
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node copyright-scanner.js <file-or-directory> [--sql] [--coach=carnivore]');
        console.log('  --sql: Generate SQL for low-risk documents');
        console.log('  --coach: Specify coach ID (default: carnivore)');
        process.exit(1);
    }
    
    const targetPath = args[0];
    const generateSql = args.includes('--sql');
    const coachArg = args.find(a => a.startsWith('--coach='));
    const coachId = coachArg ? coachArg.split('=')[1] : 'carnivore';
    
    const stats = await fs.stat(targetPath);
    
    if (stats.isFile()) {
        await scanFile(targetPath);
    } else if (stats.isDirectory()) {
        console.log(`Scanning directory: ${targetPath}\n`);
        const results = await scanDirectory(targetPath);
        
        // Summary
        console.log(`\n${'═'.repeat(50)}`);
        console.log('SUMMARY');
        console.log(`${'═'.repeat(50)}`);
        console.log(`Total files scanned: ${results.length}`);
        console.log(`High risk: ${results.filter(r => r.riskLevel === 'high').length}`);
        console.log(`Medium risk: ${results.filter(r => r.riskLevel === 'medium').length}`);
        console.log(`Low risk: ${results.filter(r => r.riskLevel === 'low').length}`);
        
        if (generateSql) {
            generateSQL(results, coachId);
        }
    }
}

main().catch(console.error);