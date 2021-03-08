const { ipcRenderer } = require('electron');
const {API_URL} = require('../../config/index');
const electron = require('electron');
var screenElectron = electron.screen;

//-------------------------------------------------------------------

var screenIntSet = document.getElementById('init-screen-set');
var screenConfigurationBlock = document.getElementById('screen-configuration-block');
var resourcePath;

(function() {

    setTimeout(() => {
        ipcRenderer.send('check-system')
    }, 2000);

})();

ipcRenderer.on('status', (e, d) => {
    let initAttr = document.getElementById('checking-status')
    initAttr.innerText = d;
});

ipcRenderer.on('init-display-configuration', (e, d) => {
    screenIntSet.classList.add('d-none');
    screenConfigurationBlock.classList.remove('d-none');
    let config = "";
    if(d.resourcePath)
        resourcePath = d.resourcePath;
    // try {
        if(d.data) {
            if(d.data.configuration) {
                if(d.data.configuration.screen.length > 0) {
                    screenConfigurationBlock.classList.add('d-flex');
                    let configSet = d.data.configuration.screen.map((value, index) => {
                        console.log(value)
                        if(value.screen_unit_type.id === 1) {
                            setTimeout(() => {
                                getSignageSet(value.signage_resource, index)
                            }, 1000);
                            return `<div class="screen-unit" style="width:${value.width}%; height:100vh">
                                <div id="init-signage-block-${index}"></div>
                            </div>`

                        }else {
                            loadingWebView(value, index);
                            
                            return `<div class="screen-unit animate__animated animate__zoomIn" style="width:${value.width}%; height:100vh">
                                <webview class="webview-set" id="foo-${index}" src="${value.resource_url}" style="display:inline-flex; width: 100%; height:99.8vh"></webview>
                            </div>`
                        }
                        
                    }).join('')
    
                    screenConfigurationBlock.innerHTML = configSet;

                    
                    return true;
                }
                noScreenConfiguration();
                return true;
            }
            noScreenConfiguration();
            return true;
        }
    // } catch (error) {
        
    // }

    noScreenConfiguration();
})

var signageIndex = 0;
var animationIn = [
    "animate__fadeInDown",
    "animate__zoomIn"
]

var animationOut = [
    "animate__fadeOut",
    "animate__zoomOut"
]

function getSignageSet(d, index) {
    if(d.length > 0) {
        var initElement = document.getElementById('init-signage-block-' + index)

        if(initElement) {
            let data = "";
            if(d[signageIndex]) {
                data = d[signageIndex];
            }else { 
                signageIndex = 0;
                data = d[0];
            }

            var animationInData = animationIn[Math.floor(Math.random() * animationIn.length)];
            var animationOutData = animationOut[Math.floor(Math.random() * animationOut.length)];

            if(data.type === 1) {
                initElement.innerHTML = `<div><img class="animate__animated ${animationInData}" id="signage-resource-animation" style="height: ${window.innerHeight - 8}px;width: 100%;object-fit: cover;" src="${resourcePath + data.fileName}" /></div>`
                setTimeout(() => {
                    let signageAnimation = document.getElementById('signage-resource-animation');
                    if(signageAnimation) {
        
                        signageAnimation.classList.remove(animationInData);
                        signageAnimation.classList.add(animationOutData);
                    }
                    setTimeout(() => {
                        signageIndex = signageIndex + 1;
                        getSignageSet(d, index)
                    }, 600)
                }, 5000)
            }else {

                //https://vod-progressive.akamaized.net/exp=1615235308~acl=%2Fvimeo-prod-skyfire-std-us%2F01%2F3252%2F20%2F516264395%2F2397988786.mp4~hmac=bafb1e4ccf64008400a90b8bb5975242653f6cc8c29def2785f1163084884137/vimeo-prod-skyfire-std-us/01/3252/20/516264395/2397988786.mp4?filename=pexels-artem-podrez-6943515.mp4

                //http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4

                initElement.innerHTML = `<div id="video-slider-container">
                    <video src="${resourcePath + data.fileName}" id="video-slider-element" autoplay></video>
                </div>`;

                let videoSet = document.getElementById('video-slider-element')
                let videoContainer = document.getElementById('video-slider-container')
                videoSet.addEventListener('ended', endVIdeoIndication, false);
                videoSet.style.width = "100%";

                videoSet.addEventListener( "loadedmetadata", function (e) {
                    var width = this.videoWidth,
                        height = this.videoHeight;
                        if(height < 800) {
                            videoContainer.style.marginTop = "55%";
                            // videoSet.style.height = height + 'px';
                        }else {
                            videoSet.style.height = '99.3vh';
                            videoSet.style.objectFit = "cover";
                            videoContainer.style.marginTop = "0%";
                        }
                        console.log(height)
                }, false );

                function endVIdeoIndication(e) {
                    signageIndex = signageIndex + 1;
                    getSignageSet(d, index)
                }
            }
        }
    }
}

