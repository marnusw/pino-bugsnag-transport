# Pino Bugsnag transport

![NPM](https://img.shields.io/npm/l/pino-bugsnag-transport)
[![npm version](https://img.shields.io/npm/v/pino-bugsnag-transport)](https://www.npmjs.com/package/pino-bugsnag-transport)
[![GitHub Workflow Status](https://github.com/marnusw/pino-bugsnag-transport/actions/workflows/pino-bugsnag-transport.yml/badge.svg?branch=main)](https://github.com/marnusw/pino-bugsnag-transport/actions)

A transport for sending [pino](https://getpino.io/#/) error logs to Bugsnag.

## Install

```shell
npm i @bugsnag/node pino-bugsnag-transport
```

## Usage

```typescript
import pino from 'pino'
import Bugsnag from '@bugsnag/node'

const logger = pino({
  transport: {
    target: 'pino-bugsnag-transport',
    options: {
      bugsnag: Bugsnag, // required
      errorKey: 'err',
      messageKey: 'msg',
      minLevel: 'warn',
      warningLevel: 'warn',
      errorLevel: 'error',
      withLogRecord: true,
      onError: (event, cb) => {},
    },
  },
})
```

## Options

- `bugsnag` - Pass the initialized static Bugsnag instance
- `errorKey` - Match the pino option when not using the standard error key
- `messageKey` - Match the pino option when not using the standard message key
- `minLevel` - The minimum log level to meet before sending to Bugsnag, default: `'warn'` / `40` 
- `warningLevel` - The minimum log level for errors to be marked as warnings (and not `info`), default: `'warn'` / `40` 
- `errorLevel` - The minimum log level for errors to be marked as warnings (and not `error`), default: `'error'` / `50` 
- `withLogRecord` - Send the entire log record to bugsnag as metadata, default: `true`
- `onError` - Provide a callback passed as the second argument to `Bugsnag.notify` for full customization
