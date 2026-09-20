// ==========================================================
// VARIS AI — Entitlement & Subscription Verification System
// Verifies user subscriptions, enterprise licenses, and external
// identity entitlements (Google GIS / OAuth enterprise status).
// ==========================================================

export const ENTITLEMENT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  NOT_VERIFIED: 'NOT_VERIFIED',
  UNKNOWN: 'UNKNOWN',
  EXPIRED: 'EXPIRED',
});

export const VARIS_PLANS = Object.freeze({
  FREE: {
    id: 'free',
    name: 'Free Starter',
    allowed_tiers: ['free'],
    monthly_credits: 100,
    rate_limit_rpm: 15,
    max_context_tokens: 32_000,
    features: ['Standard AI Chat', 'Community Tools', 'Web Search (Standard)'],
  },
  PRO: {
    id: 'pro',
    name: 'Pro Developer',
    allowed_tiers: ['free', 'pro'],
    monthly_credits: 3000,
    rate_limit_rpm: 60,
    max_context_tokens: 128_000,
    features: ['Frontier Models (GPT-4o, Gemini 1.5 Pro, LLaMA 3.3)', 'Real-time Voice Mode', 'Document & Code Analysis', 'Priority Routing'],
  },
  ULTRA: {
    id: 'ultra',
    name: 'Ultra AI Power',
    allowed_tiers: ['free', 'pro', 'ultra'],
    monthly_credits: 10000,
    rate_limit_rpm: 120,
    max_context_tokens: 1_000_000,
    features: ['Reasoning Models (o3-mini, Gemini 1.5 Pro 2M)', 'Deep Research Agent', 'Unlimited Projects', 'Custom AI Sidecars'],
  },
});

export class EntitlementSystem {
  constructor({ repository, logger } = {}) {
    this.repository = repository;
    this.logger = logger;
  }

  /**
   * Verify third-party external entitlement (e.g. Google Workspace / Google One AI Premium).
   * Note: Google OAuth GIS tokens provide identity, NOT Gemini Pro enterprise developer API keys.
   * We return NOT_VERIFIED / UNKNOWN unless an enterprise verifiable license is present.
   */
  async verifyGoogleEntitlement(user) {
    if (!user || !user.google_id) {
      return {
        status: ENTITLEMENT_STATUS.INACTIVE,
        provider: 'google',
        verified: false,
        message: 'No Google identity linked to this account.',
      };
    }

    // Google OAuth standard GIS does not expose third-party Gemini Pro API entitlement
    // All AI quota is strictly governed by VARIS platform subscriptions
    return {
      status: ENTITLEMENT_STATUS.NOT_VERIFIED,
      provider: 'google',
      verified: false,
      google_id: user.google_id,
      email: user.email,
      message: 'Google identity authenticated. AI model access is governed by VARIS workspace plan.',
      entitlement_tier: 'standard',
    };
  }

  /**
   * Get effective plan and feature access for a user
   */
  async getEffectiveUserPlan(userId) {
    if (!userId || !this.repository?.getUserSubscription) {
      return VARIS_PLANS.FREE;
    }

    try {
      const sub = await this.repository.getUserSubscription(userId);
      const planId = sub?.plan_id || 'free';
      return VARIS_PLANS[planId.toUpperCase()] || VARIS_PLANS.FREE;
    } catch (err) {
      this.logger?.warn?.({ err, userId }, 'Failed to fetch user subscription, defaulting to Free');
      return VARIS_PLANS.FREE;
    }
  }

  /**
   * Check if a specific model tier is accessible under user's plan
   */
  isModelAccessible(userPlan, requiredTier) {
    if (!requiredTier || requiredTier === 'free') return true;
    const allowed = userPlan?.allowed_tiers || ['free'];
    return allowed.includes(requiredTier);
  }
}

export function createEntitlementSystem(options = {}) {
  return new EntitlementSystem(options);
}
