export const STRIPE_PRICE_IDS = {
  starter: 'price_1SlqclHqzD0fpNciXFKIu0o1',
  professional: 'price_1SlqczHqzD0fpNcicovxDN0m',
  premium: 'price_1SlqdMHqzD0fpNcib7LpU0ra'
} as const;

export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price: 29,
    properties: 1,
    unitsPerProperty: 5,
    priceId: STRIPE_PRICE_IDS.starter,
    productId: 'prod_TjJF402Fz7UoVB'
  },
  professional: {
    name: 'Professional',
    price: 59,
    properties: 2,
    unitsPerProperty: 10,
    priceId: STRIPE_PRICE_IDS.professional,
    productId: 'prod_TjJFK60F3qLg02'
  },
  premium: {
    name: 'Premium',
    price: 49,
    properties: 1,
    unitsPerProperty: 15,
    priceId: STRIPE_PRICE_IDS.premium,
    productId: 'prod_TjJFbvPbDQsy3j'
  }
} as const;

export type SubscriptionTierKey = keyof typeof SUBSCRIPTION_TIERS;
