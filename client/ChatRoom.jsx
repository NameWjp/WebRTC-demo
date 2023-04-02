import React, { useState } from 'react';
import { Input } from 'antd';

const ChatRoom = props => {
  const { messages, socket } = props;
  const [message, setMessage] = useState(null);

  const handleSendMsg = () => {
    if (!socket || !socket.connected) return;
    socket.emit('message', message);
    setMessage(null);
  };

  const handleChange = e => {
    setMessage(e.target.value);
  };

  return (
    <div className='chat-container'>
      <div className='chat-room'>
        {messages.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>
      <div className='chat-footer'>
        <Input.Search
          allowClear
          disabled={!socket || !socket.connected}
          enterButton="发送"
          onSearch={handleSendMsg}
          onPressEnter={handleSendMsg}
          value={message}
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default ChatRoom;
