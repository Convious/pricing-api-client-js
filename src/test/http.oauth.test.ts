import test from 'ava'
import nock = require('nock')
import * as uuid from 'uuid'
import { SimpleHttpService, OAuthService } from '../app/http'

test.beforeEach(t => nock.cleanAll())

function createSut(endpoint: string, clientId: string, clientSecret: string): OAuthService {
  return new OAuthService(new SimpleHttpService(), endpoint, clientId, clientSecret)
}

test('Returns auth token when credentials are correct', async t => {
  const endpoint = `http://${uuid.v4()}`
  const clientId = uuid.v4()
  const clientSecret = uuid.v4()
  const accessToken = uuid.v4()

  nock(endpoint, {
    reqheaders: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).post('/oauth/token/', {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }).reply(200, {
    access_token: accessToken,
  })

  const sut = createSut(endpoint, clientId, clientSecret)
  const result = await sut.login()
  t.is(accessToken, result)
})

test('Fails when credentials are incorrect', async t => {
  const endpoint = `http://${uuid.v4()}`
  const clientId = uuid.v4()
  const clientSecret = uuid.v4()

  nock(endpoint, {
    reqheaders: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).post('/oauth/token/', {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }).reply(400, {
    error: 'Authentication failed for this request',
  })

  const sut = createSut(endpoint, clientId, clientSecret)
  await t.throwsAsync(() => sut.login())
})
