const API_URL = 'https://spotifydl.the-zake.workers.dev/?url=';

const spotifyUrlInput = document.getElementById('spotifyUrl');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error');
const errorText = document.getElementById('errorText');
const resultCard = document.getElementById('result');
const thumbnail = document.getElementById('thumbnail');
const trackTitle = document.getElementById('trackTitle');
const artistName = document.getElementById('artistName');
const duration = document.getElementById('duration');
const quality = document.getElementById('quality');
const format = document.getElementById('format');
const downloadLink = document.getElementById('downloadLink');

clearBtn.addEventListener('click', () => {
    spotifyUrlInput.value = '';
    spotifyUrlInput.focus();
    hideAll();
});

downloadBtn.addEventListener('click', fetchTrack);

spotifyUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        fetchTrack();
    }
});

function hideAll() {
    loader.classList.add('hidden');
    errorDiv.classList.add('hidden');
    resultCard.classList.add('hidden');
}

function showLoader() {
    hideAll();
    loader.classList.remove('hidden');
    downloadBtn.disabled = true;
    downloadBtn.style.opacity = '0.6';
    downloadBtn.style.cursor = 'not-allowed';
}

function hideLoader() {
    downloadBtn.disabled = false;
    downloadBtn.style.opacity = '1';
    downloadBtn.style.cursor = 'pointer';
}

function showError(message) {
    hideAll();
    hideLoader();
    errorText.textContent = message;
    errorDiv.classList.remove('hidden');
}

function showResult() {
    hideAll();
    hideLoader();
    resultCard.classList.remove('hidden');
}

function isValidSpotifyUrl(url) {
    const spotifyRegex = /^https?:\/\/(open\.)?spotify\.com\/(track|intl-[a-z]{2}\/track)\/[a-zA-Z0-9]+/;
    return spotifyRegex.test(url);
}

function formatDuration(dur) {
    if (!dur) return '0:00';
    if (typeof dur === 'string' && dur.includes(':')) {
        const parts = dur.split(':');
        if (parts.length === 2) {
            const mins = parseInt(parts[0]) || 0;
            const secs = parseInt(parts[1]) || 0;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    }
    return dur;
}

async function fetchTrack() {
    const url = spotifyUrlInput.value.trim();

    if (!url) {
        showError('Please paste a Spotify track URL');
        return;
    }

    if (!isValidSpotifyUrl(url)) {
        showError('Please enter a valid Spotify track URL (e.g., https://open.spotify.com/track/...)');
        return;
    }

    showLoader();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout is enough for fast response

        const response = await fetch(API_URL + encodeURIComponent(url), {
            method: 'GET',
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Server error (${response.status}).`);
        }

        const data = await response.json();
        const isSuccess = data.success === true || data.status === true || data.status === 'success';
        
        if (!isSuccess) {
            throw new Error(data.message || 'Track not found.');
        }

        const track = data.data;
        if (!track) throw new Error('No track data received.');

        const trackName = track.title || track.name || 'Unknown Title';
        const trackAuthor = track.author || track.artist || 'Unknown Artist';
        const trackThumb = track.thumbnail || track.cover || track.image || '';
        const trackDuration = track.duration || '0:00';
        
        // Fast rendering: Set values before switching views
        thumbnail.src = trackThumb;
        thumbnail.alt = trackName;
        trackTitle.textContent = trackName;
        artistName.querySelector('span').textContent = trackAuthor;
        duration.innerHTML = `<i class="far fa-clock"></i> ${formatDuration(trackDuration)}`;
        
        let downloadUrl = '';
        if (track.medias && track.medias.length > 0) {
            const media = track.medias[0];
            downloadUrl = media.url || media.link;
            quality.innerHTML = `<i class="fas fa-signal"></i> ${media.quality || '320kbps'}`;
            format.innerHTML = `<i class="fas fa-compact-disc"></i> ${(media.extension || 'mp3').toUpperCase()}`;
        } else {
            downloadUrl = track.url || track.download;
            quality.innerHTML = `<i class="fas fa-signal"></i> 320kbps`;
            format.innerHTML = `<i class="fas fa-compact-disc"></i> MP3`;
        }

        if (!downloadUrl) throw new Error('Download link not available.');

        downloadLink.href = downloadUrl;
        const fileName = `${trackName} - ${trackAuthor}`.replace(/[<>:"/\\|?*]/g, '');
        downloadLink.setAttribute('download', `${fileName}.mp3`);

        // Instant UI transition
        showResult();

    } catch (err) {
        console.error('Error:', err);
        
        if (err.name === 'AbortError') {
            showError('Request timed out. Please try again.');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
            showError('Network error. Please check your internet connection.');
        } else {
            showError(err.message || 'Something went wrong. Please try again.');
        }
    }
}

downloadLink.addEventListener('click', (e) => {
    if (!downloadLink.href || downloadLink.href === '#' || downloadLink.href.endsWith('#')) {
        e.preventDefault();
        showError('Download link is not available.');
    }
});

document.addEventListener('paste', (e) => {
    if (document.activeElement !== spotifyUrlInput) {
        const pastedText = e.clipboardData.getData('text');
        if (isValidSpotifyUrl(pastedText)) {
            spotifyUrlInput.value = pastedText;
            spotifyUrlInput.focus();
        }
    }
});

spotifyUrlInput.addEventListener('input', () => {
    hideAll();
});
