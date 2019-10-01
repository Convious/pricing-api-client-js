export interface ProductPricing {
  minAcceptedPrice: string|null
  maxAcceptedPrice: string
  averageTargetPrice: string|null
  boxOfficePrice: string|null
}

export interface ProductCreatedEvent {
  type: 'ProductCreated'
  payload: {
    productReference: string
    name: string
    availability: number|null
    pricing: ProductPricing
  }
}

export interface ProductPricingChangedEvent {
  type: 'ProductPricingChanged'
  payload: {
    productReference: string
    pricing: ProductPricing
  }
}

export interface ProductRemovedEvent {
  type: 'ProductRemoved'
  payload: {
    productReference: string
  }
}

export interface ProductAvailabilityChangedEvent {
  type: 'ProductAvailabilityChanged'
  payload: {
    productReference: string
    eventDate: string
    startTime: string|null
    availability: number
  }
}

export type InventoryEvent = ProductCreatedEvent
  | ProductPricingChangedEvent
  | ProductRemovedEvent
  | ProductAvailabilityChangedEvent
