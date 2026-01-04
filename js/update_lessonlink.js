const fs = require('fs');
const axios = require('axios');

// 구글 시트 CSV URL 배열
const sheetUrls = [
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTolu1HDJX59N3vyAnznaoxNuhf7dF4MfT2KR0wJVnVX8St5Dcln7Yc2rE6HQTTlGnovnpWetgWthli/pub?gid=0&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTolu1HDJX59N3vyAnznaoxNuhf7dF4MfT2KR0wJVnVX8St5Dcln7Yc2rE6HQTTlGnovnpWetgWthli/pub?gid=787628102&single=true&output=csv"
];

async function fetchAndSave() {
  try {
    const allData = [];
    
    for (const url of sheetUrls) {
      const res = await axios.get(url);
      // CSV 파싱 로직 (쉼표 구분 및 따옴표 처리)
      const rows = res.data.trim().split(/\r?\n/).map(r => r.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/));
      if (rows.length < 2) continue;

      const headers = rows[0].map(h => h.trim());
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = row[i]?.replace(/^"|"$/g, "") || "");
        return obj;
      });
      allData.push(...data);
    }

    // 데이터 그룹화 (학년_단원_챕터 단위)
    const grouped = {};
    allData.forEach(d => {
      const key = `${d.grade}_${d.unit}_${d.chapter}`;
      if (!grouped[key]) {
          grouped[key] = { 
              grade: d.grade || "", 
              unit: d.unit || "", 
              chapter: d.chapter || "", 
              lessons: [] 
          };
      }
      grouped[key].lessons.push({
        lesson: d.lesson || "",
        pdf: d.pdf || "",
        listid: d.listid || "",
        videoid: d.videoid || "",
        time: d.time || ""
      });
    });

    const finalData = { chapters: Object.values(grouped), allLessons: allData };
    
    // 최종 결과를 lessonlink.json 파일로 저장
    fs.writeFileSync('./lessonlink.json', JSON.stringify(finalData, null, 2));
    console.log("✅ lessonlink.json 파일이 성공적으로 생성되었습니다.");
    
  } catch (e) {
    console.error("❌ 업데이트 실패:", e);
    process.exit(1);
  }
}

fetchAndSave();