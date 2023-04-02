## WebRTC-demo
### WebRTC 的模型
一个 RTCPeerConnection 对应一个远端视频，本页面的 RTCPeerConnection 相对于其它页面为远端 RTCPeerConnection
### 初始化流程
1. 创建一个本页面的 RTCPeerConnection 用来点对点通信，叫做 A
2. 创建一个别的页面的 RTCPeerConnection 用来点对点通信，叫做 B
3. A 添加本页面的视频流，为了后续触发 B 的 addstream 事件，用来显示 A 页面的视频
4. A 创建一个 offer，发送给 B，用于交换信息
5. B 接受 offer，并添加本页面的视频流，为了触发后续 A 的 addstream 事件，用来显示 B 页面的视频
6. B 创建一个 answer，发送给 A，用于交换信息
7. 触发各自页面的 RTCPeerConnection 的 icecandidate 和 addstream，流程结束

参考：
+ [https://codelabs.developers.google.com/codelabs/webrtc-web](https://codelabs.developers.google.com/codelabs/webrtc-web)
+ [https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebRTC_API)
+ [WebRTC 入门与实战教程](https://juejin.cn/post/6844903829306097677)
+ [部署私有的turn/stun服务器](https://blog.csdn.net/wzmde007/article/details/109496714)
+ [WebRTC入门概览](https://zhuanlan.zhihu.com/p/163280838)