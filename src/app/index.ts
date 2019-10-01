import { PricingApiClient } from './client'
import { SimpleHttpService, AuthenticatedHttpService, OAuthService } from './http'
import { defaultConfig, PricingApiConfiguration } from './config'

export function createClient(clientId: string, clientSecret: string, configuration: Partial<PricingApiConfiguration> = {}) {
  const config = { ...defaultConfig(), ...configuration }
  const simpleHttp = new SimpleHttpService()
  const oauth = new OAuthService(simpleHttp, config.authEndpoint, clientId, clientSecret)
  const http = new AuthenticatedHttpService(simpleHttp, oauth)
  return new PricingApiClient(http, config)
}

export default createClient
