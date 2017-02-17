const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

const io = socketio(app);

const users = [];

const onJoined = (sock) => {
  const socket = sock;
  socket.on('join', (data) => {
    const joinMsg = {
      name: 'server',
      msg: `There are ${Object.keys(users).length} users online`,
    };

    socket.name = data.name;
    users.push(data.name);
    socket.emit('msg', joinMsg);

    socket.join('room1');

    const response = {
      name: 'server',
      msg: `${data.name} has joined the room.`,
    };

    socket.broadcast.to('room1').emit('msg', response);

    socket.emit('msg', { name: 'server', msg: 'You joined the room' });
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    if (data.msg[0] === '/') {
      const split = data.msg.split(' ');
      const command = split[0];
      const arg = split[1];
      switch (command) {
        case '/users':
          socket.emit('msg', { name: 'server', msg: `There are ${Object.keys(users).length} users online` });
          break;
        case '/rtd':
          io.sockets.in('room1').emit('msg', { name: 'server', msg: `${socket.name} rolled the dice and got ${Math.floor(Math.random() * 6) + 1}!` });
          break;
        case '/me':
          io.sockets.in('room1').emit('msg', { name: 'server', msg: `${socket.name} ${arg}` });
          break;
        case '/changename':
          users.splice(users.indexOf(socket.name), 1);
          users.push(arg);
          io.sockets.in('room1').emit('msg', { name: 'server', msg: `${socket.name} changed their name to ${arg}` });
          socket.name = arg;
          break;
        case '/help':
          socket.emit('msg', { name: 'server', msg: 'Here are some commands: \n/users: check the number of online users \n/rtd: roll a six sided die \n/me: send a message from 3rd person, such as /me dances \n/changename: change your username' });
          break;
        default:
          socket.emit('msg', { name: 'server', msg: 'Invalid Command, try /help.' });
          break;
      }
    } else {
      io.sockets.in('room1').emit('msg', { name: socket.name, msg: data.msg });
    }
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    const nameIndex = users.indexOf(socket.name);

    if (nameIndex > -1) {
      users.splice(nameIndex, 1);
    }

    const response = {
      name: 'server',
      msg: `${socket.name} has disconnected.`,
    };

    socket.broadcast.to('room1').emit('msg', response);
  });
};

io.sockets.on('connection', (socket) => {
  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});
