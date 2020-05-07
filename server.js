const port = 443;
const WebSocket = require('ws');
const http = require('http');

const history = [];
const clients = [];
let index = 0;

const server = http.createServer((request, response) => { });
const wss = new WebSocket.Server({ server });

server.listen(port, function () {
  console.log(`[${new Date()}] Server is listening on port ${port}`);
});

wss.on('connection', function (ws) {
  console.log(`peer has connected!`);
  let clientIndex;

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

    if (parsedData.type === 'identification') {
      const newClient = { socket: ws, userName: parsedData.userName };
      clientIndex = clients.push(newClient) - 1;
      staticBroadcast(`${parsedData.userName} joined.`)
      syncClients('clients', clients.map(client => client.userName));

    } else if (parsedData.type === 'edit') {
      history[parsedData.index] = {
        ...history[parsedData.index],
        edited: true,
        message: parsedData.message
      };
      syncClients('edit', history[parsedData.index]);

    } else if (parsedData.type === 'delete') {
      history[parsedData.index] = {
        ...history[parsedData.index],
        deleted: true,
        message: ''
      }
      syncClients('delete', history[parsedData.index])

    } else if (parsedData.type === 'message') {
      const newMessage = {
        ...parsedData,
        index: index++,
        edited: false,
        deleted: false
      };
      history.push(newMessage);
      // broadcast this new message to all clients
      syncClients('message', newMessage);
    }
  });

  ws.on('close', function () {
    console.log(`peer has disconnected...`);
    if (clients[clientIndex]) {
      staticBroadcast(`${clients[clientIndex].userName} left.`);
      clients.splice(clientIndex, 1);
      syncClients('clients', clients.map(client => client.userName));
    }
  });

  /**
   * This is a function that will broadcast static messages to all chat
   * participants when a peer joins or leaves the chat room, i.e. "alice has joined."
   *
   * @param {string} message - the message that will be sent to all clients
   */
  function staticBroadcast(message) {
    const newMessage = {
      type: 'message',
      data: {
        time: Date.now(),
        type: 'message',
        deleted: null,
        edited: null,
        index: null,
        userName: 'Meetingbot',
        message
      }
    };
    console.log(`new static message: ${JSON.stringify(newMessage)}`);
    wss.clients.forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(newMessage));
      }
    });
  }

  /**
   * This is a function that will sync all chat clients
   * with the latest message(s) from the server
   *
   * @param {string} messageType - the type of message being sent, i.e. 'edit' or 'message'
   * @param {string} outOfSyncMessage - the message that will be sent to all clients
   */
  function syncClients(messageType, outOfSyncMessage) {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: messageType,
          data: outOfSyncMessage
        }));
      }
    });
  }
});
