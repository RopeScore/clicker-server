# Clicker Server

Server for [RopeScore/clicker](https://github.com/RopeScore/clicker)

## Protocol `draft-1`

Clients MUST send and receive live data from the server over WebSocket served
at `/ws`

At the start of a connection the client MUST send either `REGISTER` or
`LISTEN` which will determine if the client want to send or receive scores.

### Sending client

#### Registration

A sending client begins the communication by sending the `REGISTER [secret]`
command which takes an optional parameter `secret`. The client MUST NOT generate
the secret, it MAY be provided by the server on the first connection and SHOULD
be stored by the client and used for all subsequent connections.

The server MUST respond to `REGISTER` with `REGISTERED <id> [secret]` the client
MUST NOT store the id persistently as it may not be re-assigned the same id on
it's next connection, even when sending a secret.

#### Score

A sending client MUST send the `SCORE <timestamp> <score>` once a score has been
registered in the client. The server MUST respond `SCORED <timestamp>`, if the
sending client does not receive this response it MUST store the `SCORE` command
and retry at a later time.

`timestamp` MUST increase by 1 every real-time millisecond.

### Receiving client

#### Registration

A receiving client begins the connection by sending the `LISTEN <ids>` command.
The required parameter `ids` is a list of id's the client want to receive scores
from.

The server MUST respond to `LISTEN` with `CONNECT <ids>` where `ids` is a
list of which of the requested id's are currently connected to the server.

#### Sending client connected

When one or more of the requested sending client id's connect to the server,
the server MUST broadcast `CONNECT <ids>`.

Receiving clients MUST NOT respond.

#### Sending client disconnected

When one of the requested sending client id's disconnects from the server, the
server MUST broadcast `DISCONNECT <id>`.

Receiving clients MUST NOT respond.

#### Score

When one of the requested sending client's has sent a new score to the server
the server MUST broadcast `SCORE <timestamp> <id> <score>`.

Receiving clients MUST NOT respond.
