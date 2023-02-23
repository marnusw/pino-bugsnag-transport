import { Transform } from 'stream'
import Bugsnag from '@bugsnag/node'
import { afterEach, expect, it, vi, Mock } from 'vitest'
import pinoBugsnagTransport from './index'

vi.mock('@bugsnag/node', async () => {
  const actual: { default: { Event: () => void } } = await vi.importActual('@bugsnag/node')
  return {
    default: {
      ...actual.default,
      start: vi.fn(),
      notify: vi.fn((error, onError) => {
        onError?.(new actual.default.Event())
      }),
    },
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should send logs to Bugsnag if the message level is above the threshold', async () => {
  const transform = (await pinoBugsnagTransport({
    bugsnag: { apiKey: '' },
  })) as Transform

  const logs = [
    {
      level: 10,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      msg: 'hello world',
    },
    {
      level: 20,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      msg: 'another message',
      prop: 42,
    },
    {
      level: 30,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      msg: 'another message',
      prop: 42,
    },
    {
      level: 40,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      msg: 'another message',
      prop: 42,
    },
    {
      level: 50,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      msg: 'another message',
      prop: 42,
    },
  ]

  const logSerialized = logs.map((log) => JSON.stringify(log)).join('\n')

  transform.write(logSerialized)
  transform.end()

  await new Promise<void>((resolve) => {
    transform.on('end', () => {
      // Called for warn and error levels
      expect(Bugsnag.notify).toHaveBeenCalledTimes(2)
      resolve()
    })
  })
})

it('should send Errors to Bugsnag', async () => {
  const events = []

  const transform = (await pinoBugsnagTransport({
    bugsnag: { apiKey: '' },
    errorKey: 'error',
    messageKey: 'message',
    minLevel: 'info',
    onError: (event) => {
      events.push(event)
    },
  })) as Transform

  const logs = [
    {
      level: 30,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      message: 'hello world',
    },
    {
      level: 50,
      time: 1617955768092,
      pid: 2942,
      hostname: 'MacBook-Pro.local',
      error: {
        message: 'error message',
        stack: 'error stack',
      },
      message: 'hello world',
    },
  ]

  const logSerialized = logs.map((log) => JSON.stringify(log)).join('\n')

  transform.write(logSerialized)
  transform.end()

  await new Promise<void>((resolve) => {
    transform.on('end', () => {
      expect(Bugsnag.notify).toHaveBeenCalledTimes(2)

      expect((Bugsnag.notify as Mock).mock.calls[0][0].message).toBe('hello world')
      const infoEvent = events[0].toJSON()
      expect(infoEvent.severity).toBe('info')
      expect(infoEvent.metaData).toMatchInlineSnapshot(`
        {
          "pino-log-record": {
            "hostname": "MacBook-Pro.local",
            "level": 30,
            "message": "hello world",
            "pid": 2942,
            "time": 1617955768092,
          },
        }
      `)

      expect((Bugsnag.notify as Mock).mock.calls[1][0].message).toBe('error message')
      expect((Bugsnag.notify as Mock).mock.calls[1][0].stack).toBe('error stack')
      const errorEvent = events[1].toJSON()
      expect(errorEvent.severity).toBe('error')
      expect(errorEvent.metaData).toMatchInlineSnapshot(`
        {
          "pino-log-record": {
            "error": {
              "message": "error message",
              "stack": "error stack",
            },
            "hostname": "MacBook-Pro.local",
            "level": 50,
            "message": "hello world",
            "pid": 2942,
            "time": 1617955768092,
          },
        }
      `)

      resolve()
    })
  })
})
