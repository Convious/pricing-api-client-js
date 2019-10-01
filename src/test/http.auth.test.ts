import test from 'ava'
import nock = require('nock')
import * as uuid from 'uuid'
import { SimpleHttpService, AuthenticatedHttpService, OAuthService } from '../app/http'
import { Mock, Times } from 'typemoq'

test.beforeEach(t => nock.cleanAll())

function createSut(oauth: OAuthService) {
  return new AuthenticatedHttpService(new SimpleHttpService(), oauth)
}

test('Should append Authorization header obtained from oauth service', async t => {
  const url = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(expectedStatus, expectedResponse)

  const sut = createSut(oauth.object)
  const response = await sut.fetch(url)
  const body = await response.text()

  t.is(response.status, expectedStatus)
  t.deepEqual(body, expectedResponse)
})

test('Should not clear other headers when setting Authorization header', async t => {
  const url = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)
  const headerKey = uuid.v4()
  const headerValue = uuid.v4()

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))

  nock(url)
    .matchHeader(headerKey, headerValue)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(expectedStatus, expectedResponse)

  const sut = createSut(oauth.object)
  const response = await sut.fetch(url, { headers: { [headerKey]: headerValue }})
  const body = await response.text()

  t.is(response.status, expectedStatus)
  t.deepEqual(body, expectedResponse)
})

test('Should reuse token after obtaining it', async t => {
  const url = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/first')
    .reply(200, uuid.v4())

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/second')
    .reply(expectedStatus, expectedResponse)

  const sut = createSut(oauth.object)
  await sut.fetch(`${url}/first`)
  const response = await sut.fetch(`${url}/second`)
  const body = await response.text()

  t.is(response.status, expectedStatus)
  t.deepEqual(body, expectedResponse)
  oauth.verify(x => x.login(), Times.once())
})

test('Should refresh token if the server responds with HTTP 401 and retry', async t => {
  const url = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const newAccessToken = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))
  oauth.setup(x => x.login()).returns(() => Promise.resolve(newAccessToken))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(401)

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + newAccessToken)
    .get('/')
    .reply(expectedStatus, expectedResponse)

  const sut = createSut(oauth.object)
  const response = await sut.fetch(url)
  const body = await response.text()

  t.is(response.status, expectedStatus)
  t.deepEqual(body, expectedResponse)
})

test('Should return original response if token refresh fails', async t => {
  const url = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const expectedResponse = uuid.v4()

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))
  oauth.setup(x => x.login()).returns(() => Promise.reject(new Error('Authorization failed')))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(401, expectedResponse)

  const sut = createSut(oauth.object)
  const response = await sut.fetch(url)
  const body = await response.text()

  t.is(response.status, 401)
  t.deepEqual(body, expectedResponse)
})

test('Should return failed response if fetch fails after refresh and keep cached auth token', async t => {
  const url = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const newAccessToken = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))
  oauth.setup(x => x.login()).returns(() => Promise.resolve(newAccessToken))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/first')
    .reply(401)

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + newAccessToken)
    .get('/first')
    .replyWithError('Something went horribly wrong')

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + newAccessToken)
    .get('/second')
    .reply(expectedStatus, expectedResponse)

  const sut = createSut(oauth.object)

  await t.throwsAsync(() => sut.fetch(`${url}/first`))
  const response = await sut.fetch(`${url}/second`)
  const body = await response.text()
  t.is(response.status, expectedStatus)
  t.deepEqual(body, expectedResponse)
})

test('Should do a single refresh for parallel requests hitting an expired auth token', async t => {
  const url = 'http://' + uuid.v4()
  const url2 = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const newAccessToken = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)
  const expectedResponse2 = uuid.v4()
  const expectedStatus2 = 200 + Math.floor(Math.random() * 99)

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))
  oauth.setup(x => x.login()).returns(() => Promise.resolve(newAccessToken))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(401)

  nock(url2)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(401)

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + newAccessToken)
    .get('/')
    .reply(expectedStatus, expectedResponse)

  nock(url2)
    .matchHeader('Authorization', 'Bearer ' + newAccessToken)
    .get('/')
    .reply(expectedStatus2, expectedResponse2)

  const sut = createSut(oauth.object)
  const request1 = sut.fetch(url)
  const request2 = sut.fetch(url2)
  const [response1, response2] = await Promise.all([request1, request2])
  const [body1, body2] = await Promise.all([response1.text(), response2.text()])

  t.is(response1.status, expectedStatus)
  t.is(response2.status, expectedStatus2)
  t.deepEqual(body1, expectedResponse)
  t.deepEqual(body2, expectedResponse2)
  oauth.verify((x: OAuthService) => x.login(), Times.exactly(2))
})

test('Should do multiple refreshes for sequential requests hitting an expired auth token', async t => {
  const url = 'http://' + uuid.v4()
  const url2 = 'http://' + uuid.v4()
  const accessToken = uuid.v4()
  const accessToken2 = uuid.v4()
  const accessToken3 = uuid.v4()
  const expectedResponse = uuid.v4()
  const expectedStatus = 200 + Math.floor(Math.random() * 99)
  const expectedResponse2 = uuid.v4()
  const expectedStatus2 = 200 + Math.floor(Math.random() * 99)

  const oauth = Mock.ofType<OAuthService>()
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken))
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken2))
  oauth.setup(x => x.login()).returns(() => Promise.resolve(accessToken3))

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken)
    .get('/')
    .reply(401)

  nock(url2)
    .matchHeader('Authorization', 'Bearer ' + accessToken2)
    .get('/')
    .reply(401)

  nock(url)
    .matchHeader('Authorization', 'Bearer ' + accessToken2)
    .get('/')
    .reply(expectedStatus, expectedResponse)

  nock(url2)
    .matchHeader('Authorization', 'Bearer ' + accessToken3)
    .get('/')
    .reply(expectedStatus2, expectedResponse2)

  const sut = createSut(oauth.object)
  const response1 = await sut.fetch(url)
  const response2 = await sut.fetch(url2)
  const [body1, body2] = await Promise.all([response1.text(), response2.text()])

  t.is(response1.status, expectedStatus)
  t.is(response2.status, expectedStatus2)
  t.deepEqual(body1, expectedResponse)
  t.deepEqual(body2, expectedResponse2)
  oauth.verify((x: OAuthService) => x.login(), Times.exactly(3))
})
