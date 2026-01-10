let player = null, allChapters = [];
function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }
function onYouTubeIframeAPIReady() {}
function getDriveLink(id) { return id ? `https://drive.google.com/file/d/${id}/preview` : ''; }

function showAlertModal(msg) {
    const alertModal = document.getElementById('customAlertModal');
    const alertText = document.getElementById('alertMessage');
    if (alertModal && alertText) { alertText.innerHTML = msg; alertModal.classList.add('show'); document.body.style.overflow = 'hidden'; }
}
function closeAlert() {
    const alertModal = document.getElementById('customAlertModal');
    if (alertModal) { alertModal.classList.remove('show'); document.body.style.overflow = ''; }
}
function updateVideoUI(hasVideo, lessonPdf) {
    const videoPlayerEl = document.getElementById('lessonVideo');
    const videoPlaceholderEl = document.getElementById('videoPlaceholder');
    const videoControls = document.querySelectorAll('#videoControls button');
    videoPlayerEl.style.display = hasVideo ? 'block' : 'none';
    videoPlaceholderEl.style.display = hasVideo ? 'none' : 'flex';
    videoControls.forEach(btn => { if (btn.id === 'endLectureBtn' || btn.id === 'showPdfBtn') return; btn.disabled = !hasVideo; });
    if (!hasVideo) {
        videoPlaceholderEl.innerHTML = lessonPdf ? '강의 영상은 준비 중이며,<br>현재는 교재(PDF)만 제공됩니다.' : '해당 강의는 현재 업로드 준비 중입니다.<br>잠시만 기다려주세요!';
    }
}
function setupPlayer(lesson) {
    const startSeconds = lesson.time ? parseInt(lesson.time) : 0;
    if (!player) {
        player = new YT.Player('lessonVideo', { height: '100%', width: '100%', playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
            events: { 'onReady': () => player.loadVideoById(lesson.videoid, startSeconds), 'onStateChange': (event) => {
                document.getElementById('playPauseBtn').innerText = (event.data === YT.PlayerState.PLAYING) ? '일시 정지' : '재 생';
            } }
        });
    } else { player.loadVideoById(lesson.videoid, startSeconds); }
}
function openModal(lesson) {
    document.getElementById('videoModal').classList.add('show');
    const showPdfBtn = document.getElementById('showPdfBtn');
    if (lesson.pdf) { showPdfBtn.disabled = false; showPdfBtn.innerText = '교재 보기'; showPdfBtn.dataset.pdfId = lesson.pdf; }
    else { showPdfBtn.disabled = true; showPdfBtn.innerText = '교재 없음'; }
    document.getElementById('modalPdfFrame').src = "about:blank";
    document.getElementById('modalPdfContainer').style.width = '0';
    if (lesson.videoid) { updateVideoUI(true); setupPlayer(lesson); }
    else { if (player) player.stopVideo(); updateVideoUI(false, lesson.pdf); }
}
function renderChapters(data) {
    const list = document.getElementById('chapterList'), placeholder = document.getElementById('lesson-placeholder');
    list.innerHTML = "";
    if (data.length === 0) {
        placeholder.style.display = 'block'; list.style.display = 'none';
        placeholder.querySelector('p').innerHTML = '검색된 강의가 없습니다.<br>다른 키워드로 검색해 보세요.';
        return;
    }
    placeholder.style.display = 'none'; list.style.display = 'grid';
    data.forEach(chap => {
        let gradeClass = 'grade-etc';
        const g = (chap.grade || "").toString();
        if (g.includes('실전')) gradeClass = 'grade-실전';
        else if (g.includes('Tip')) gradeClass = 'grade-Tip';
        else if (g.includes('중1')) gradeClass = 'grade-중1';
        else if (g.includes('중2')) gradeClass = 'grade-중2';
        else if (g.includes('중3')) gradeClass = 'grade-중3';
        else if (g.includes('고1')) gradeClass = 'grade-고1';
        else if (g.includes('고2')) gradeClass = 'grade-고2';
        else if (g.includes('고3')) gradeClass = 'grade-고3';

        const chapterEl = document.createElement('div');
        chapterEl.className = `chapter ${gradeClass}`;
        chapterEl.innerHTML = `
            <div class="chapter-header"><div><h3 class="grade-unit-line"><span class="grade-label">${chap.grade}</span><span class="unit-label">${chap.unit}</span></h3>
            <h4 class="chapter-line"><span class="chapter-label">${chap.chapter}</span><span class="lesson-count">(${chap.lessons.length}강)</span></h4></div></div>
            <div class="lessons"><div class="lessons-inner">${chap.lessons.map(l => l.lesson ? `<div class="lesson"><a href="#">${l.lesson}</a></div>` : '').join('')}</div></div>`;
        chapterEl.querySelector('.chapter-header').onclick = () => {
            const wasActive = chapterEl.classList.contains('active');
            list.querySelectorAll('.chapter.active').forEach(a => { a.classList.remove('active'); a.querySelector('.lessons').style.maxHeight = '0px'; });
            if (!wasActive) { chapterEl.classList.add('active'); const lEl = chapterEl.querySelector('.lessons'); lEl.style.maxHeight = lEl.scrollHeight + 'px'; }
        };
        chapterEl.querySelectorAll('.lesson a').forEach((link, idx) => {
            link.onclick = (e) => {
                e.preventDefault(); const lesson = chap.lessons[idx];
                if (isMobile()) {
                    if (lesson.videoid) window.open(`https://www.youtube.com/watch?v=${lesson.videoid}${lesson.time ? '&t='+lesson.time : ''}`, '_blank');
                    else showAlertModal(lesson.pdf ? '강의 영상은 준비 중이며,<br>현재는 교재(PDF)만 제공됩니다.' : '해당 강의는 현재 업로드 준비 중입니다.<br>잠시만 기다려주세요!');
                } else openModal(lesson);
            };
        });
        list.appendChild(chapterEl);
    });
}
function performSearch() {
    const searchBox = document.getElementById('searchBox'), keyword = searchBox.value.toLowerCase().trim();
    const list = document.getElementById('chapterList'), placeholder = document.getElementById('lesson-placeholder');
    document.querySelectorAll('.filter-btn.active').forEach(b => b.classList.remove('active'));
    if (!keyword) { list.style.display = 'none'; placeholder.style.display = 'block'; return; }
    document.querySelectorAll('.filter-btn').forEach(btn => { if(btn.dataset.grade === searchBox.value.trim()) btn.classList.add('active'); });

    const orGroups = keyword.split(/[,\/|]/).map(s => s.trim()).filter(Boolean);
    const filtered = allChapters.filter(chapter => {
        return orGroups.some(group => {
            const andWords = group.split(/\s+/).filter(Boolean);
            const fullText = `${chapter.grade} ${chapter.unit} ${chapter.chapter} ${(chapter.lessons || []).map(l => l.lesson).join(' ')}`.toLowerCase();
            return andWords.every(word => fullText.includes(word));
        });
    });
    renderChapters(filtered);
}
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchBtn').onclick = performSearch;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = function() { document.getElementById('searchBox').value = this.dataset.grade; performSearch(); };
    });
    document.getElementById('playPauseBtn').onclick = () => { if (!player) return; player.getPlayerState() === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo(); };
    document.getElementById('skipBackwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() - 5, true);
    document.getElementById('skipForwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() + 5, true);
    document.getElementById('fullscreenBtn').onclick = () => document.getElementById('lessonVideo').requestFullscreen();
    document.getElementById('endLectureBtn').onclick = () => { document.getElementById('videoModal').classList.remove('show'); player?.stopVideo(); };
    if (typeof fetchAllSheets === 'function') {
        fetchAllSheets().then(data => { allChapters = data.chapters; 
            document.getElementById('lesson-placeholder').innerHTML = `<svg class="placeholder-icon" viewBox="0 0 512 512"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>
            <p>위에서 공부하고 싶은 단원명이나 키워드를 검색하면 <br>강의 목록이 나타납니다.<br>검색시 띄어쓰기는 AND, 쉼표/슬래시/|는 OR 로 검색됩니다.</p>`;
        });
    }
});