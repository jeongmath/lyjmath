// =================================================================================
// [v14.6 최종] 로딩 버그 수정 + 학년 판별(색상) + 원문 표시(라벨)
// =================================================================================
let player = null, allChapters = [];

// 1. 학년 판별 함수 (색상 테마 결정용)
function detectGrade(text = '') {
    if (!text) return 'etc';
    if (text.includes('중1')) return '중1';
    if (text.includes('중2')) return '중2';
    if (text.includes('중3')) return '중3';
    if (text.includes('고1')) return '고1';
    if (text.includes('고2')) return '고2';
    if (text.includes('고3')) return '고3';
    return 'etc'; // [tip], [특강] 등은 모두 etc(보라색)로 분류
}

function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function onYouTubeIframeAPIReady() {}
function getDriveLink(id) { return id ? `https://drive.google.com/file/d/${id}/preview` : ''; }

function updateVideoUI(hasVideo, lessonPdf) {
    const videoPlayerEl = document.getElementById('lessonVideo');
    const videoPlaceholderEl = document.getElementById('videoPlaceholder');
    const videoControls = document.querySelectorAll('#videoControls button');
    videoPlayerEl.style.display = hasVideo ? 'block' : 'none';
    videoPlaceholderEl.style.display = hasVideo ? 'none' : 'flex';
    videoControls.forEach(btn => { if (btn.id !== 'endLectureBtn' && btn.id !== 'showPdfBtn') btn.disabled = !hasVideo; });
    if (!hasVideo) {
        videoPlaceholderEl.innerHTML = lessonPdf ? '강의가 준비 중이거나<br>PDF 교재만 제공됩니다.' : '강의가 준비 중입니다.';
    }
}

function setupPlayer(lesson) {
    const startSeconds = lesson.time ? parseInt(lesson.time) : 0;
    if (!player) {
        player = new YT.Player('lessonVideo', {
            height: '100%', width: '100%',
            playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
            events: {
                'onReady': () => player.loadVideoById(lesson.videoid, startSeconds),
                'onStateChange': (e) => {
                    const btn = document.getElementById('playPauseBtn');
                    if(btn) btn.innerText = (e.data === YT.PlayerState.PLAYING) ? '일시 정지' : '재 생';
                }
            }
        });
    } else { player.loadVideoById(lesson.videoid, startSeconds); }
}

function openModal(lesson) {
    document.getElementById('videoModal').classList.add('show');
    const showPdfBtn = document.getElementById('showPdfBtn');
    if (lesson.pdf) {
        showPdfBtn.disabled = false; showPdfBtn.innerText = '교재 보기'; showPdfBtn.dataset.pdfId = lesson.pdf;
    } else {
        showPdfBtn.disabled = true; showPdfBtn.innerText = '교재 없음';
    }
    document.getElementById('modalPdfFrame').src = "about:blank";
    document.getElementById('modalPdfContainer').style.width = '0';
    document.getElementById('videoContainer').style.width = '100%';
    if (lesson.videoid) { updateVideoUI(true); setupPlayer(lesson); }
    else { if (player) player.stopVideo(); updateVideoUI(false, lesson.pdf); }
}

function renderChapters(data) {
    const list = document.getElementById('chapterList');
    const placeholder = document.getElementById('lesson-placeholder');
    list.innerHTML = "";
    if (data.length === 0) {
        placeholder.style.display = 'block'; list.style.display = 'none';
        placeholder.querySelector('p').innerHTML = '검색된 강의가 없습니다.<br>다른 키워드로 검색해 보세요.'; return;
    }
    placeholder.style.display = 'none'; list.style.display = 'grid';

    data.forEach(chap => {
        const detected = detectGrade(chap.grade); 
        const gradeClass = `grade-${detected}`;   
        const displayLabel = chap.grade;          

        const chapterEl = document.createElement('div');
        chapterEl.className = `chapter ${gradeClass}`;
        chapterEl.innerHTML = `
            <div class="chapter-header">
                <div>
                    <h3 class="grade-unit-line">
                        <span class="grade-label">${displayLabel}</span>
                        <span class="unit-label">${chap.unit}</span>
                    </h3>
                    <h4 class="chapter-line">
                        <span class="chapter-label">${chap.chapter}</span>
                        <span class="lesson-count">(${chap.lessons.length}강)</span>
                    </h4>
                </div>
            </div>
            <div class="lessons"><div class="lessons-inner">
                ${chap.lessons.map(l => l.lesson ? `<div class="lesson"><a href="#">${l.lesson}</a></div>` : '').join('')}
            </div></div>
        `;
        
        chapterEl.querySelector('.chapter-header').addEventListener('click', () => {
            const wasActive = chapterEl.classList.contains('active');
            list.querySelectorAll('.chapter.active').forEach(el => {
                el.classList.remove('active'); el.querySelector('.lessons').style.maxHeight = '0px';
            });
            if (!wasActive) {
                chapterEl.classList.add('active');
                const target = chapterEl.querySelector('.lessons');
                target.style.maxHeight = target.scrollHeight + 'px';
            }
        });
        
        chapterEl.querySelectorAll('.lesson a').forEach((link, idx) => {
            link.addEventListener('click', (e) => {
                e.preventDefault(); const lesson = chap.lessons[idx];
                if (isMobile()) {
                    if (lesson.videoid) window.open(`https://www.youtube.com/watch?v=${lesson.videoid}${lesson.time ? '&t='+lesson.time : ''}`, '_blank');
                    else alert('강의가 준비 중입니다.');
                } else { openModal(lesson); }
            });
        });
        list.appendChild(chapterEl);
    });
}

