// [v15.0 최종] 깃허브/클라우드플레어 배포 환경 완벽 대응 버전
let player = null, allChapters = [];

// 1. 학년 판별 함수 (CSS 매칭을 위해 영문 코드 반환)
function detectGrade(text = '') {
    if (!text) return 'etc';
    if (text.includes('중1')) return 'm1';
    if (text.includes('중2')) return 'm2';
    if (text.includes('중3')) return 'm3';
    if (text.includes('고1')) return 'h1';
    if (text.includes('고2')) return 'h2';
    if (text.includes('고3')) return 'h3';
    return 'etc'; // [공부법], [특강], [tip] 등은 모두 etc(보라색)로 분류
}

function isMobile() { return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent); }
function getDriveLink(id) { return id ? `https://drive.google.com/file/d/${id}/preview` : ''; }

function updateVideoUI(hasVideo, lessonPdf) {
    const vPlayer = document.getElementById('lessonVideo');
    const vPlaceholder = document.getElementById('videoPlaceholder');
    const vControls = document.querySelectorAll('#videoControls button');
    vPlayer.style.display = hasVideo ? 'block' : 'none';
    vPlaceholder.style.display = hasVideo ? 'none' : 'flex';
    vControls.forEach(btn => { if (btn.id !== 'endLectureBtn' && btn.id !== 'showPdfBtn') btn.disabled = !hasVideo; });
    if (!hasVideo) vPlaceholder.innerHTML = lessonPdf ? '강의가 준비 중이거나<br>PDF 교재만 제공됩니다.' : '강의가 준비 중입니다.';
}

function setupPlayer(lesson) {
    const startSec = lesson.time ? parseInt(lesson.time) : 0;
    if (!player) {
        player = new YT.Player('lessonVideo', {
            height: '100%', width: '100%',
            playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
            events: {
                'onReady': () => player.loadVideoById(lesson.videoid, startSec),
                'onStateChange': (e) => {
                    const btn = document.getElementById('playPauseBtn');
                    if(btn) btn.innerText = (e.data === YT.PlayerState.PLAYING) ? '일시 정지' : '재 생';
                }
            }
        });
    } else { player.loadVideoById(lesson.videoid, startSec); }
}

function openModal(lesson) {
    document.getElementById('videoModal').classList.add('show');
    const showPdfBtn = document.getElementById('showPdfBtn');
    if (lesson.pdf) { showPdfBtn.disabled = false; showPdfBtn.innerText = '교재 보기'; showPdfBtn.dataset.pdfId = lesson.pdf; }
    else { showPdfBtn.disabled = true; showPdfBtn.innerText = '교재 없음'; }
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
        placeholder.querySelector('p').innerHTML = '검색된 강의가 없습니다.'; return;
    }
    placeholder.style.display = 'none'; list.style.display = 'grid';

    data.forEach(chap => {
        const gradeKey = detectGrade(chap.grade); 
        const gradeClass = `grade-${gradeKey}`; // 영문 클래스 (grade-m1 등)
        const displayLabel = chap.grade;        // 화면 표시 (원문 그대로)

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
    if (!keyword) { renderChapters([]); return; }

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
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('searchBox').addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() { document.getElementById('searchBox').value = this.dataset.grade; performSearch(); });
    });
    // 모달 제어 등 기타 이벤트 로직 생략 (백업본 유지)
    document.getElementById('playPauseBtn').onclick = () => { if(player) player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo(); };
    document.getElementById('skipBackwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() - 5, true);
    document.getElementById('skipForwardBtn').onclick = () => player?.seekTo(player.getCurrentTime() + 5, true);
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

    fetchAllSheets().then(data => { 
        allChapters = data.chapters; 
        const spin = document.querySelector('.loading-spinner');
        if (spin) spin.style.display = 'none';
        document.getElementById('lesson-placeholder').querySelector('p').innerText = "데이터 로드 완료. 검색해 보세요!";
    });
});