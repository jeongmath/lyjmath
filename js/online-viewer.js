// =================================================================================
// [v14.5 최종] 모바일 커스텀 알림 팝업 통합 및 학년별 색상 매칭 개선
// =================================================================================
let player = null, allChapters = [];

function isMobile() {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function onYouTubeIframeAPIReady() {}
function getDriveLink(id) { return id ? `https://drive.google.com/file/d/${id}/preview` : ''; }

// [추가] 커스텀 알림 팝업 제어 함수
function showAlertModal(msg) {
    const alertModal = document.getElementById('customAlertModal');
    const alertText = document.getElementById('alertMessage');
    if (alertModal && alertText) {
        alertText.innerHTML = msg;
        alertModal.classList.add('show');
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    }
}

// [추가] 커스텀 알림 팝업 닫기 함수
function closeAlert() {
    const alertModal = document.getElementById('customAlertModal');
    if (alertModal) {
        alertModal.classList.remove('show');
        document.body.style.overflow = ''; // 배경 스크롤 복구
    }
}

function updateVideoUI(hasVideo, lessonPdf) {
    const videoPlayerEl = document.getElementById('lessonVideo');
    const videoPlaceholderEl = document.getElementById('videoPlaceholder');
    const videoControls = document.querySelectorAll('#videoControls button');

    videoPlayerEl.style.display = hasVideo ? 'block' : 'none';
    videoPlaceholderEl.style.display = hasVideo ? 'none' : 'flex';

    videoControls.forEach(btn => {
        if (btn.id === 'endLectureBtn' || btn.id === 'showPdfBtn') return;
        btn.disabled = !hasVideo;
    });

    if (!hasVideo) {
        if (lessonPdf) {
            videoPlaceholderEl.innerHTML = '강의 영상은 준비 중이며,<br>현재는 교재(PDF)만 제공됩니다.';
        } else {
            videoPlaceholderEl.innerHTML = '해당 강의는 현재 업로드 준비 중입니다.<br>잠시만 기다려주세요!';
        }
    }
}

function setupPlayer(lesson) {
    const startSeconds = lesson.time ? parseInt(lesson.time) : 0;
    const onPlayerStateChange = (event) => {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (event.data === YT.PlayerState.PLAYING) {
            playPauseBtn.innerText = '일시 정지';
        } else if (event.data === YT.PlayerState.PAUSED) {
            playPauseBtn.innerText = '재 생';
        }
    };

    if (!player) {
        player = new YT.Player('lessonVideo', {
            height: '100%', width: '100%',
            playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
            events: {
                'onReady': () => player.loadVideoById(lesson.videoid, startSeconds),
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        player.loadVideoById(lesson.videoid, startSeconds);
    }
}

function openModal(lesson) {
    document.getElementById('videoModal').classList.add('show');
    
    const showPdfBtn = document.getElementById('showPdfBtn');
    if (lesson.pdf) {
        showPdfBtn.disabled = false;
        showPdfBtn.innerText = '교재 보기';
        showPdfBtn.dataset.pdfId = lesson.pdf;
    } else {
        showPdfBtn.disabled = true;
        showPdfBtn.innerText = '교재 없음';
        showPdfBtn.dataset.pdfId = '';
    }

    document.getElementById('modalPdfFrame').src = "about:blank";
    document.getElementById('modalPdfContainer').style.width = '0';
    document.getElementById('modalPdfContainer').classList.remove('active');
    document.getElementById('videoContainer').style.width = '100%';

    if (lesson.videoid) {
        updateVideoUI(true);
        setupPlayer(lesson);
    } else {
        if (player) player.stopVideo();
        updateVideoUI(false, lesson.pdf);
    }
}

// === 강의 목록 렌더링 함수 ===
function renderChapters(data) {
    const list = document.getElementById('chapterList');
    const placeholder = document.getElementById('lesson-placeholder');
    list.innerHTML = "";

    if (data.length === 0) {
        placeholder.style.display = 'block';
        list.style.display = 'none';
        placeholder.querySelector('p').innerHTML = '검색된 강의가 없습니다.<br>다른 키워드로 검색해 보세요.';
        return;
    }
    
    placeholder.style.display = 'none';
    list.style.display = 'grid';

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
            <div class="chapter-header">
                <div>
                    <h3 class="grade-unit-line">
                        <span class="grade-label">${chap.grade}</span>
                        <span class="unit-label">${chap.unit}</span>
                    </h3>
                    <h4 class="chapter-line">
                        <span class="chapter-label">${chap.chapter}</span>
                        <span class="lesson-count">(${chap.lessons.length}강)</span>
                    </h4>
                </div>
            </div>
            <div class="lessons">
                <div class="lessons-inner">
                    ${chap.lessons.map(lesson => {
                        if (!lesson.lesson) return '';
                        return `<div class="lesson"><a href="#">${lesson.lesson}</a></div>`;
                    }).join('')}
                </div>
            </div>
        `;
        
        chapterEl.querySelector('.chapter-header').addEventListener('click', () => {
            const wasActive = chapterEl.classList.contains('active');
            list.querySelectorAll('.chapter.active').forEach(activeEl => {
                activeEl.classList.remove('active');
                activeEl.querySelector('.lessons').style.maxHeight = '0px';
            });
            if (!wasActive) {
                chapterEl.classList.add('active');
                const lessonsEl = chapterEl.querySelector('.lessons');
                lessonsEl.style.maxHeight = lessonsEl.scrollHeight + 'px';
            }
        });
        
        chapterEl.querySelectorAll('.lesson a').forEach((link, index) => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const lesson = chap.lessons[index];
                
                if (isMobile()) {
                    if (lesson.videoid) {
                        let mobileUrl = `https://www.youtube.com/watch?v=${lesson.videoid}`;
                        if (lesson.listid) mobileUrl += `&list=${lesson.listid}`;
                        if (lesson.time) mobileUrl += `&t=${lesson.time}`;
                        window.open(mobileUrl, '_blank');
                    } else {
                        // [수정] alert 대신 커스텀 팝업 사용
                        const msg = lesson.pdf 
                            ? '강의 영상은 준비 중이며,<br>현재는 교재(PDF)만 제공됩니다.' 
                            : '해당 강의는 현재 업로드 준비 중입니다.<br>잠시만 기다려주세요!';
                        showAlertModal(msg);
                    }
                } else {
                    openModal(lesson);
                }
            });
        });

        list.appendChild(chapterEl);
    });
}

