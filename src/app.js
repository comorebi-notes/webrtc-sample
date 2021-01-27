navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || window.navigator.mozGetUserMedia
window.URL = window.URL || window.webkitURL

const video = document.getElementById('video')
// let localStream = null;
navigator.getUserMedia({ video: true, audio: false },
  (stream) => {
    console.log(stream)
    video.srcObject = stream
  },
  (err) => {
    console.log(err)
  }
)
