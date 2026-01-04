// js/lessonlink.js
async function fetchAllSheets() {
  try {
    // 깃허브 액션이 만든 lessonlink.json을 읽어옴
    const res = await fetch('./lessonlink.json');
    if (!res.ok) throw new Error("JSON 파일을 로드할 수 없습니다.");
    return await res.json();
  } catch (e) {
    console.error("데이터 로딩 오류:", e);
    return { chapters: [], allLessons: [] };
  }
}