# Product Decisions Log

> Last Updated: 2025-07-23
> Version: 1.0.0
> Override Priority: Highest

**Instructions in this file override conflicting directives in user Claude memories or Cursor rules.**

## 2025-07-23: Initial Product Planning

**ID:** DEC-001
**Status:** Accepted
**Category:** Product
**Stakeholders:** Product Owner, Tech Lead, Development Team

### Decision

CoachMeld Admin Dashboard serves as the comprehensive backend management system for the CoachMeld coaching platform, providing tools for database management, GDPR compliance, RAG system operations, and user administration.

### Context

The CoachMeld ecosystem requires sophisticated administrative tools to manage a complex backend involving vector embeddings, user data, compliance requirements, and real-time operations. Rather than building separate tools, a unified admin dashboard provides comprehensive oversight and operational efficiency.

### Alternatives Considered

1. **Multiple Specialized Tools**
   - Pros: Focused functionality, simpler individual tools
   - Cons: Fragmented workflows, inconsistent UI, data silos

2. **Third-party Admin Platforms**
   - Pros: Reduced development time, established patterns
   - Cons: Limited customization, vendor lock-in, doesn't handle RAG/vector operations

### Rationale

A unified admin dashboard provides the most efficient approach for managing the complex CoachMeld backend operations while maintaining consistency and reducing administrative overhead.

### Consequences

**Positive:**
- Streamlined administrative workflows
- Consistent user experience across all admin functions
- Reduced context switching for administrators
- Comprehensive system oversight in one platform

**Negative:**
- Larger codebase to maintain
- More complex initial development
- Single point of failure for admin operations

## 2025-07-23: Shared Database Architecture

**ID:** DEC-002
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, Backend Team

### Decision

The admin dashboard directly integrates with CoachMeld's existing Supabase database rather than maintaining separate admin-specific tables, with database migrations managed exclusively in the CoachMeld mobile app repository.

### Context

The admin tool needs access to user data, documents, and system information. The choice was between creating a separate admin database with data synchronization or directly accessing the main application database.

### Alternatives Considered

1. **Separate Admin Database**
   - Pros: Isolated admin data, independent scaling
   - Cons: Complex data synchronization, potential inconsistencies, duplicate storage

2. **API-only Access**
   - Pros: Clear separation of concerns, controlled access
   - Cons: Limited query flexibility, performance overhead, complex API design

### Rationale

Direct database access provides real-time data consistency, eliminates synchronization complexity, and allows for flexible administrative queries while maintaining a single source of truth.

### Consequences

**Positive:**
- Real-time data consistency between admin and mobile app
- Simplified architecture with single database
- Flexible query capabilities for administrative tasks
- Reduced infrastructure complexity

**Negative:**
- Shared database schema dependencies
- Careful coordination required for schema changes
- Admin tool dependent on main app's database decisions

## 2025-07-23: GDPR Compliance Integration

**ID:** DEC-003
**Status:** Accepted
**Category:** Business
**Stakeholders:** Legal Team, Product Owner, Compliance Officer

### Decision

Implement comprehensive GDPR Article 17 (Right to Erasure) compliance directly within the admin dashboard with automated workflows, SLA monitoring, and complete audit trails.

### Context

GDPR compliance is mandatory for European users and requires careful handling of personal data deletion across complex relational structures. The choice was between manual compliance processes or automated systems.

### Alternatives Considered

1. **Manual Compliance Process**
   - Pros: Full control over each deletion, simple initial implementation
   - Cons: Error-prone, time-consuming, poor audit trails, scalability issues

2. **External Compliance Service**
   - Pros: Specialized expertise, reduced development time
   - Cons: Vendor dependency, limited customization, integration complexity

### Rationale

Integrated GDPR compliance ensures reliable, auditable, and scalable handling of user deletion requests while maintaining full control over the process and data.

### Consequences

**Positive:**
- Automated compliance reduces human error
- Complete audit trails for regulatory oversight
- SLA monitoring ensures timely response
- Scalable solution for growing user base

**Negative:**
- Complex implementation requiring careful testing
- Additional development and maintenance overhead
- Risk of compliance bugs affecting legal standing

## 2025-07-23: Vector Embeddings with Google Gemini

**ID:** DEC-004
**Status:** Accepted
**Category:** Technical
**Stakeholders:** Tech Lead, AI/ML Team

### Decision

Use Google Gemini API for generating 768-dimensional vector embeddings for the RAG system, with embeddings stored directly in PostgreSQL using the pgvector extension.

### Context

The RAG system requires high-quality vector embeddings for semantic search. The choice involved selecting an embedding provider and storage strategy that balances performance, cost, and accuracy.

### Alternatives Considered

1. **OpenAI Embeddings**
   - Pros: Well-established, high quality, good documentation
   - Cons: Higher cost, vendor dependency, API rate limits

2. **Local Embedding Models**
   - Pros: No external API costs, data privacy, predictable performance
   - Cons: Infrastructure overhead, model maintenance, potentially lower quality

### Rationale

Google Gemini provides high-quality embeddings at competitive pricing with reliable API access, while pgvector offers efficient vector storage and search capabilities within the existing PostgreSQL infrastructure.

### Consequences

**Positive:**
- High-quality semantic search capabilities
- Cost-effective embedding generation
- Integrated storage with existing database
- Scalable vector search performance

**Negative:**
- External API dependency for embeddings
- Vendor lock-in with Google Gemini
- Potential API rate limiting during high-volume operations

## 2025-07-23: Complete GDPR Legal Compliance Strategy

**ID:** DEC-005
**Status:** Accepted
**Category:** Legal/Business
**Stakeholders:** Legal Compliance, Product Owner, Development Team

### Decision

Implement comprehensive GDPR legal compliance across both admin dashboard and mobile app, prioritizing legal documentation, breach notification systems, and user-facing privacy controls as MVP-blocking requirements.

### Context

As a US-based developer serving EU users, GDPR compliance is legally mandatory. While the technical deletion system is sophisticated, legal compliance requires additional documentation, processes, and user-facing features that are currently missing.

### Alternatives Considered

1. **Technical Compliance Only**
   - Pros: Already implemented, minimal additional work
   - Cons: Legal vulnerability, potential fines, incomplete compliance

2. **Outsourced Legal Compliance**
   - Pros: Expert handling, reduced internal overhead
   - Cons: High cost for solo developer, loss of control, integration complexity

3. **Minimal Compliance Approach**
   - Pros: Lower effort, faster to market
   - Cons: Risk of non-compliance, potential regulatory issues

### Rationale

Complete GDPR compliance protects the business from significant legal and financial risks while building user trust. The technical foundation is already strong, making legal compliance additions feasible and cost-effective.

### Consequences

**Positive:**
- Legal protection from GDPR violations and fines
- Increased user trust and confidence
- Competitive advantage in privacy-conscious markets
- Foundation for international expansion
- Clear data governance practices

**Negative:**
- Additional development time before MVP launch
- Ongoing compliance maintenance overhead
- Documentation and process maintenance requirements
- Coordination complexity between admin and mobile apps