function performSearch() {
    const searchBox = document.getElementById('searchBox');
    const keyword = searchBox.value.toLowerCase().trim();
    const placeholder = document.getElementById('lesson-placeholder');
    const list = document.getElementById('chapterList');

    document.querySelectorAll('.filter-btn.active').forEach(b => b.classList.remove('active'));

    if (!keyword) {
        list.style.display = 'none'; placeholder.style.display = 'block'; return;
    }

    const detected = detectGrade(keyword);
    if(detected !== 'etc') {
        const btn = document.querySelector(`.filter-btn[data-grade="${detected}"]`);
        if(btn) btn.classList.add('active');
    }

    const andGroups = keyword.split(',').map(s => s.trim()).filter(Boolean);
    const filtered = allChapters.filter(chap => {
        return andGroups.every(group => {
            const orWords = group.split(/\s+/).filter(Boolean);
            return orWords.some(word => {
                const chapText = `${chap.grade} ${chap.unit} ${chap.chapter}`.toLowerCase();
                const lessonsText = chap.lessons.map(l => l.lesson).join(' ').toLowerCase();
                return chapText.includes(word) || lessonsText.includes(word);
            });
        });
    });
    renderChapters(filtered);
}

document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('searchBox');
    const placeholder = document.getElementById('lesson-placeholder');

    document.getElementById('searchBtn').addEventListener('click', performSearch);
    searchBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() { searchBox.value = this.dataset.grade; performSearch(); });
    });

    document.getElementById('playPauseBtn').onclick = () => { if(player) player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo(); };
    document.getElementById('skipBackwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() - 5, true);
    document.getElementById('skipForwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() + 5, true);
    document.getElementById('fullscreenBtn').onclick = () => document.getElementById('lessonVideo').requestFullscreen();
    document.getElementById('endLectureBtn').onclick = () => { document.getElementById('videoModal').classList.remove('show'); player?.stopVideo(); };
    
    document.getElementById('showPdfBtn').onclick = (e) => {
        const pc = document.getElementById('modalPdfContainer'), vc = document.getElementById('videoContainer'), frame = document.getElementById('modalPdfFrame');
        if (pc.style.width !== '0px' && pc.style.width !== '') { pc.style.width = '0'; vc.style.width = '100%'; e.target.innerText = '교재 보기'; }
        else { 
            if (frame.src.includes("about:blank")) frame.src = getDriveLink(e.target.dataset.pdfId);
            const targetW = Math.max(document.getElementById('videoContent').offsetHeight * 0.707, 600);
            pc.style.width = targetW + 'px'; vc.style.width = `calc(100% - ${targetW}px)`; e.target.innerText = '교재 닫기';
        }
    };
    document.querySelectorAll('.speedOption').forEach(b => { b.onclick = () => player?.setPlaybackRate(parseFloat(b.dataset.speed)); });

    // [로딩 버그 해결] 데이터 수신 후 스피너 제거 로직
    fetchAllSheets().then(data => { 
        allChapters = data.chapters; 
        
        // 1. 스피너 SVG 숨기기
        const spinner = placeholder.querySelector('.loading-spinner');
        if (spinner) spinner.style.display = 'none';

        // 2. 안내 텍스트 업데이트
        placeholder.querySelector('p').innerHTML = `
            <svg style="width:50px; height:50px; fill:#cbd5e1; margin-bottom:15px;" viewBox="0 0 512 512"><path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"/></svg>
            <br>강의 데이터를 성공적으로 불러왔습니다.<br>학년 버튼을 누르거나 키워드를 검색해 보세요.
        `;
    }).catch(err => {
        console.error("Data Load Error:", err);
        placeholder.querySelector('p').innerText = "데이터 로딩 중 오류가 발생했습니다.";
    });
});