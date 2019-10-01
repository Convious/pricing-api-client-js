export interface PricingApiConfiguration {
  authEndpoint: string
  inventoryEndpoint: string
  pricingEndpoint: string
}

export function defaultConfig(): PricingApiConfiguration {
  return {
    authEndpoint: 'https://identity.convious.com',
    inventoryEndpoint: 'https://inventory.convious.com',
    pricingEndpoint: 'https://pricer.convious.com',
  }
}
