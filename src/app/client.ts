import { HttpService } from './http'
import { InventoryEvent } from './events'
import { PricingApiConfiguration } from './config'

export interface PricingRequestProduct {
  productReference: string
  numberOfItems: number
}

export interface PricingRequest {
  cookieId: string
  ip?: string|null
  dateFrom: Date
  dateTo: Date
  timezone: string
  products: PricingRequestProduct[]
  times?: string[]|null
}

export interface PricingResponseProduct {
  productReference: string
  numberOfItems: number
  price: string
}

export interface PricingResponseItem {
  priceDate: string
  priceTime: string|null
  products: PricingRequestProduct[]
}

export interface PricingResponse {
  prices: PricingResponseItem[]
}

export class PricingApiClient {
  static pricingApiVersion = '1.0.0'
  static inventoryApiVersion = '1.0.0'

  constructor(private http: HttpService, private config: PricingApiConfiguration) {}

  private async fetch(url: string, request: RequestInit): Promise<Response> {
    const response = await this.http.fetch(url, request)

    if (!response.ok) {
      const reason = await response.text()
      throw new Error(`Request to ${url} failed with status code ${response.status}. Response body: ${reason}`)
    }

    return response
  }

  async postEvents(events: InventoryEvent[]): Promise<void> {
    await this.fetch(`${this.config.inventoryEndpoint}/events`, {
      method: 'POST',
      body: JSON.stringify(events),
      headers: {
        'Content-Type': 'application/json',
        'Accept-Version': PricingApiClient.inventoryApiVersion,
      }
    })
  }

  postEvent(event: InventoryEvent): Promise<void> {
    return this.postEvents([event])
  }

  async getPrices(request: PricingRequest): Promise<PricingResponse> {
    const response = await this.fetch(`${this.config.pricingEndpoint}/api/price/rtp`, {
      method: 'POST',
      body: JSON.stringify(request),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Version': PricingApiClient.pricingApiVersion,
      }
    })

    return await response.json()
  }
}
