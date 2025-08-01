import nock from 'nock'
import { createTestEvent, createTestIntegration } from '@segment/actions-core'
import Destination from '../../index'
import { BASE_URL, LINKEDIN_SOURCE_PLATFORM } from '../../constants'

const testDestination = createTestIntegration(Destination)

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

const auth: AuthTokens = {
  accessToken: 'test',
  refreshToken: 'test'
}

const event = createTestEvent({
  event: 'Audience Entered',
  type: 'track',
  properties: {
    audience_key: 'personas_test_audience'
  },
  context: {
    device: {
      advertisingId: '123'
    },
    traits: {
      email: 'testing@testing.com'
    }
  }
})

const urlParams = {
  q: 'account',
  account: 'urn:li:sponsoredAccount:123',
  sourceSegmentId: 'personas_test_audience',
  sourcePlatform: LINKEDIN_SOURCE_PLATFORM
}

const updateUsersRequestBody = {
  elements: [
    {
      action: 'ADD',
      userIds: [
        {
          idType: 'SHA256_EMAIL',
          idValue: '584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777'
        },
        {
          idType: 'GOOGLE_AID',
          idValue: '123'
        }
      ]
    }
  ]
}

const createDmpSegmentRequestBody = {
  name: 'personas_test_audience',
  sourcePlatform: LINKEDIN_SOURCE_PLATFORM,
  sourceSegmentId: 'personas_test_audience',
  account: `urn:li:sponsoredAccount:456`,
  type: 'USER',
  destinations: [
    {
      destination: 'LINKEDIN'
    }
  ]
}

