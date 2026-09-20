// ==========================================================
// VARIS CREDITS & BILLING SYSTEM (UNLIMITED MODE)
// All rate limits, tier restrictions, and credit exhaustion removed
// so users can ask unlimited questions anytime.
// ==========================================================

export class CreditManager {
  constructor({ repository } = {}) {
    this.repository = repository;
    this.userRateLimitMap = new Map();
  }

  /**
   * Check if user's subscription tier is allowed to access the model
   */
  checkTierAccess(userPlan, modelTierRequired) {
    if (!modelTierRequired || modelTierRequired === 'free') return true;
    const allowed = userPlan?.allowed_tiers || (userPlan?.plan_id === 'ultra' ? ['free', 'pro', 'ultra'] : userPlan?.plan_id === 'pro' ? ['free', 'pro'] : ['free']);
    return allowed.includes(modelTierRequired);
  }

  /**
   * Estimate credit cost before sending request to provider
   */
  estimateCredits(model, text = '') {
    const baseCost = model?.credit_cost_per_request !== undefined ? model.credit_cost_per_request : 5;
    const lengthBoost = text.length > 2000 ? Math.ceil((text.length - 2000) / 2000) : 0;
    return baseCost + lengthBoost;
  }

  /**
   * Calculate exact credit deduction based on model and actual tokens/tools
   */
  calculateActualCredits({ model, inputTokens = 0, outputTokens = 0, toolCalls = [] }) {
    const base = model?.credit_cost_per_request !== undefined ? model.credit_cost_per_request : 5;
    const tokenAdjustment = Math.ceil(((inputTokens || 0) + (outputTokens || 0)) / 1500);
    const toolAdjustment = Math.min((toolCalls?.length || 0) * 1, 5);
    return Math.max(1, base + tokenAdjustment + toolAdjustment);
  }

  /**
   * Rate Limiter check (Generous RPM limit to allow unlimited chatting)
   */
  checkRateLimit(userId, maxRpm = 1000) {
    const now = Date.now();
    const windowMs = 60_000;
    const timestamps = (this.userRateLimitMap.get(userId) || []).filter(t => now - t < windowMs);

    if (timestamps.length >= maxRpm) {
      const oldest = timestamps[0];
      const waitTimeMs = Math.max(1000, windowMs - (now - oldest));
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(waitTimeMs / 1000),
        message: `Limit request terlampaui. Silakan tunggu ${Math.ceil(waitTimeMs / 1000)} detik.`,
      };
    }

    timestamps.push(now);
    this.userRateLimitMap.set(userId, timestamps);
    return { allowed: true };
  }

  /**
   * Reserve credit before request execution
   */
  async reserveCredit(userId, amount) {
    if (this.repository?.reserveCredits) {
      try {
        return await this.repository.reserveCredits(userId, amount);
      } catch {}
    }
    return { ok: true, reservationId: 'res_' + Date.now(), reservedAmount: amount, balance: 999999, available: 999999 };
  }

  /**
   * Settle credit deduction upon successful completion
   */
  async settleCredit(params) {
    if (this.repository?.settleCredits) {
      try {
        return await this.repository.settleCredits(params);
      } catch {}
    }
    return { ok: true, balance: 999999, deducted: params.actualAmount || 0 };
  }

  /**
   * Refund reserved credit if request fails before response generation
   */
  async refundCredit(params) {
    if (this.repository?.refundCredits) {
      try {
        return await this.repository.refundCredits(params);
      } catch {}
    }
    return { ok: true, refunded: params.reservedAmount || 0 };
  }
}

export function createCreditManager(repository) {
  return new CreditManager({ repository });
}
