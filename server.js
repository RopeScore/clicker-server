import WebSocket from 'ws'
import { createServer } from 'http'
import { v4 as uuid } from 'uuid'

const server = createServer()
const wss = new WebSocket.Server({ noServer: true })

const clients = new Map()
const secretToId = new Map() // persist this at some point

function register (client, args) {
  if (clients.has(client)) {
    console.log('client already has a role')
    return
  }

  let secret = args[0]
  let id
  if (secret && secretToId.has(secret)) id = secretToId.get(secret)
  else {
    const ids = new Set(secretToId.values())
    secret = uuid()
    while (!id || ids.has(id)) {
      id = `${Math.round(Math.random() * 1_000_000)}`.padStart(6, '0')
    }
    secretToId.set(secret, id)
  }

  client.send(`REGISTERED ${id} ${secret}`)
  console.log('>', `REGISTERED ${id} ${secret}`)
  clients.set(client, { type: 'sender', id, secret }) // TODO: this way is not great
  // TODO: broadcast to all listeners
}

function score (client, args) {
  const meta = clients.get(client)
  if (!meta?.type === 'sender') {
    console.log('not sender')
    return
  }

  const msgId = parseInt(args.shift(), 10)
  const ts = parseInt(args.shift(), 10)
  const score = parseInt(args.shift(), 10)

  if (isNaN(ts) || isNaN(score) || isNaN(msgId)) {
    console.log('invalid message')
    return
  }

  // TODO: broadcast to all listeners, translate ts?

  client.send(`SCORED ${msgId} ${ts}`)
  console.log('>', `SCORED ${msgId} ${ts}`)
}

function subscribe (client, args) {
  if (clients.has(client)) {
    console.log('client already has a role')
  }
  // we need a mapping of id => subscribers for broadcasts
}

function disconnect (client) {
  const meta = clients.get(client)

  if (meta?.type === 'sender') {
    // TODO: broadcast to all listeners
    console.log('%s disconnected', meta.id)
  }
  clients.delete(client)
}

wss.on('connection', function connection (ws) {
  ws.isAlive = true
  ws.on('pong', function heartbeat () {
    this.isAlive = true
    console.log('<', 'PONG')
  })

  ws.on('message', function incoming (message) {
    console.log('<', message)
    const args = message.split(' ')
    const verb = args.shift().toUpperCase()
    switch (verb) {
      // Sending client
      case 'REGISTER':
        register(ws, args)
        break
      case 'SCORE':
        score(ws, args)
        break

      // Receiving client
      case 'SUBSCRIBE':
        subscribe(ws, args)
        break
    }
  })

  ws.on('close', () => disconnect(ws))
})

const interval = setInterval(function ping () {
  wss.clients.forEach(function each (ws) {
    if (ws.isAlive === false) return ws.terminate()

    ws.isAlive = false
    ws.ping(() => {})
    console.log('>', 'PING')
  })
}, 30000)

wss.on('close', function close () {
  clearInterval(interval)
})

server.on('upgrade', function upgrade (request, socket, head) {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname

  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, ws => {
      wss.emit('connection', ws, request)
    })
  } else {
    socket.destroy()
  }
})

server.listen(8080)
