const port = 443;
const WebSocket = require('ws');
const http = require('http');

const history = [];
const clients = [];

const server = http.createServer((request, response) => { });
const wss = new WebSocket.Server({ server });

server.listen(port, function () {
  console.log(`[${new Date()}] Server is listening on port ${port}`);
});

wss.on('connection', function (ws) {
  console.log(`peer has connected!`);
  const clientIndex = clients.push({ socket: ws }) - 1;

  // the newly connected user should be synced
  // with the chat room's message history
  if (history.length > 0) {
    ws.send(JSON.stringify({
      type: 'history',
      data: history
    }))
  }

  ws.on('message', function incoming(data) {
    console.log(`received: ${data}`);
    const parsedData = JSON.parse(data);
    history.push(parsedData);
    // broadcast this new message to all other clients
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'message',
          data: parsedData
        }));
      }
    });
  });

  ws.on('close', function () {
    console.log(`peer has disconnected...`);
    if (clients[clientIndex]) {
      clients.splice(clientIndex, 1);
    }
  });
});
