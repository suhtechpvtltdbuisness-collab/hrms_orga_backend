export interface IdentityResult {
  identified: boolean;
  matchConfidence?: number;
  person?: {
    name?: string;
    workEmail?: string;
    phone?: string;
    jobTitle?: string;
    linkedinUrl?: string;
  };
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
    employeeCount?: number;
  };
}

export interface IdentityProvider {
  identifyVisitor(input: {
    visitorId: string;
    ip?: string;
    userAgent?: string;
    pageUrl?: string;
  }): Promise<IdentityResult | null>;
  name: string;
}

// ---------------------------------------------------------------------------
// Clearbit Reveal provider (IP → company, optionally person via enrichment)
// ---------------------------------------------------------------------------
class ClearbitProvider implements IdentityProvider {
  name = "clearbit";

  async identifyVisitor(input: {
    visitorId: string;
    ip?: string;
    userAgent?: string;
    pageUrl?: string;
  }): Promise<IdentityResult | null> {
    const apiKey = process.env.VISITOR_IDENTITY_API_KEY;
    const endpoint =
      process.env.VISITOR_IDENTITY_ENDPOINT ||
      "https://reveal.clearbit.com/v1/companies/find";

    if (!apiKey || !input.ip) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const url = `${endpoint}?ip=${encodeURIComponent(input.ip)}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
        },
        signal: controller.signal,
      });

      if (res.status === 404) return { identified: false };
      if (res.status === 429) {
        console.warn("[identity] Clearbit rate limit hit");
        return null;
      }
      if (!res.ok) return null;

      const data = await res.json();
      if (!data || !data.company) return { identified: false };

      return {
        identified: true,
        matchConfidence: 0.7,
        company: {
          name: data.company.name,
          domain: data.company.domain,
          industry: data.company.category?.industry,
          employeeCount: data.company.metrics?.employees,
        },
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("[identity] Clearbit request timed out");
      } else {
        console.error("[identity] Clearbit error:", err.message);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ---------------------------------------------------------------------------
// Apollo.io provider (IP → person + company)
// ---------------------------------------------------------------------------
class ApolloProvider implements IdentityProvider {
  name = "apollo";

  async identifyVisitor(input: {
    visitorId: string;
    ip?: string;
    userAgent?: string;
    pageUrl?: string;
  }): Promise<IdentityResult | null> {
    const apiKey = process.env.VISITOR_IDENTITY_API_KEY;
    const endpoint =
      process.env.VISITOR_IDENTITY_ENDPOINT ||
      "https://api.apollo.io/api/v1/people/match";

    if (!apiKey || !input.ip) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ ip: input.ip }),
        signal: controller.signal,
      });

      if (res.status === 429) {
        console.warn("[identity] Apollo rate limit hit");
        return null;
      }
      if (!res.ok) return null;

      const data = await res.json();
      if (!data || !data.person) return { identified: false };

      const p = data.person;
      const org = data.organization;

      return {
        identified: true,
        matchConfidence: p.confidence ?? 0.6,
        person: {
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || undefined,
          workEmail: p.email,
          phone: p.phone_numbers?.[0]?.sanitized_number,
          jobTitle: p.title,
          linkedinUrl: p.linkedin_url,
        },
        company: org
          ? {
              name: org.name,
              domain: org.primary_domain,
              industry: org.industry,
              employeeCount: org.estimated_num_employees,
            }
          : undefined,
      };
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("[identity] Apollo request timed out");
      } else {
        console.error("[identity] Apollo error:", err.message);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// ---------------------------------------------------------------------------
// No-op provider (when no provider configured)
// ---------------------------------------------------------------------------
class NullProvider implements IdentityProvider {
  name = "none";
  async identifyVisitor(): Promise<IdentityResult | null> {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------
export function createIdentityProvider(): IdentityProvider {
  const providerName = process.env.VISITOR_IDENTITY_PROVIDER?.toLowerCase();
  switch (providerName) {
    case "clearbit":
      return new ClearbitProvider();
    case "apollo":
      return new ApolloProvider();
    default:
      return new NullProvider();
  }
}

let _provider: IdentityProvider | null = null;
export function getIdentityProvider(): IdentityProvider {
  if (!_provider) _provider = createIdentityProvider();
  return _provider;
}