function triggerSearch() {
  performSearch();
}

function performSearch() {
    const searchBox = document.getElementById('searchBox');
    const placeholder = document.getElementById('lesson-placeholder');
    const chapterList = document.getElementById('chapterList');

    const keyword = searchBox.value.toLowerCase().trim();
    document.querySelectorAll('.filter-btn.active').forEach(b => b.classList.remove('active'));

    if (!keyword) {
        chapterList.innerHTML = "";
        chapterList.style.display = 'none';
        placeholder.style.display = 'block';
        placeholder.querySelector('p').innerHTML = '위에서 공부하고 싶은 단원명이나 키워드를 검색하면 <br>강의 목록이 나타납니다.<br>검색시 띄어쓰기는 AND, 쉼표/슬래시/|는 OR 로 검색됩니다.';
        return;
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
        if(btn.dataset.grade === searchBox.value.trim()) {
            btn.classList.add('active');
        }
    });

    // 1. OR 그룹 생성 (쉼표, 슬래시, 바 기호 기준)
    const orGroups = keyword.split(/[,\/|]/).map(s => s.trim()).filter(Boolean);

    const filtered = allChapters.filter(chapter => {
        // 2. 그룹 중 하나라도 만족하면 OK (OR 로직)
        return orGroups.some(group => {
            // 3. 그룹 내 띄어쓰기는 모두 포함되어야 함 (AND 로직)
            const andWords = group.split(/\s+/).filter(Boolean);
            const chapterText = `${chapter.grade} ${chapter.unit} ${chapter.chapter}`.toLowerCase();
            const lessonsText = chapter.lessons.map(l => l.lesson).join(' ').toLowerCase();
            const fullText = chapterText + " " + lessonsText;

            return andWords.every(word => fullText.includes(word));
        });
    });
    renderChapters(filtered);
};

document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const searchBox = document.getElementById('searchBox');
    const placeholder = document.getElementById('lesson-placeholder');
    
    const showSearchPrompt = () => {
        placeholder.innerHTML = `
            <svg class="placeholder-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>
            <p>위에서 공부하고 싶은 단원명이나 키워드를 검색하면 <br>강의 목록이 나타납니다.<br>검색시 띄어쓰기는 AND, 쉼표/슬래시/|는 OR 로 검색됩니다.</p>
        `;
    };

    searchBtn.addEventListener('click', performSearch);
    searchBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    document.querySelectorAll('.filter-btn').forEach(button => {
        button.addEventListener('click', function() {
            searchBox.value = this.dataset.grade;
            performSearch();
        });
    });
    
    document.getElementById('playPauseBtn').onclick = () => { if (!player || typeof player.getPlayerState !== 'function') return; player.getPlayerState() === YT.PlayerState.PLAYING ? player.pauseVideo() : player.playVideo(); };
    document.getElementById('skipBackwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() - 5, true);
    document.getElementById('skipForwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() + 5, true);
    document.getElementById('fullscreenBtn').onclick = () => document.getElementById('lessonVideo').requestFullscreen();
    document.getElementById('endLectureBtn').onclick = () => { document.getElementById('videoModal').classList.remove('show'); player?.stopVideo(); };
    
    // 알림 모달 배경 클릭 시 닫기
    const alertModal = document.getElementById('customAlertModal');
    if (alertModal) {
        alertModal.addEventListener('click', (e) => {
            if (e.target === alertModal) closeAlert();
        });
    }

    document.getElementById('showPdfBtn').onclick = (e) => { 
        const pc = document.getElementById('modalPdfContainer'); 
        const vc = document.getElementById('videoContainer'); 
        const frame = document.getElementById('modalPdfFrame'); 
        if (pc.style.width !== '0px' && pc.style.width !== '') { 
            pc.style.width = '0'; 
            vc.style.width = '100%'; 
            e.target.innerText = '교재 보기'; 
        } else { 
            if (frame.src.includes("about:blank")) { 
                frame.src = getDriveLink(e.target.dataset.pdfId); 
            } 
            const targetW = Math.max(document.getElementById('videoContent').offsetHeight * 0.707, 600); 
            pc.style.width = targetW + 'px'; 
            vc.style.width = `calc(100% - ${targetW}px)`; 
            e.target.innerText = '교재 닫기'; 
        } 
    };
    document.querySelectorAll('.speedOption').forEach(b => { b.onclick = () => player?.setPlaybackRate(parseFloat(b.dataset.speed)); });

    if (typeof fetchAllSheets === 'function') {
        fetchAllSheets()
            .then(data => {
                allChapters = data.chapters;
                showSearchPrompt();
            })
            .catch(error => {
                console.error("데이터 로딩 실패:", error);
                placeholder.innerHTML = `<p style="color: #f87171;">강의 목록을 불러오는 데 실패했습니다.<br>잠시 후 다시 시도해 주세요.</p>`;
            });
    }
});