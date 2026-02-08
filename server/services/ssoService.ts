import { db } from "../db";
import { sql } from "drizzle-orm";

export type SsoProviderType = 'saml' | 'oidc';

export interface SsoProviderConfig {
  id: string;
  organizationId: string;
  providerType: SsoProviderType;
  displayName: string;
  issuerUrl?: string;
  metadataUrl?: string;
  clientId?: string;
  certificate?: string;
  attributeMapping: Record<string, string>;
  isActive: boolean;
  enforceSso: boolean;
  allowedDomains: string[];
}

class SsoService {
  /**
   * Get SSO provider for an organization
   */
  async getProvider(organizationId: string): Promise<SsoProviderConfig | null> {
    const result = await db.execute(sql`
      SELECT * FROM sso_providers
      WHERE organization_id = ${organizationId}::uuid AND is_active = true
      LIMIT 1
    `);

    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRow(result.rows[0] as any);
  }

  /**
   * Check if SSO is enforced for a given email domain
   */
  async isEnforcedForDomain(email: string): Promise<SsoProviderConfig | null> {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return null;

    const result = await db.execute(sql`
      SELECT * FROM sso_providers
      WHERE is_active = true
      AND enforce_sso = true
      AND ${domain} = ANY(allowed_domains)
      LIMIT 1
    `);

    if (!result.rows || result.rows.length === 0) return null;
    return this.mapRow(result.rows[0] as any);
  }

  /**
   * Create or update SSO provider configuration
   */
  async upsertProvider(config: Omit<SsoProviderConfig, 'id'>): Promise<string> {
    const result = await db.execute(sql`
      INSERT INTO sso_providers (
        organization_id, provider_type, display_name, issuer_url, metadata_url,
        client_id, certificate, attribute_mapping, is_active, enforce_sso, allowed_domains
      ) VALUES (
        ${config.organizationId}::uuid,
        ${config.providerType},
        ${config.displayName},
        ${config.issuerUrl || null},
        ${config.metadataUrl || null},
        ${config.clientId || null},
        ${config.certificate || null},
        ${JSON.stringify(config.attributeMapping)}::jsonb,
        ${config.isActive},
        ${config.enforceSso},
        ${sql`ARRAY[${sql.join(config.allowedDomains.map(d => sql`${d}`), sql`, `)}]::text[]`}
      )
      ON CONFLICT (organization_id, provider_type) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        issuer_url = EXCLUDED.issuer_url,
        metadata_url = EXCLUDED.metadata_url,
        client_id = EXCLUDED.client_id,
        certificate = EXCLUDED.certificate,
        attribute_mapping = EXCLUDED.attribute_mapping,
        is_active = EXCLUDED.is_active,
        enforce_sso = EXCLUDED.enforce_sso,
        allowed_domains = EXCLUDED.allowed_domains,
        updated_at = now()
      RETURNING id
    `);

    return (result.rows?.[0] as any)?.id;
  }

  /**
   * Deactivate SSO provider
   */
  async deactivate(organizationId: string): Promise<void> {
    await db.execute(sql`
      UPDATE sso_providers SET is_active = false, updated_at = now()
      WHERE organization_id = ${organizationId}::uuid
    `);
  }

  /**
   * Validate SAML assertion (stub — requires xml-crypto in production)
   */
  async validateSamlAssertion(_provider: SsoProviderConfig, _assertion: string): Promise<{ email: string; name: string } | null> {
    // TODO: Implement SAML assertion validation with xml-crypto
    // This is a placeholder for the actual SAML validation logic
    console.warn('[SSO] SAML validation not yet implemented — requires xml-crypto dependency');
    return null;
  }

  /**
   * Exchange OIDC authorization code (stub — requires actual HTTP calls)
   */
  async exchangeOidcCode(_provider: SsoProviderConfig, _code: string, _redirectUri: string): Promise<{ email: string; name: string } | null> {
    // TODO: Implement OIDC code exchange
    // 1. POST to token endpoint with code + client_secret
    // 2. Validate id_token
    // 3. Extract user claims
    console.warn('[SSO] OIDC code exchange not yet implemented');
    return null;
  }

  private mapRow(row: any): SsoProviderConfig {
    return {
      id: row.id,
      organizationId: row.organization_id,
      providerType: row.provider_type,
      displayName: row.display_name,
      issuerUrl: row.issuer_url,
      metadataUrl: row.metadata_url,
      clientId: row.client_id,
      certificate: row.certificate,
      attributeMapping: row.attribute_mapping || {},
      isActive: row.is_active,
      enforceSso: row.enforce_sso,
      allowedDomains: row.allowed_domains || [],
    };
  }
}

export const ssoService = new SsoService();
