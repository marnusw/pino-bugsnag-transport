import Bugsnag, { Config, Event } from '@bugsnag/node'
import build from 'pino-abstract-transport'

type OnErrorCallbackCb = (err: null | Error, shouldSend?: boolean) => void
type OnErrorCallback = (event: Event, cb?: OnErrorCallbackCb) => void | boolean | Promise<void | boolean>

const severityLevels = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
}

type SeverityLevel = number | keyof typeof severityLevels

function normalizeLevel(level: SeverityLevel): number {
  return typeof level === 'string' ? severityLevels[level] : level
}

function deserializePinoError(pinoErr) {
  const { message, stack } = pinoErr
  const newError = new Error(message)
  newError.stack = stack
  return newError
}

interface PinoBugsnagOptions {
  bugsnag: Config
  errorKey: string
  messageKey: string
  minLevel: SeverityLevel
  warningLevel?: SeverityLevel
  errorLevel?: SeverityLevel
  withLogRecord?: boolean
  onError: OnErrorCallback
}

const defaultOptions: Partial<PinoBugsnagOptions> = {
  errorKey: 'err',
  messageKey: 'msg',
  minLevel: severityLevels.warn,
  warningLevel: severityLevels.warn,
  errorLevel: severityLevels.error,
  withLogRecord: true,
}

export default async function (initBugsnagOptions: Partial<PinoBugsnagOptions>) {
  const options = { ...defaultOptions, ...initBugsnagOptions }

  const { bugsnag, errorKey, messageKey, onError } = options

  Bugsnag.start(bugsnag)

  const minLevel = normalizeLevel(options.minLevel)
  const errorLevel = normalizeLevel(options.errorLevel)
  const warningLevel = normalizeLevel(options.warningLevel)

  function pinoLevelToSeverity(level) {
    if (level >= errorLevel) {
      return 'error'
    }
    if (level >= warningLevel) {
      return 'warning'
    }
    return 'info'
  }

  function enrichEvent(event: Event, cb: OnErrorCallbackCb, pinoEvent) {
    event.severity = pinoLevelToSeverity(pinoEvent.level)

    if (options.withLogRecord) {
      event.addMetadata('pino-log-record', pinoEvent)
    }

    if (onError?.length >= 2) {
      onError?.(event, cb)
    } else {
      Promise.resolve(onError?.(event)).then((shouldSend: boolean) => cb(null, shouldSend))
    }
  }

  return build(async function (source) {
    for await (const obj of source) {
      if (!obj) {
        return
      }

      const serializedError = obj[errorKey] ?? obj.error

      if (obj.level >= minLevel) {
        Bugsnag.notify(
          serializedError ? deserializePinoError(serializedError) : new Error(obj[messageKey]),
          (event, cb) => enrichEvent(event, cb, obj),
        )
      }
    }
  })
}