function noScreenConfiguration(message = "") {
    message = message ?? 'This display not configured. Please contact our administrator.';
    let config = `<div class="screen-centered text-white">${message}</div>`
    screenConfigurationBlock.innerHTML = config;
}


function loadingWebView(value, i) {

    setTimeout(() => {
        let webview = document.getElementById("foo-" + i);
        webview.addEventListener("dom-ready", function() {

            webview.executeJavaScript(`document.head.insertAdjacentHTML("beforeend", '<style type="text/css">::-webkit-scrollbar {width: 2px;}::-webkit-scrollbar-track {-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3); border-radius: 10px;}::-webkit-scrollbar-thumb {border-radius: 10px;-webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.5); }.ebcf_modal {display: none;position: fixed;z-index: 99999;left: 0;top: 0;width: 100%;height: 100%;overflow: auto;background-color: rgb(0,0,0);background-color: rgba(0,0,0,0.4);}.ebcf_modal-content {height: 100%;background-color: #fefefe;margin: auto;padding: 0px;border: 1px solid #888;width: 100%;}.ebcf_close {color: #aaaaaa;float: right;font-size: 28px;font-weight: bold;}.ebcf_close:hover,.ebcf_close:focus {color: #000;text-decoration: none;cursor: pointer;}</style>')
            `, true);

            webview.executeJavaScript(`document.body.insertAdjacentHTML("beforeend", '<div id="mySizeChartModal" class="ebcf_modal"><div class="ebcf_modal-content"></div></div>')
            `, true);

            webview.executeJavaScript(`
                var imageIndex = 0;
                var screenSaverTime;
                var screenSaverData = '';
                var imageChangeTimer;
                
                function getScreenServerData(data = screenSaverData) {
                    let appendImage = document.getElementById('init-screen-screen-saver-image');
                    if(appendImage) {
                        console.log('here')
                        appendImage.style.transition = 'opacity 1s'
                        appendImage.style.opacity = 0
                    }

                    setTimeout(() => {

                        let img = "";
                        if(data[imageIndex]) {
                            img = data[imageIndex];
                        }else {
                            imageIndex = 0;
                            img = data[0];
                        }

                        appendImage.src = img.resource;
                        document.querySelector('#mySizeChartModal .ebcf_modal-content').style.background = img.background
                        setTimeout(() => {
                            if(appendImage) {
                                appendImage.style.transition = 'opacity 1s'
                                appendImage.style.opacity = 1
                            }
                        }, 400);

                        imageChangeTimer = setTimeout(() => {
                            imageIndex = imageIndex + 1;
                            getScreenServerData(data)
                        }, 5000);

                    }, 800)
                }

                fetch('${API_URL}/screen-unit-screen-saver/${value._id}')
                .then(res => res.json())
                .then(res => {
                    console.log(res.result)
                    let init = document.querySelector('#mySizeChartModal .ebcf_modal-content');
                    init.innerHTML = '<img style="width: 100%;height: 99.9vh;object-fit:contain;" src="" id="init-screen-screen-saver-image" />'
                    getScreenServerData(res.result)
                    screenSaverData = res.result;
                })
                .catch(error => console.log(error))

                function handleScreenSaverEvent() {
                    document.getElementById('mySizeChartModal').style.display = "none";
                    clearInterval(screenSaverTime)
                    initScreenSaver()
                }
                document.querySelector('body').addEventListener('click', handleScreenSaverEvent)

                function initScreenSaver() {
                    screenSaverTime = setInterval(() => {
                        document.getElementById('mySizeChartModal').style.display = "block";
                    }, 1000000);
                }
                initScreenSaver()
            `, true);

            // webview.openDevTools();
        });
    }, 100)
}

var loadStart = function() {
    indicator.innerText = "loading...";
}
var loadStop = function() {
    indicator.innerText = "";
}

