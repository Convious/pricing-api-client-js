import 'isomorphic-fetch'

export interface HttpService {
  fetch(url: string, init?: RequestInit): Promise<Response>
}

export class SimpleHttpService implements HttpService {
  fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetch(url, init)
  }
}

export class OAuthService {
  constructor(private http: HttpService, private oauthEndpoint: string, private clientId: string, private clientSecret: string) {}

  async login(): Promise<string> {
    const tokenUrl = `${this.oauthEndpoint}/oauth/token/`
    const response = await this.http.fetch(tokenUrl, {
      method: 'POST',
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    })

    if (!response.ok) {
      const reason = await response.text()
      throw new Error(`Authentication failed: ${reason}`)
    }

    const body = await response.json()
    return body.access_token
  }
}

export class AuthenticatedHttpService implements HttpService {
  private authToken: string|null = null
  private refreshPromise: Promise<string>|null = null

  constructor(private http: HttpService, private oauth: OAuthService) {}

  private async appendAuthHeader(init?: RequestInit): Promise<RequestInit> {
    let token = this.authToken
    if (!token) {
      token = await this.refreshToken()
      this.authToken = token
    }

    init = init || {}
    return {
      ...init,
      headers: {
        ...init.headers,
        'Authorization': `Bearer ${token}`,
      }
    }
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshPromise) {
      return await this.refreshPromise
    }

    try {
      this.refreshPromise = this.oauth.login()
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  async fetch(url: string, init?: RequestInit): Promise<Response> {
    let response = await this.http.fetch(url, await this.appendAuthHeader(init))
    if (response.status !== 401) {
      return response
    }

    let newInit: RequestInit
    try {
      this.authToken = null
      newInit = await this.appendAuthHeader(init)
    } catch (e) {
      return response
    }

    return await this.http.fetch(url, newInit)
  }
}
