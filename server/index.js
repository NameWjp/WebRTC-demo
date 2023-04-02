import { Server } from "socket.io";

const room = 'room';
/**
 * 格式：{ username: string, userId: string }[]
 */
let clients = [];

const io = new Server(3000, {
  cors: {
    origin: "*",
    credentials: true
  }
});

io.on('connection', (socket) => {
  const { username } = socket.handshake.query;
  const userId = socket.id;

  if (clients.some(user => user.userId === userId)) {
    return;
  }

  clients.push({ username, userId });

  socket.join(room);
  // 提示自己已经加入了房间
  socket.emit('message', '你加入了房间');
  // 提示别人有人加入了房间
  socket.to(room).emit('message', `${username}加入了房间`);
  // 更新当前房间的所有人信息
  io.sockets.in(room).emit('clients', clients);

  // 转发消息
  socket.on('message', (data) => {
    socket.emit('message', `你: ${data}`);
    socket.to(room).emit('message', `${username}: ${data}`);
  });
  // 提示别人有人离开了
  socket.on('leave', (cb) => {
    clients = clients.filter(user => user.userId !== userId);
    socket.to(room).emit('message', `${username}离开了`);
    socket.to(room).emit('clients', clients);
    cb?.();
  });
  // 自己向别人发起视频互动
  socket.on('interact', (data) => {
    socket.to(data.to.userId).emit('interact', data);
  });
  // 监听对方拒绝了自己的互动请求
  socket.on('refuse interact', (data) => {
    socket.to(data.from.userId).emit('refuse interact', data);
  });
  // 监听对方同意了自己的互动请求
  socket.on('agree interact', (data) => {
    socket.to(data.from.userId).emit('agree interact', data);
  });
  // 监听双方信息交换
  socket.on('swap info', (data) => {
    socket.to(data.data.toUserId).emit('swap info', data);
  });
});
