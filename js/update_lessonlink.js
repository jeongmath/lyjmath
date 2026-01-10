const fs = require('fs');
const axios = require('axios');


// 구글 시트 CSV URL 배열
const sheetUrls = [
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=0&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=132742590&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=1482385894&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=422321869&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=1247568102&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=602759507&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=116381557&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR75_mvscHYwhGjRESHgdWjxsQpXsQ7xH60zoQgw4jomxuxKn61FBhPNg0EYDPW3I1l3elWzQMlQUQV/pub?gid=2022253372&single=true&output=csv"
];

async function fetchAndSave() {
  try {
    const allData = [];
    
    for (const url of sheetUrls) {
      const res = await axios.get(url);
      
      // 1. CSV 파싱 (줄바꿈 및 쉼표 처리)
      const rows = res.data.trim().split(/\r?\n/).map(r => r.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/));
      if (rows.length < 2) continue;

      const headers = rows[0].map(h => h.trim());

      // 2. 객체 변환 및 필터링 적용
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          // 따옴표 제거 및 앞뒤 공백 제거(trim)
          obj[h] = (row[i] || "").replace(/^"|"$/g, "").trim();
        });
        return obj;
      })
      /**
       * ⭐ [필터링 조건 수정]
       * 1. [구분] 필터 삭제됨
       * 2. 학년(grade)이 비어있지 않아야 함 (AND)
       * 3. 강의명(lesson)이 비어있지 않아야 함
       */
      .filter(obj => 
        obj.grade !== "" && obj.lesson !== ""
      );

      allData.push(...data);
    }

    // 3. 데이터 그룹화 (학년_단원_챕터 단위)
    const grouped = {};
    allData.forEach(d => {
      const key = `${d.grade}_${d.unit}_${d.chapter}`;
      if (!grouped[key]) {
          grouped[key] = { 
              grade: d.grade, 
              unit: d.unit, 
              chapter: d.chapter, 
              lessons: [] 
          };
      }
      
      grouped[key].lessons.push({
        lesson: d.lesson,
        pdf: d.pdf,
        listid: d.listid,
        videoid: d.videoid,
        time: d.time
      });
    });

    // 4. 최종 데이터 구조 형성
    const finalData = { 
      chapters: Object.values(grouped), 
      allLessons: allData 
    };
    
    // 5. lessonlink.json 파일로 저장
    fs.writeFileSync('./lessonlink.json', JSON.stringify(finalData, null, 2));
    console.log("✅ 업데이트 완료: 학년과 강의명이 모두 있는 행을 모두 저장했습니다.");
    
  } catch (e) {
    console.error("❌ 업데이트 실패:", e);
    process.exit(1);
  }
}

fetchAndSave();