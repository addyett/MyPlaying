const DOM = {
    songImg: document.getElementById('img_song'),
    songImgLink: document.getElementById('img_song_link'),
    songInfoStrings: document.getElementById('song_info_strings'),
    title: document.getElementById('song_title'),
    artist: document.getElementById('song_artist'),
    progress: {
        container: document.getElementById('progressbar_div'),
        current: document.getElementById('progressbar_current_time'),
        fullDuration: document.getElementById('progressbar_full_duration'),
        bar: document.getElementById('progressbar_current_bar')
    },
    pauseIcon: document.getElementById('img_pause_icon')
}

let lastState = {}

const utils = {
    nonZeroHour: (dates) => {
        let result = false
        for (date of dates) {
            if (date.getHours() != 1) {
                result = true
                break
            }
        }

        return result
    }
}

var socket

function handleProgress(progress) {
    try {
        DOM.progress.container.style.display = 'flex'
        if (progress.playing) {
            DOM.pauseIcon.style.display = 'none'
        } else {
            DOM.pauseIcon.style.display = 'block'
        }

        let currentDate = new Date(progress.current)
        let fullDurationDate = new Date(progress.duration)

        // Timetamps are longer than one hour, we should show the hour duration in the time string
        let sliceDateOffset = 14
        if (utils.nonZeroHour([currentDate, fullDurationDate])) {
            sliceDateOffset = 11
        }

        DOM.progress.current.innerText = currentDate.toISOString().slice(sliceDateOffset, 19)
        DOM.progress.fullDuration.innerText = fullDurationDate.toISOString().slice(sliceDateOffset, 19)

        DOM.progress.bar.style.width = `${progress.current * 100 / progress.duration}%`
    } catch(e) {
        console.error(e)
        DOM.progress.container.style.display = 'none'
        DOM.songImgLink.href = "#"
        DOM.songInfoStrings.href = "#"
    }
}

function handlePlayerEvents(data) {
    const song = data.data

    try {
        DOM.title.innerText = song.title
        DOM.artist.innerText = song.artist

        DOM.songImg.src = song.meta.image
        DOM.songImg.style.display = 'block'

        DOM.songImgLink.href = song.meta.url
        DOM.songInfoStrings.href = song.meta.url

        handleProgress(song.progress)
    } catch(e) { console.error(e) }

    lastState = data.data
}

// Every second increment progress
setInterval(function(){ 
    try {
        if (lastState.progress.playing) {
            lastState.progress.current += 1000

            // If going over song duration, stays at the end instead of incrementing
            if (lastState.progress.current >= lastState.progress.duration) {
                lastState.progress.current = lastState.progress.duration
            }
        }

        handleProgress(lastState.progress)
    } catch(e) {}
}, 1000)

function initializeSocket() {
    socket = new WebSocket(`ws${(window.location.protocol == 'https:') ? 's' : ''}://${window.location.host}${window.location.pathname.replace('widget.html', 'playing')}`)

    socket.onopen = function(event) {
        console.log('[WS] Connected')
    }

    socket.onclose = function(event) {
        console.warn('[WS] Closed', event)
        setTimeout(function () {
            initializeSocket()
        }, 1000)
    }

    socket.onerror = function(event) {
        console.warn('[WS] Error', event)
        socket.close()
        setTimeout(function () {
            initializeSocket()
        }, 1000)
    }

    socket.onmessage = function(event) {
        const msgData = JSON.parse(event.data)

        if (msgData.type == "player") {
            handlePlayerEvents(msgData)
        }
    }
}

initializeSocket()