describe('LinkedinAudiences.updateAudience', () => {
  describe('Successful cases', () => {
    it('should succeed if an existing DMP Segment is found', async () => {
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(urlParams)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`).post(/.*/, updateUsersRequestBody).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'personas_test_audience'
          }
        })
      ).resolves.not.toThrowError()
    })

    it('should successfully create a new DMP Segment if an existing Segment is not found', async () => {
      urlParams.account = 'urn:li:sponsoredAccount:456'

      nock(`${BASE_URL}/dmpSegments`).get(/.*/).query(urlParams).reply(200, { elements: [] })
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(urlParams)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments`).post(/.*/, createDmpSegmentRequestBody).reply(200)
      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`).post(/.*/, updateUsersRequestBody).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event,
          settings: {
            ad_account_id: '456',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'personas_test_audience'
          }
        })
      ).resolves.not.toThrowError()
    })

    it('should not throw an error if `dmp_user_action` is not "AUTO", even if `source_segment_id` does not match `personas_audience_key`', async () => {
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`).post(/.*/, updateUsersRequestBody).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            source_segment_id: 'mismatched_segment',
            personas_audience_key: 'personas_test_audience',
            dmp_user_action: 'ADD'
          }
        })
      ).resolves.not.toThrowError()
    })

    it('should set action to "ADD" if `dmp_user_action` is "ADD"', async () => {
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })

      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`)
        .post(/.*/, (body) => body.elements[0].action === 'ADD')
        .reply(200)

      const response = await testDestination.testAction('updateAudience', {
        event,
        settings: {
          ad_account_id: '123',
          send_email: true,
          send_google_advertising_id: true
        },
        useDefaultMappings: true,
        auth,
        mapping: {
          personas_audience_key: 'personas_test_audience',
          dmp_user_action: 'ADD'
        }
      })

      expect(response).toBeTruthy()
    })

    it('should set action to "REMOVE" if `dmp_user_action` is "REMOVE"', async () => {
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })

      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`)
        .post(/.*/, (body) => body.elements[0].action === 'REMOVE')
        .reply(200)

      const response = await testDestination.testAction('updateAudience', {
        event,
        settings: {
          ad_account_id: '123',
          send_email: true,
          send_google_advertising_id: true
        },
        useDefaultMappings: true,
        auth,
        mapping: {
          personas_audience_key: 'personas_test_audience',
          dmp_user_action: 'REMOVE'
        }
      })

      expect(response).toBeTruthy()
    })

    it('Email comes from traits.email', async () => {
      const eventWithTraits = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          audience_key: 'personas_test_audience'
        },
        traits: {
          email: 'testing@testing.com'
        },
        context: {
          device: {
            advertisingId: '123'
          }
        }
      })

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })

      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`)
        .post(/.*/, (body) => body.elements[0].action === 'ADD')
        .reply(200)

      const responses = await testDestination.testAction('updateAudience', {
        event: eventWithTraits,
        settings: {
          ad_account_id: '123',
          send_email: true,
          send_google_advertising_id: true
        },
        useDefaultMappings: true,
        auth,
        mapping: {
          personas_audience_key: 'personas_test_audience',
          dmp_user_action: 'ADD'
        }
      })

      expect(responses).toBeTruthy()
      expect(responses).toHaveLength(2)
      expect(responses[1].options.body).toMatchInlineSnapshot(
        '"{\\"elements\\":[{\\"action\\":\\"ADD\\",\\"userIds\\":[{\\"idType\\":\\"SHA256_EMAIL\\",\\"idValue\\":\\"584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777\\"},{\\"idType\\":\\"GOOGLE_AID\\",\\"idValue\\":\\"123\\"}]}]}"'
      )
    })

    it('Email is already a SHA256 hash', async () => {
      const eventWithTraits = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          audience_key: 'personas_test_audience'
        },
        traits: {
          email: '584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777'
        },
        context: {
          device: {
            advertisingId: '123'
          }
        }
      })

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })

      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`)
        .post(/.*/, (body) => body.elements[0].action === 'ADD')
        .reply(200)

      const responses = await testDestination.testAction('updateAudience', {
        event: eventWithTraits,
        settings: {
          ad_account_id: '123',
          send_email: true,
          send_google_advertising_id: true
        },
        useDefaultMappings: true,
        auth,
        mapping: {
          personas_audience_key: 'personas_test_audience',
          dmp_user_action: 'ADD'
        }
      })

      expect(responses).toBeTruthy()
      expect(responses).toHaveLength(2)
      expect(responses[1].options.body).toMatchInlineSnapshot(
        '"{\\"elements\\":[{\\"action\\":\\"ADD\\",\\"userIds\\":[{\\"idType\\":\\"SHA256_EMAIL\\",\\"idValue\\":\\"584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777\\"},{\\"idType\\":\\"GOOGLE_AID\\",\\"idValue\\":\\"123\\"}]}]}"'
      )
    })

    it('Email is already a SHA256 hash with smart hashing flag', async () => {
      const eventWithTraits = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          audience_key: 'personas_test_audience'
        },
        traits: {
          email: '584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777'
        },
        context: {
          device: {
            advertisingId: '123'
          }
        }
      })

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })

      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`)
        .post(/.*/, (body) => body.elements[0].action === 'ADD')
        .reply(200)

      const responses = await testDestination.testAction('updateAudience', {
        event: eventWithTraits,
        settings: {
          ad_account_id: '123',
          send_email: true,
          send_google_advertising_id: true
        },
        useDefaultMappings: true,
        auth,
        mapping: {
          personas_audience_key: 'personas_test_audience',
          dmp_user_action: 'ADD'
        }
      })

      expect(responses).toBeTruthy()
      expect(responses).toHaveLength(2)
      expect(responses[1].options.body).toMatchInlineSnapshot(
        '"{\\"elements\\":[{\\"action\\":\\"ADD\\",\\"userIds\\":[{\\"idType\\":\\"SHA256_EMAIL\\",\\"idValue\\":\\"584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777\\"},{\\"idType\\":\\"GOOGLE_AID\\",\\"idValue\\":\\"123\\"}]}]}"'
      )
    })

    it('Full payload', async () => {
      const eventWithTraits = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          audience_key: 'personas_test_audience'
        },
        traits: {
          email: 'testing@testing.com',
          firstName: 'John',
          lastName: 'Doe',
          title: 'CEO',
          company: 'Acme',
          country: 'US'
        },
        context: {
          device: {
            advertisingId: '123'
          }
        }
      })

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })

      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`)
        .post(/.*/, (body) => body.elements[0].action === 'ADD')
        .reply(200)

      const responses = await testDestination.testAction('updateAudience', {
        event: eventWithTraits,
        settings: {
          ad_account_id: '123',
          send_email: true,
          send_google_advertising_id: true
        },
        useDefaultMappings: true,
        auth,
        mapping: {
          personas_audience_key: 'personas_test_audience',
          dmp_user_action: 'ADD'
        }
      })

      expect(responses).toBeTruthy()
      expect(responses).toHaveLength(2)
      expect(responses[1].options.body).toMatchInlineSnapshot(
        '"{\\"elements\\":[{\\"action\\":\\"ADD\\",\\"userIds\\":[{\\"idType\\":\\"SHA256_EMAIL\\",\\"idValue\\":\\"584c4423c421df49955759498a71495aba49b8780eb9387dff333b6f0982c777\\"},{\\"idType\\":\\"GOOGLE_AID\\",\\"idValue\\":\\"123\\"}],\\"firstName\\":\\"John\\",\\"lastName\\":\\"Doe\\",\\"title\\":\\"CEO\\",\\"company\\":\\"Acme\\",\\"country\\":\\"US\\"}]}"'
      )
    })

    it('should use context.personas.computation_key as source_segment_id when properties.audience_key does not exist', async () => {
      const eventWithComputationKey = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          // No audience_key property
        },
        context: {
          personas: {
            computation_key: 'from_computation_key' // gitleaks:allow
          },
          traits: {
            email: 'testing@testing.com'
          },
          device: {
            advertisingId: '123'
          }
        }
      })

      const expectedUrlParams = {
        q: 'account',
        account: 'urn:li:sponsoredAccount:123',
        sourceSegmentId: 'from_computation_key', // gitleaks:allow
        sourcePlatform: LINKEDIN_SOURCE_PLATFORM
      }

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(expectedUrlParams)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`).post(/.*/).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event: eventWithComputationKey,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'from_computation_key' // gitleaks:allow
          }
        })
      ).resolves.not.toThrowError()
    })

    it('should prioritize properties.audience_key over context.personas.computation_key when both exist', async () => {
      const eventWithBothKeys = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          audience_key: 'from_properties_audience_key' // gitleaks:allow
        },
        context: {
          personas: {
            computation_key: 'from_computation_key' // gitleaks:allow
          },
          traits: {
            email: 'testing@testing.com'
          },
          device: {
            advertisingId: '123'
          }
        }
      })

      const expectedUrlParams = {
        q: 'account',
        account: 'urn:li:sponsoredAccount:123',
        sourceSegmentId: 'from_properties_audience_key', // Should use this, not computation_key // gitleaks:allow
        sourcePlatform: LINKEDIN_SOURCE_PLATFORM
      }

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(expectedUrlParams)
        .reply(200, { elements: [{ id: 'dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments/dmp_segment_id/users`).post(/.*/).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event: eventWithBothKeys,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'from_properties_audience_key' // gitleaks:allow
          }
        })
      ).resolves.not.toThrowError()
    })

    it('should use context.personas.computation_key as dmp_segment_name when properties.audience_key does not exist', async () => {
      const eventWithComputationKey = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          // No audience_key property
        },
        context: {
          personas: {
            computation_key: 'from_computation_key' // gitleaks:allow
          },
          traits: {
            email: 'testing@testing.com'
          },
          device: {
            advertisingId: '123'
          }
        }
      })

      const expectedCreateDmpSegmentRequestBody = {
        name: 'from_computation_key', // gitleaks:allow
        sourcePlatform: LINKEDIN_SOURCE_PLATFORM,
        sourceSegmentId: 'from_computation_key', // gitleaks:allow
        account: `urn:li:sponsoredAccount:123`,
        type: 'USER',
        destinations: [
          {
            destination: 'LINKEDIN'
          }
        ]
      }

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [] })
      nock(`${BASE_URL}/dmpSegments`)
        .post(/.*/, expectedCreateDmpSegmentRequestBody)
        .reply(200, {}, { 'x-linkedin-id': 'new_dmp_segment_id' })
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'new_dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments/new_dmp_segment_id/users`).post(/.*/).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event: eventWithComputationKey,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'from_computation_key' // gitleaks:allow
          }
        })
      ).resolves.not.toThrowError()
    })

    it('should prioritize properties.audience_key over context.personas.computation_key for dmp_segment_name when both exist', async () => {
      const eventWithBothKeys = createTestEvent({
        event: 'Audience Entered',
        type: 'track',
        properties: {
          audience_key: 'from_properties_audience_key' // gitleaks:allow
        },
        context: {
          personas: {
            computation_key: 'from_computation_key' // gitleaks:allow
          },
          traits: {
            email: 'testing@testing.com'
          },
          device: {
            advertisingId: '123'
          }
        }
      })

      const expectedCreateDmpSegmentRequestBody = {
        name: 'from_properties_audience_key', // Should use this, not computation_key // gitleaks:allow
        sourcePlatform: LINKEDIN_SOURCE_PLATFORM,
        sourceSegmentId: 'from_properties_audience_key', // gitleaks:allow
        account: `urn:li:sponsoredAccount:123`,
        type: 'USER',
        destinations: [
          {
            destination: 'LINKEDIN'
          }
        ]
      }

      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [] })
      nock(`${BASE_URL}/dmpSegments`)
        .post(/.*/, expectedCreateDmpSegmentRequestBody)
        .reply(200, {}, { 'x-linkedin-id': 'new_dmp_segment_id' })
      nock(`${BASE_URL}/dmpSegments`)
        .get(/.*/)
        .query(() => true)
        .reply(200, { elements: [{ id: 'new_dmp_segment_id' }] })
      nock(`${BASE_URL}/dmpSegments/new_dmp_segment_id/users`).post(/.*/).reply(200)

      await expect(
        testDestination.testAction('updateAudience', {
          event: eventWithBothKeys,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'from_properties_audience_key' // gitleaks:allow
          }
        })
      ).resolves.not.toThrowError()
    })
  })

  describe('Error cases', () => {
    it('should fail if `personas_audience_key` field does not match the `source_segment_id` field', async () => {
      await expect(
        testDestination.testAction('updateAudience', {
          event,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'mismatched_audience',
            dmp_user_action: null
          }
        })
      ).rejects.toThrow('The value of `source_segment_id` and `personas_audience_key` must match.')
    })

    it('should fail if both `send_email` and `send_google_advertising_id` settings are set to false', async () => {
      await expect(
        testDestination.testAction('updateAudience', {
          event,
          settings: {
            ad_account_id: '123',
            send_email: false,
            send_google_advertising_id: false
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'personas_test_audience'
          }
        })
      ).rejects.toThrow('At least one of `Send Email` or `Send Google Advertising ID` must be set to `true`.')
    })

    it('should fail if `personas_audience_key` field does not match the `source_segment_id` field, and `dmp_user_action` is set to auto', async () => {
      await expect(
        testDestination.testAction('updateAudience', {
          event,
          settings: {
            ad_account_id: '123',
            send_email: true,
            send_google_advertising_id: true
          },
          useDefaultMappings: true,
          auth,
          mapping: {
            personas_audience_key: 'mismatched_audience',
            dmp_user_action: 'AUTO'
          }
        })
      ).rejects.toThrow('The value of `source_segment_id` and `personas_audience_key` must match.')
    })
  })
})
