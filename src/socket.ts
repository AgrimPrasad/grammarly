import WebSocket from 'ws'
import { anonymous, authenticate, RawAuthCookie, UA, AuthCookie } from './grammarly-auth'

export interface AuthParams {
  username: string
  password: string
}

export interface Connection {
  socket: WebSocket
  cookie: AuthCookie
}

export async function connect(params?: AuthParams, cookie?: AuthCookie) {
  if (!cookie) {
    const rawCookie = await (params ? authenticate(params.username, params.username) : anonymous())

    if (rawCookie) cookie = rawCookie.parsed
  }

  if (cookie) return connectUsingCookie(cookie)

  throw new Error('Cannot connect to grammarly.')
}

function toCookie(params: Record<string, string>) {
  return Object.entries(params)
    .map(([key, value]) => key + '=' + value + ';')
    .join(' ')
}

function connectUsingCookie(cookie: AuthCookie): Promise<Connection> {
  return new Promise<Connection>(async (resolve, reject) => {
    const socket = new WebSocket('wss://capi.grammarly.com/freews', {
      headers: {
        'User-Agent': UA,
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        Connection: 'Upgrade',
        Pragma: 'no-cache',
        Cookie: toCookie({
          gnar_containerId: cookie.gnar_containerId,
          grauth: cookie.grauth,
          ['csrf-token']: cookie['csrf-token'],
          redirect_location: cookie.redirect_location,
          browser_info: cookie.browser_info,
          funnelType: 'free',
          firefox_freemium: 'true',
        }),
        Host: 'capi.grammarly.com',
        Origin: 'https://app.grammarly.com',
        Upgrade: 'websocket',
      },
      origin: 'https://app.grammarly.com',
    })

    socket.onopen = () => {
      resolve({
        socket,
        cookie,
      })
    }

    socket.onerror = (err: unknown) => {
      reject(err)
      socket.close()
    }
  })
}
