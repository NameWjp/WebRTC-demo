import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Button, Tabs, Form, Input, Modal, message } from 'antd';
import ChatRoom from './ChatRoom';
import UserList from './UserList';
import useEventListener from './useEventListener';
import './App.less';

const { confirm } = Modal;
const servers = {
  'iceServers': [
    {
      'url': 'stun:stun.l.google.com:19302'
    },
  ]
};
const createPeerInfo = (o = {}) => {
  return {
    userId: null,
    stream: null,
    peerConnect: null,
    ...o,
  };
};

const App = () => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUser, setOnlineUser] = useState([]);
  const [antMessage, contextHolder] = message.useMessage();
  // 本地视频
  const localVideoRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  // 远端视频
  const remoteVideoMapRef = useRef(new Map());
  const [remotePeerInfoList, setRemotePeerInfoList] = useState([]);
  // ref
  const handleInteractRequestRef = useRef(null);
  const handleAgreeInteractRef = useRef(null);
  const handleSwapInfoRef = useRef(null);

  const getUsernameFromId = (id) => {
    const item = onlineUser.find(item => item.userId === id);
    return item?.username;
  };

  // 获取本地视频流
  const initLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localVideoRef.current.srcObject = mediaStream;
      setLocalStream(mediaStream);
      return mediaStream;
    } catch(err) {
      console.error('获取 navigator.getUserMedia 失败: ', err);
    }
  };

  const handleJoinRoom = (values) => {
    const { username } = values;
    const socket = io('ws://localhost:3000', {
      query: {
        username
      }
    });

    // 监听推送过来的消息（由于闭包这里取的是旧值，使用函数设置状态或者使用 useRef 绕行）
    socket.on('message', msg => {
      setMessages(msgs => [...msgs, msg]);
    });
    // 监听在线用户变化
    socket.on('clients', (clients) => {
      setOnlineUser(clients);
    });
    // 监听别人发起的互动请求
    socket.on('interact', (data) => {
      handleInteractRequestRef.current?.(data);
    });
    // 监听对方拒绝你的互动请求
    socket.on('refuse interact', ({ to }) => {
      antMessage.warning(`${to.username}拒绝了你的互动请求`);
    });
    // 监听对方同意了你的互动请求
    socket.on('agree interact', (data) => {
      handleAgreeInteractRef.current?.(data);
    });
    // 监听交换信息
    socket.on('swap info', (data) => {
      handleSwapInfoRef.current?.(data);
    });

    setSocket(socket);
  };

  // 处理交换信息
  const handleSwapInfo = async (data) => {
    const { type, data: { fromUserId, candidate, description } = {} } = data;
    const peerInfo = remotePeerInfoList.find(item => item.userId === fromUserId);
    if (peerInfo) {
      const peerConnect = peerInfo.peerConnect;
      if (type === 'candidate') {
        peerConnect.addIceCandidate(new RTCIceCandidate(candidate));
      } else if (type === 'offer') {
        peerConnect.addStream(localStream);
        peerConnect.setRemoteDescription(description);
        const newDescription = await peerConnect.createAnswer();
        peerConnect.setLocalDescription(newDescription);
        socket.emit('swap info', {
          type: 'answer',
          data: {
            fromUserId: socket.id,
            toUserId: fromUserId,
            description: newDescription
          }
        });
      } else if (type === 'answer') {
        peerConnect.setRemoteDescription(description);
      }
    }
  };

  // 创建远端连接信息
  const createRemotePeerInfo = (remoteId) => {
    let peerInfo = remotePeerInfoList.find(item => item.userId === remoteId);

    if (!peerInfo) {
      peerInfo = createPeerInfo({ userId: remoteId });
      const peerConnect = new RTCPeerConnection(servers);

      peerConnect.addEventListener('icecandidate', (event) => {
        const iceCandidate = event.candidate;
        if (iceCandidate) {
          const { candidate, sdpMLineIndex } = iceCandidate;
          // 交换消息
          socket.emit('swap info', {
            type: 'candidate',
            data: {
              fromUserId: socket.id,
              toUserId: remoteId,
              candidate: { candidate, sdpMLineIndex }
            }
          });
        }
      });
      peerConnect.addEventListener('addstream', (event) => {
        const mediaStream = event.stream;
        peerInfo.stream = mediaStream;
        const video = remoteVideoMapRef.current.get(remoteId);
        video.srcObject = mediaStream;
      });

      peerInfo.peerConnect = peerConnect;
      setRemotePeerInfoList(list => [...list, peerInfo]);
    }

    return peerInfo;
  };

  // 处理对方发起互动请求
  const handleInteractRequest = (data) => {
    const { from } = data;

    confirm({
      title: '提示',
      okText: '接受',
      cancelText: '拒绝',
      content: `${from.username} 发起视频邀请，是否同意？`,
      async onOk() {
        await initLocalStream();
        createRemotePeerInfo(from.userId);
        socket.emit('agree interact', data);
      },
      onCancel() {
        socket.emit('refuse interact', data);
      }
    });
  };

  // 处理对方同意互动请求
  const handleAgreeInteract = async (data) => {
    const { to } = data;
    antMessage.success(`${to.username}同意了你的互动请求`);
    const mediaStream = await initLocalStream();
    const { peerConnect } = createRemotePeerInfo(to.userId);
    // 添加本地流
    peerConnect.addStream(mediaStream);
    // 交换信息
    const description = await peerConnect.createOffer({ offerToReceiveVideo: 1, offerToReceiveAudio: 1 });
    peerConnect.setLocalDescription(description);
    socket.emit('swap info', {
      type: 'offer',
      data: {
        fromUserId: socket.id,
        toUserId: to.userId,
        description
      }
    });
  };

  const handleLeaveRoom = () => {
    socket.emit('leave', () => {
      socket.close();
      setSocket(null);
      setMessages([]);
      setOnlineUser([]);
    });
  };

  const handleInteract = (toUserId) => {
    const data = {
      from: { userId: socket.id, username: getUsernameFromId(socket.id) },
      to: { userId: toUserId, username: getUsernameFromId(toUserId) }
    };

    socket.emit('interact', data);
  };

  const items = [
    {
      key: 'chatRoom',
      label: '聊天',
      children: (
        <ChatRoom
          messages={messages}
          socket={socket}
        />
      ),
    },
    {
      key: 'userList',
      label: `用户(${onlineUser.length})`,
      children: (
        <UserList
          onlineUser={onlineUser}
          socket={socket}
          handleInteract={handleInteract}
        />
      ),
    }
  ];

  useEffect(() => {
    handleInteractRequestRef.current = handleInteractRequest;
    handleAgreeInteractRef.current = handleAgreeInteract;
    handleSwapInfoRef.current = handleSwapInfo;
  });

  useEventListener('beforeunload', () => {
    if (!socket || !socket.connected) return;
    socket.emit('leave');
  });

  return (
    <div className='app'>
      {contextHolder}
      <div className='form-container'>
        <Form
          name="basic"
          style={{ maxWidth: 600 }}
          onFinish={handleJoinRoom}
          autoComplete="off"
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[
              {
                required: true,
                message: '请输入用户名',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item>
            <Button style={{ margin: '0 10px 0 80px' }} disabled={socket && socket.connected} type="primary" htmlType="submit">
              加入聊天室
            </Button>
            <Button type="primary" disabled={!socket || !socket.connected} onClick={handleLeaveRoom}>
              离开聊天室
            </Button>
          </Form.Item>
        </Form>
        <div className='tabs'>
          <Tabs defaultActiveKey="chatRoom" items={items} />
        </div>
      </div>
      <div className="video-container">
        <div className='video-item'>
          <h4>本人</h4>
          <video autoPlay playsInline ref={localVideoRef} controls></video>
        </div>
        {remotePeerInfoList.map(({ userId }) => (
          <div className='video-item' key={userId}>
            <h4>{getUsernameFromId(userId)}</h4>
            <video autoPlay playsInline ref={(ref) => remoteVideoMapRef.current.set(userId, ref)} controls></video>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
