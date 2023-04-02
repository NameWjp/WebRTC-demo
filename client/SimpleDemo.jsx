import React, { useRef, useState } from 'react';
import { Button } from 'antd';
import './App.css';

const servers = null;

function App() {
  // 本地视频
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);
  const localPeerConnectRef = useRef(null);
  // 远端视频
  const [remoteStream, setRemoteStream] = useState(null);
  const remoteVideoRef = useRef(null);
  const remotePeerConnectionRef = useRef(null);


  function getOtherPeer(peerConnection) {
    return (peerConnection === localPeerConnectRef.current) ?
        remotePeerConnectionRef.current : localPeerConnectRef.current;
  }

  // 获取本地视频流
  const handleStart = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setLocalStream(mediaStream);
      localVideoRef.current.srcObject = mediaStream;
    } catch(err) {
      console.log('获取 navigator.getUserMedia 失败: ', err);
    }
  };

  // 处理发起的连接，交换网络信息
  const handleConnect = (event) => {
    // 远端的 PeerConnect 对象
    const remotePeerConnect = event.target;
    // 远端的 candidate 信息
    const remoteCandidate = event.candidate;

    if (remoteCandidate) {
      // 本地的 PeerConnect 对象
      const localPeerConnect = getOtherPeer(remotePeerConnect);
      // 将远端信息写入本地的 PeerConnect 对象
      localPeerConnect.addIceCandidate(new RTCIceCandidate(remoteCandidate));
    }
  };

  const handleCall = async () => {
    // 本地连接对象
    localPeerConnectRef.current = new RTCPeerConnection(servers);
    localPeerConnectRef.current.addEventListener('icecandidate', handleConnect);

    // 远端连接对象
    remotePeerConnectionRef.current = new RTCPeerConnection(servers);
    remotePeerConnectionRef.current.addEventListener('icecandidate', handleConnect);
    remotePeerConnectionRef.current.addEventListener('addstream', (event) => {
      const mediaStream = event.stream;
      remoteVideoRef.current.srcObject = mediaStream;
      setRemoteStream(mediaStream);
    });

    // 添加本地流
    localPeerConnectRef.current.addStream(localStream);

    // 交换描述信息
    const localDescription = await localPeerConnectRef.current.createOffer({ offerToReceiveVideo: 1 });
    localPeerConnectRef.current.setLocalDescription(localDescription);
    remotePeerConnectionRef.current.setRemoteDescription(localDescription);
    const remoteDescription = await remotePeerConnectionRef.current.createAnswer();
    remotePeerConnectionRef.current.setLocalDescription(remoteDescription);
    localPeerConnectRef.current.setRemoteDescription(remoteDescription);
  };

  const handleHangUp = () => {
    localPeerConnectRef.current.close();
    localPeerConnectRef.current = null;
    remotePeerConnectionRef.current.close();
    remotePeerConnectionRef.current = null;
    setRemoteStream(null);
  };

  return (
    <div className="App">
      <video ref={localVideoRef} autoPlay playsInline></video>
      <video ref={remoteVideoRef} autoPlay playsInline></video>

      <div>
        <Button disabled={!!localStream} onClick={handleStart}>开始</Button>
        <Button disabled={!!remoteStream || !localStream} onClick={handleCall}>呼叫</Button>
        <Button disabled={!remoteStream} onClick={handleHangUp}>挂断</Button>
      </div>
    </div>
  );
}

export default App;
