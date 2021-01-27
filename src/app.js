import 'core-js/stable'
import 'regenerator-runtime/runtime'

const startVideoButton = document.getElementById('start-video')
const connectButton = document.getElementById('connect')
const hangUpButton = document.getElementById('hang-up')
const receiveRemoteSdpButton = document.getElementById('receive-remote-sdp')
const localVideo = document.getElementById('local-video')
const remoteVideo = document.getElementById('remote-video')
const textForSendSdp = document.getElementById('text-for-send-sdp')
const textToReceiveSdp = document.getElementById('text-for-receive-sdp')

let localStream = null
let peerConnection = null
let negotiationneededCounter = 0

// 各種ブラウザ対応
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia

// Start Videoボタンクリックで撮影開始
startVideoButton.onclick = async () => {
  try {
    const userMediaParams = {
      // video: { width: { min: 640, ideal: 1280 }, height: { min: 480,ideal: 720 } },
      video: { width: 320, height: 240 },
      audio: true
    }
    localStream = await navigator.mediaDevices.getUserMedia(userMediaParams)
    await playVideo(localVideo,localStream)
  } catch (e) {
    console.error(`mediaDevice.getUserMedia() error: ${e}`)
  }
}

// ConnectボタンクリックでWebRTCのOffer処理を開始
connectButton.onclick = () => {
  if (!peerConnection) {
    console.log('make Offer')
    peerConnection = prepareNewConnection(true)
  } else {
    console.warn('peer already exist.')
  }
}

// Receive remote SDPボタンが押されたらOffer側とAnswer側で処理を分岐
receiveRemoteSdpButton.onclick = async () => {
  const text = textToReceiveSdp.value
  if (peerConnection) {
    console.log('Received answer text...')
    const answer = new RTCSessionDescription({ type: 'answer', sdp: text })
    await setAnswer(answer)
  } else {
    console.log('Received offer text...')
    const offer = new RTCSessionDescription({ type: 'offer', sdp: text })
    await setOffer(offer)
  }
  textToReceiveSdp.value = ''
}

// Offer側のSDPをセットする処理
const setOffer = async (sessionDescription) => {
  if (peerConnection) {
    console.error('peerConnection already exist!')
  }
  peerConnection = prepareNewConnection(false)
  try {
    await peerConnection.setRemoteDescription(sessionDescription)
    console.log('setRemoteDescription(answer) success in promise')
    await makeAnswer()
  } catch (e) {
    console.error(`setRemoteDescription(offer) ERROR: ${e}`)
  }
}

// Answer側のSDPをセットする場合
const setAnswer = async (sessionDescription) => {
  if (!peerConnection) {
    console.error('peerConnection NOT exist!')
    return
  }
  try {
    await peerConnection.setRemoteDescription(sessionDescription)
    console.log('setRemoteDescription(answer) success in promise')
  } catch (e) {
    console.error(`setRemoteDescription(answer) ERROR: ${e}`)
  }
}

const playVideo = async (element, stream) => {
  element.srcObject = stream
  try {
    await element.play()
  } catch (e) {
    console.error(`autoplay error: ${e}`)
  }
}

// P2P通信を切断する
const hangUp = () => {
  if (peerConnection && peerConnection.iceConnectionState !== 'closed') {
    peerConnection.close()
    peerConnection = null
    negotiationneededCounter = 0
    cleanupVideoElement(remoteVideo)
    textForSendSdp.value = ''
  } else {
    console.log('peerConnection is closed.')
  }
}
// ビデオエレメントを初期化する
const cleanupVideoElement = (element) => {
  element.pause()
  element.srcObject = null
}
hangUpButton.onclick = hangUp

// WebRTCを利用する準備
const prepareNewConnection = (isOffer) => {
  const pcConfig = { iceServers:[{ urls: 'stun:stun.webrtc.ecl.ntt.com:3478' }] }
  const peer = new RTCPeerConnection(pcConfig)

  // リモートのMediaStreamTrackを受信した時の処理
  peer.ontrack = async (event) => {
    console.log('-- peer.ontrack()')
    await playVideo(remoteVideo, event.streams[0])
  }

  // Offer側でネゴシエーションが必要になった時の処理
  peer.onnegotiationneeded = async () => {
    try {
      if (isOffer) {
        if (negotiationneededCounter === 0) {
          const offer = await peer.createOffer()
          console.log('createOffer() success in promise')
          await peer.setLocalDescription(offer)
          console.log('setLocalDescription() success in promise')
          sendSdp(peer.localDescription)
          negotiationneededCounter++
        }
      }
    } catch (e) {
      console.error(`setLocalDescription(offer) ERROR: ${e}`)
    }
  }

  // ICE Candidateを収集した時の処理
  peer.onicecandidate = (event) => {
    if (event.candidate) {
      console.log(event.candidate)
    } else {
      console.log('empty ice event')
      sendSdp(peer.localDescription)
    }
  }

  // ICEのステータスが変更になった時の処理
  peer.oniceconnectionstatechange = () => {
    console.log(`ICE connection Status has changed to ${peer.iceConnectionState}`)
    switch (peer.iceConnectionState) {
      case 'closed':
      case 'failed':
        if (peerConnection) {
          hangUp()
        }
        break
      case 'disconnected':
        break
    }
  }

  // ローカルのMediaStreamを利用できるようにする
  if (localStream) {
    console.log('Adding local stream...')
    localStream.getTracks().forEach((track) => peer.addTrack(track, localStream))
  } else {
    console.warn('no local stream, but continue.')
  }

  return peer
}

// 手動シグナリングのための処理を追加
const sendSdp = (sessionDescription) =>  {
  console.log('--- sending sdp ---')
  textForSendSdp.value = sessionDescription.sdp
  textForSendSdp.focus()
  textForSendSdp.select()
}

// Answer SDPを生成する
const makeAnswer = async () => {
  console.log('sending Answer. Creating remote session description...' )
  if (!peerConnection) {
    console.error('peerConnection NOT exist!')
    return
  }
  try {
    const answer = await peerConnection.createAnswer()
    console.log('createAnswer() success in promise')
    await peerConnection.setLocalDescription(answer)
    console.log('setLocalDescription() success in promise')
    sendSdp(peerConnection.localDescription)
  } catch (e) {
    console.error(e)
  }
}
