// 지식 — 레시피 데이터베이스
// 영양 정보는 1인분 기준 대략적인 추정치입니다.
// tags: lowcal(저칼로리) / protein(고단백) / lowgi(저당·혈당 완만) / lowsalt(저염)
// steps.act: cut, mix, boil, stir, fry, bake, steam, plate, wash, soak, microwave, season

// 소금·간장·기름처럼 대부분의 집에 있는 기본 양념 (부족 재료로 계산하지 않음)
const PANTRY = ["소금", "후추", "간장", "저염간장", "식용유", "올리브유", "참기름", "들기름", "설탕", "고춧가루", "고추장", "된장", "식초", "참깨", "물", "다진마늘", "꿀", "알룰로스", "레몬즙", "카레가루", "전분"];

const EMOJI = {
  달걀: "🥚", 두부: "🧈", 닭가슴살: "🍗", 양파: "🧅", 대파: "🌿", 마늘: "🧄", 당근: "🥕", 애호박: "🥒",
  감자: "🥔", 고구마: "🍠", 브로콜리: "🥦", 시금치: "🥬", 양배추: "🥬", 토마토: "🍅", 방울토마토: "🍅",
  버섯: "🍄", 현미밥: "🍚", 밥: "🍚", 귀리: "🌾", 우유: "🥛", 그릭요거트: "🥣", 바나나: "🍌", 사과: "🍎",
  연어: "🐟", 고등어: "🐟", 돼지고기: "🥩", 소고기: "🥩", 김치: "🌶️", 참치캔: "🥫", 파프리카: "🫑",
  오이: "🥒", 아보카도: "🥑", 콩나물: "🌱", 두유: "🥛", 견과류: "🥜", 치즈: "🧀", 통밀빵: "🍞",
  양상추: "🥬", 새우: "🦐", 메밀면: "🍜", 블루베리: "🫐", 닭다리살: "🍗", 고추: "🌶️", 깻잎: "🌿",
  김: "🟩", 미역: "🌊", 단호박: "🎃", 렌틸콩: "🫘", 병아리콩: "🫘", 옥수수: "🌽", 레몬: "🍋",
  소금: "🧂", 간장: "🫙", 저염간장: "🫙", 올리브유: "🫒", 참기름: "🫙", 들기름: "🫙", 고춧가루: "🌶️",
  고추장: "🌶️", 된장: "🫙", 식초: "🫙", 참깨: "⚪", 꿀: "🍯", 카레가루: "🟡", 물: "💧", 다진마늘: "🧄",
  후추: "⚫", 식용유: "🫙", 설탕: "🧂", 알룰로스: "🍯", 레몬즙: "🍋", 전분: "⚪"
};

// 재료별 기본 보관 기간(일) — 냉장고에 추가할 때 유통기한 기본값으로 사용
const SHELF_DAYS = {
  달걀: 21, 두부: 5, 닭가슴살: 3, 양파: 30, 대파: 10, 마늘: 30, 당근: 21, 애호박: 7, 감자: 30, 고구마: 21,
  브로콜리: 5, 시금치: 4, 양배추: 14, 토마토: 7, 방울토마토: 7, 버섯: 5, 현미밥: 3, 밥: 2, 귀리: 180,
  우유: 7, 그릭요거트: 10, 바나나: 5, 사과: 21, 연어: 2, 고등어: 2, 돼지고기: 3, 소고기: 3, 김치: 60,
  참치캔: 365, 파프리카: 10, 오이: 7, 아보카도: 4, 콩나물: 3, 두유: 10, 견과류: 90, 치즈: 30, 통밀빵: 5,
  양상추: 5, 새우: 2, 메밀면: 180, 블루베리: 5, 닭다리살: 3, 고추: 10, 깻잎: 5, 김: 90, 미역: 180,
  단호박: 30, 렌틸콩: 365, 병아리콩: 365, 옥수수: 5, 레몬: 21
};

const RECIPES = [
  {
    id: "tofu-egg-scramble", name: "두부 달걀 스크램블", emoji: "🍳", time: 10, kcal: 310, protein: 24, carbs: 9, fat: 19, sodium: 420, sugar: 4,
    tags: ["lowcal", "protein", "lowgi"], meal: ["아침"],
    ingredients: [{ n: "두부", a: "1/2모" }, { n: "달걀", a: "2개" }, { n: "양파", a: "1/4개" }, { n: "시금치", a: "한 줌", opt: true }, { n: "소금", a: "약간" }, { n: "올리브유", a: "1작은술" }],
    steps: [
      { act: "cut", items: ["양파", "시금치"], text: "양파는 잘게 다지고, 시금치는 한입 크기로 썰어요.", sec: 60 },
      { act: "mix", items: ["두부", "달걀"], text: "두부를 손으로 으깨 물기를 짜고 달걀과 함께 섞어요.", sec: 60 },
      { act: "fry", items: ["양파"], text: "팬에 올리브유를 두르고 양파를 1분간 볶아요.", sec: 60 },
      { act: "stir", items: ["두부", "달걀", "시금치"], text: "두부 달걀물과 시금치를 넣고 약불에서 저어가며 익혀요.", sec: 180 },
      { act: "plate", items: ["후추"], text: "소금·후추로 간하고 그릇에 담아 완성!", sec: 30 }
    ]
  },
  {
    id: "chicken-salad", name: "닭가슴살 샐러드 볼", emoji: "🥗", time: 15, kcal: 380, protein: 38, carbs: 18, fat: 16, sodium: 480, sugar: 7,
    tags: ["lowcal", "protein", "lowgi"], meal: ["점심", "저녁"],
    ingredients: [{ n: "닭가슴살", a: "1덩이(120g)" }, { n: "양상추", a: "한 줌" }, { n: "방울토마토", a: "6개" }, { n: "오이", a: "1/2개" }, { n: "아보카도", a: "1/2개", opt: true }, { n: "올리브유", a: "1큰술" }, { n: "레몬즙", a: "1큰술" }],
    steps: [
      { act: "boil", items: ["닭가슴살"], text: "끓는 물에 닭가슴살을 넣고 12분간 삶아요.", sec: 720 },
      { act: "wash", items: ["양상추", "방울토마토"], text: "채소를 깨끗이 씻어 물기를 빼요.", sec: 60 },
      { act: "cut", items: ["오이", "방울토마토", "아보카도"], text: "오이·방울토마토·아보카도를 한입 크기로 썰어요.", sec: 90 },
      { act: "cut", items: ["닭가슴살"], text: "삶은 닭가슴살을 결대로 찢거나 썰어요.", sec: 60 },
      { act: "mix", items: ["올리브유", "레몬즙"], text: "올리브유·레몬즙·소금·후추로 드레싱을 만들어요.", sec: 30 },
      { act: "plate", items: ["양상추", "닭가슴살"], text: "볼에 모두 담고 드레싱을 뿌려 완성!", sec: 20 }
    ]
  },
  {
    id: "salmon-rice-bowl", name: "연어 현미 포케", emoji: "🍣", time: 15, kcal: 560, protein: 32, carbs: 58, fat: 21, sodium: 610, sugar: 6,
    tags: ["protein", "lowgi"], meal: ["점심", "저녁"],
    ingredients: [{ n: "연어", a: "120g" }, { n: "현미밥", a: "1공기" }, { n: "아보카도", a: "1/2개" }, { n: "오이", a: "1/3개" }, { n: "양파", a: "1/8개" }, { n: "간장", a: "1큰술" }, { n: "참기름", a: "1작은술" }, { n: "참깨", a: "약간" }],
    steps: [
      { act: "cut", items: ["연어"], text: "연어를 2cm 크기 큐브로 썰어요.", sec: 60 },
      { act: "mix", items: ["연어", "간장", "참기름"], text: "간장·참기름에 연어를 5분간 버무려 재워요.", sec: 300 },
      { act: "cut", items: ["아보카도", "오이", "양파"], text: "아보카도·오이는 깍둑썰기, 양파는 얇게 채 썰어요.", sec: 90 },
      { act: "plate", items: ["현미밥", "연어", "아보카도"], text: "그릇에 현미밥을 깔고 재료를 둘러 담은 뒤 참깨를 뿌려요.", sec: 40 }
    ]
  },
  {
    id: "beef-bulgogi-rice", name: "소고기 불고기 덮밥", emoji: "🍛", time: 20, kcal: 720, protein: 38, carbs: 82, fat: 24, sodium: 980, sugar: 16,
    tags: ["protein"], meal: ["점심", "저녁"],
    ingredients: [{ n: "소고기", a: "150g" }, { n: "양파", a: "1/2개" }, { n: "대파", a: "1/3대" }, { n: "당근", a: "1/4개", opt: true }, { n: "밥", a: "1공기" }, { n: "간장", a: "2큰술" }, { n: "설탕", a: "1큰술" }, { n: "다진마늘", a: "1작은술" }, { n: "참기름", a: "1작은술" }],
    steps: [
      { act: "mix", items: ["간장", "설탕", "다진마늘", "참기름"], text: "간장·설탕·다진마늘·참기름으로 양념장을 만들어요.", sec: 60 },
      { act: "soak", items: ["소고기"], text: "소고기를 양념장에 10분간 재워요.", sec: 600 },
      { act: "cut", items: ["양파", "대파", "당근"], text: "양파·당근은 채 썰고 대파는 어슷 썰어요.", sec: 90 },
      { act: "fry", items: ["소고기", "양파", "당근"], text: "센불에서 고기와 채소를 함께 5분간 볶아요.", sec: 300 },
      { act: "plate", items: ["밥", "대파"], text: "밥 위에 올리고 대파를 얹어 완성!", sec: 30 }
    ]
  },
  {
    id: "oat-banana-porridge", name: "바나나 오트밀 포리지", emoji: "🥣", time: 7, kcal: 340, protein: 13, carbs: 54, fat: 8, sodium: 110, sugar: 18,
    tags: ["lowcal", "lowsalt"], meal: ["아침"],
    ingredients: [{ n: "귀리", a: "40g" }, { n: "우유", a: "200ml" }, { n: "바나나", a: "1개" }, { n: "견과류", a: "한 줌", opt: true }, { n: "블루베리", a: "한 줌", opt: true }],
    steps: [
      { act: "boil", items: ["귀리", "우유"], text: "냄비에 귀리와 우유를 넣고 약불로 4분간 끓여요.", sec: 240 },
      { act: "cut", items: ["바나나"], text: "바나나를 동그랗게 썰어요.", sec: 30 },
      { act: "stir", items: ["바나나"], text: "바나나 절반을 으깨 넣고 잘 저어요.", sec: 60 },
      { act: "plate", items: ["견과류", "블루베리"], text: "그릇에 담고 남은 바나나·견과류·블루베리를 올려요.", sec: 30 }
    ]
  },
  {
    id: "greek-yogurt-bowl", name: "그릭요거트 베리 볼", emoji: "🫐", time: 3, kcal: 280, protein: 20, carbs: 30, fat: 9, sodium: 70, sugar: 17,
    tags: ["lowcal", "protein", "lowsalt"], meal: ["아침", "간식"],
    ingredients: [{ n: "그릭요거트", a: "200g" }, { n: "블루베리", a: "한 줌" }, { n: "사과", a: "1/2개", opt: true }, { n: "견과류", a: "1큰술" }, { n: "꿀", a: "1작은술", opt: true }],
    steps: [
      { act: "cut", items: ["사과"], text: "사과를 작게 깍둑 썰어요.", sec: 40 },
      { act: "plate", items: ["그릭요거트", "블루베리", "견과류"], text: "요거트 위에 과일과 견과류를 올리고 꿀을 살짝 뿌려요.", sec: 30 }
    ]
  },
  {
    id: "mackerel-grill", name: "고등어 구이 & 채소찜", emoji: "🐟", time: 20, kcal: 470, protein: 34, carbs: 14, fat: 31, sodium: 520, sugar: 5,
    tags: ["protein", "lowgi"], meal: ["점심", "저녁"],
    ingredients: [{ n: "고등어", a: "1/2마리" }, { n: "브로콜리", a: "1/3송이" }, { n: "양배추", a: "2장" }, { n: "레몬", a: "1/4개", opt: true }, { n: "올리브유", a: "1작은술" }],
    steps: [
      { act: "wash", items: ["고등어"], text: "고등어를 흐르는 물에 헹구고 키친타월로 물기를 닦아요.", sec: 60 },
      { act: "cut", items: ["브로콜리", "양배추"], text: "브로콜리와 양배추를 한입 크기로 잘라요.", sec: 60 },
      { act: "steam", items: ["브로콜리", "양배추"], text: "찜기에서 채소를 5분간 쪄요.", sec: 300 },
      { act: "fry", items: ["고등어"], text: "팬에 껍질 쪽부터 중불로 4분, 뒤집어 3분 구워요.", sec: 420 },
      { act: "plate", items: ["레몬"], text: "채소와 함께 담고 레몬을 곁들여 완성!", sec: 20 }
    ]
  },
  {
    id: "kimchi-fried-rice", name: "김치 참치 볶음밥", emoji: "🍚", time: 12, kcal: 610, protein: 27, carbs: 78, fat: 20, sodium: 1150, sugar: 6,
    tags: ["protein"], meal: ["점심", "저녁"],
    ingredients: [{ n: "김치", a: "1컵" }, { n: "참치캔", a: "1/2캔" }, { n: "밥", a: "1공기" }, { n: "대파", a: "1/3대" }, { n: "달걀", a: "1개" }, { n: "참기름", a: "1작은술" }, { n: "고춧가루", a: "약간", opt: true }],
    steps: [
      { act: "cut", items: ["김치", "대파"], text: "김치는 잘게 썰고 대파는 송송 썰어요.", sec: 60 },
      { act: "fry", items: ["대파"], text: "팬에 기름을 두르고 대파를 볶아 파기름을 내요.", sec: 60 },
      { act: "fry", items: ["김치", "참치캔"], text: "김치와 기름 뺀 참치를 넣고 3분간 볶아요.", sec: 180 },
      { act: "stir", items: ["밥"], text: "밥을 넣고 고루 섞으며 2분 더 볶아요.", sec: 120 },
      { act: "fry", items: ["달걀"], text: "달걀 프라이를 따로 부쳐요.", sec: 120 },
      { act: "plate", items: ["달걀", "참기름"], text: "볶음밥 위에 달걀을 올리고 참기름을 둘러 완성!", sec: 20 }
    ]
  },
  {
    id: "tofu-doenjang-soup", name: "저염 두부 된장찌개", emoji: "🍲", time: 20, kcal: 260, protein: 18, carbs: 16, fat: 12, sodium: 590, sugar: 5,
    tags: ["lowcal", "lowgi", "lowsalt"], meal: ["점심", "저녁"],
    ingredients: [{ n: "두부", a: "1/2모" }, { n: "애호박", a: "1/3개" }, { n: "양파", a: "1/4개" }, { n: "버섯", a: "한 줌" }, { n: "대파", a: "1/4대" }, { n: "된장", a: "1큰술(평소의 2/3)" }, { n: "다진마늘", a: "1/2작은술" }],
    steps: [
      { act: "cut", items: ["두부", "애호박", "양파", "버섯"], text: "두부·애호박·양파·버섯을 깍둑 썰어요.", sec: 120 },
      { act: "boil", items: ["물", "된장"], text: "물 400ml에 된장을 풀어 끓여요. (멸치 육수를 쓰면 된장을 더 줄여도 맛있어요)", sec: 180 },
      { act: "boil", items: ["애호박", "양파", "버섯"], text: "채소를 넣고 5분간 끓여요.", sec: 300 },
      { act: "boil", items: ["두부", "다진마늘"], text: "두부와 마늘을 넣고 3분 더 끓여요.", sec: 180 },
      { act: "plate", items: ["대파"], text: "대파를 올리고 불을 꺼서 완성!", sec: 20 }
    ]
  },
  {
    id: "sweetpotato-chicken", name: "고구마 닭가슴살 오븐구이", emoji: "🍠", time: 30, kcal: 520, protein: 42, carbs: 52, fat: 14, sodium: 380, sugar: 14,
    tags: ["protein", "lowsalt"], meal: ["점심", "저녁"],
    ingredients: [{ n: "닭가슴살", a: "150g" }, { n: "고구마", a: "1개(150g)" }, { n: "브로콜리", a: "1/3송이" }, { n: "파프리카", a: "1/2개", opt: true }, { n: "올리브유", a: "1큰술" }, { n: "후추", a: "약간" }],
    steps: [
      { act: "cut", items: ["고구마", "파프리카"], text: "고구마는 웨지 모양으로, 파프리카는 큼직하게 썰어요.", sec: 90 },
      { act: "season", items: ["닭가슴살", "올리브유", "후추"], text: "닭가슴살에 올리브유·후추·소금 약간을 발라요.", sec: 60 },
      { act: "bake", items: ["고구마"], text: "200℃ 오븐(에어프라이어)에 고구마를 먼저 10분 구워요.", sec: 600 },
      { act: "bake", items: ["닭가슴살", "브로콜리", "파프리카"], text: "닭가슴살과 채소를 넣고 12분 더 구워요.", sec: 720 },
      { act: "plate", items: ["닭가슴살"], text: "닭가슴살을 썰어 함께 담아 완성!", sec: 30 }
    ]
  },
  {
    id: "egg-toast", name: "아보카도 에그 토스트", emoji: "🥑", time: 10, kcal: 420, protein: 18, carbs: 34, fat: 24, sodium: 450, sugar: 4,
    tags: ["lowgi"], meal: ["아침"],
    ingredients: [{ n: "통밀빵", a: "2장" }, { n: "아보카도", a: "1/2개" }, { n: "달걀", a: "2개" }, { n: "방울토마토", a: "4개", opt: true }, { n: "후추", a: "약간" }],
    steps: [
      { act: "bake", items: ["통밀빵"], text: "통밀빵을 바삭하게 구워요.", sec: 120 },
      { act: "mix", items: ["아보카도", "레몬즙"], text: "아보카도를 으깨 소금·레몬즙 약간과 섞어요.", sec: 60 },
      { act: "fry", items: ["달걀"], text: "달걀을 반숙 프라이로 부쳐요.", sec: 150 },
      { act: "plate", items: ["통밀빵", "아보카도", "달걀"], text: "빵 위에 아보카도와 달걀을 올리고 후추를 뿌려요.", sec: 30 }
    ]
  },
  {
    id: "pork-kimchi-stew", name: "돼지고기 김치찌개", emoji: "🥘", time: 25, kcal: 480, protein: 30, carbs: 14, fat: 33, sodium: 1450, sugar: 6,
    tags: ["protein"], meal: ["점심", "저녁"],
    ingredients: [{ n: "돼지고기", a: "120g" }, { n: "김치", a: "1.5컵" }, { n: "두부", a: "1/3모" }, { n: "양파", a: "1/4개" }, { n: "대파", a: "1/3대" }, { n: "고춧가루", a: "1작은술" }],
    steps: [
      { act: "cut", items: ["돼지고기", "김치", "양파"], text: "돼지고기·김치·양파를 한입 크기로 썰어요.", sec: 90 },
      { act: "fry", items: ["돼지고기", "김치"], text: "냄비에 돼지고기와 김치를 넣고 3분간 볶아요.", sec: 180 },
      { act: "boil", items: ["물", "고춧가루"], text: "물 500ml와 고춧가루를 넣고 10분간 끓여요.", sec: 600 },
      { act: "boil", items: ["두부", "양파"], text: "두부와 양파를 넣고 5분 더 끓여요.", sec: 300 },
      { act: "plate", items: ["대파"], text: "대파를 넣고 한소끔 끓여 완성!", sec: 30 }
    ]
  },
  {
    id: "shrimp-broccoli", name: "새우 브로콜리 마늘볶음", emoji: "🦐", time: 12, kcal: 290, protein: 28, carbs: 12, fat: 14, sodium: 520, sugar: 3,
    tags: ["lowcal", "protein", "lowgi"], meal: ["점심", "저녁"],
    ingredients: [{ n: "새우", a: "10마리" }, { n: "브로콜리", a: "1/2송이" }, { n: "마늘", a: "4쪽" }, { n: "파프리카", a: "1/3개", opt: true }, { n: "올리브유", a: "1큰술" }, { n: "저염간장", a: "1작은술" }],
    steps: [
      { act: "cut", items: ["브로콜리", "마늘", "파프리카"], text: "브로콜리는 송이로 나누고 마늘은 편 썰어요.", sec: 90 },
      { act: "boil", items: ["브로콜리"], text: "브로콜리를 끓는 물에 1분 데쳐요.", sec: 60 },
      { act: "fry", items: ["마늘"], text: "올리브유에 마늘을 약불로 볶아 향을 내요.", sec: 90 },
      { act: "fry", items: ["새우", "브로콜리", "파프리카"], text: "새우·브로콜리·파프리카를 넣고 3분간 볶아요.", sec: 180 },
      { act: "plate", items: ["저염간장"], text: "저염간장·후추로 간해서 완성!", sec: 20 }
    ]
  },
  {
    id: "lentil-curry", name: "렌틸콩 채소 카레", emoji: "🍛", time: 25, kcal: 450, protein: 21, carbs: 66, fat: 10, sodium: 560, sugar: 9,
    tags: ["lowgi", "lowsalt"], meal: ["점심", "저녁"],
    ingredients: [{ n: "렌틸콩", a: "1/3컵" }, { n: "양파", a: "1/2개" }, { n: "당근", a: "1/3개" }, { n: "감자", a: "1/2개", opt: true }, { n: "토마토", a: "1개" }, { n: "카레가루", a: "2큰술" }, { n: "현미밥", a: "2/3공기", opt: true }],
    steps: [
      { act: "wash", items: ["렌틸콩"], text: "렌틸콩을 2~3번 헹궈요.", sec: 60 },
      { act: "cut", items: ["양파", "당근", "감자", "토마토"], text: "채소를 모두 작게 깍둑 썰어요.", sec: 150 },
      { act: "fry", items: ["양파"], text: "양파를 갈색이 될 때까지 볶아요.", sec: 240 },
      { act: "boil", items: ["렌틸콩", "당근", "감자", "토마토"], text: "나머지 재료와 물 400ml를 넣고 12분간 끓여요.", sec: 720 },
      { act: "stir", items: ["카레가루"], text: "카레가루를 풀어 넣고 걸쭉해질 때까지 저어요.", sec: 120 },
      { act: "plate", items: ["현미밥"], text: "현미밥과 함께 담아 완성!", sec: 20 }
    ]
  },
  {
    id: "buckwheat-noodle", name: "메밀 비빔국수", emoji: "🍜", time: 15, kcal: 430, protein: 15, carbs: 76, fat: 7, sodium: 820, sugar: 12,
    tags: ["lowgi"], meal: ["점심"],
    ingredients: [{ n: "메밀면", a: "1인분" }, { n: "오이", a: "1/3개" }, { n: "달걀", a: "1개" }, { n: "김치", a: "1/4컵", opt: true }, { n: "고추장", a: "1큰술" }, { n: "식초", a: "1큰술" }, { n: "참기름", a: "1작은술" }],
    steps: [
      { act: "boil", items: ["달걀"], text: "달걀을 10분간 삶아요.", sec: 600 },
      { act: "boil", items: ["메밀면"], text: "메밀면을 4분간 삶아 찬물에 헹궈요.", sec: 240 },
      { act: "cut", items: ["오이", "김치"], text: "오이는 채 썰고 김치는 잘게 썰어요.", sec: 60 },
      { act: "mix", items: ["고추장", "식초", "참기름"], text: "고추장·식초·참기름으로 비빔장을 만들어 면과 버무려요.", sec: 60 },
      { act: "plate", items: ["오이", "달걀"], text: "오이와 반 자른 달걀을 올려 완성!", sec: 20 }
    ]
  },
  {
    id: "bean-sprout-rice", name: "콩나물 버섯밥", emoji: "🌱", time: 25, kcal: 390, protein: 12, carbs: 72, fat: 6, sodium: 380, sugar: 3,
    tags: ["lowcal", "lowsalt"], meal: ["점심", "저녁"],
    ingredients: [{ n: "콩나물", a: "한 줌" }, { n: "버섯", a: "한 줌" }, { n: "현미밥", a: "1공기" }, { n: "대파", a: "1/4대" }, { n: "저염간장", a: "1큰술" }, { n: "참기름", a: "1작은술" }],
    steps: [
      { act: "wash", items: ["콩나물"], text: "콩나물을 깨끗이 씻어요.", sec: 60 },
      { act: "cut", items: ["버섯", "대파"], text: "버섯은 얇게 썰고 대파는 송송 썰어요.", sec: 60 },
      { act: "steam", items: ["콩나물", "버섯", "현미밥"], text: "냄비에 밥과 콩나물·버섯을 얹고 물 3큰술을 넣어 뚜껑 덮고 약불로 8분 쪄요.", sec: 480 },
      { act: "mix", items: ["저염간장", "대파", "참기름"], text: "저염간장·대파·참기름으로 양념장을 만들어요.", sec: 40 },
      { act: "plate", items: ["콩나물"], text: "골고루 섞어 양념장을 곁들여 완성!", sec: 20 }
    ]
  },
  {
    id: "protein-shake", name: "바나나 두유 단백 쉐이크", emoji: "🥤", time: 3, kcal: 420, protein: 26, carbs: 50, fat: 13, sodium: 160, sugar: 26,
    tags: ["protein", "lowsalt"], meal: ["아침", "간식"],
    ingredients: [{ n: "두유", a: "250ml" }, { n: "바나나", a: "1개" }, { n: "귀리", a: "2큰술" }, { n: "견과류", a: "1큰술" }, { n: "그릭요거트", a: "100g", opt: true }],
    steps: [
      { act: "cut", items: ["바나나"], text: "바나나를 큼직하게 잘라요.", sec: 20 },
      { act: "mix", items: ["두유", "바나나", "귀리", "견과류"], text: "모든 재료를 블렌더에 넣고 40초간 갈아요.", sec: 40 },
      { act: "plate", items: ["두유"], text: "컵에 담아 바로 마셔요!", sec: 10 }
    ]
  },
  {
    id: "tomato-egg-stir", name: "토마토 달걀 볶음", emoji: "🍅", time: 10, kcal: 250, protein: 14, carbs: 12, fat: 16, sodium: 380, sugar: 8,
    tags: ["lowcal", "lowgi", "lowsalt"], meal: ["아침", "점심"],
    ingredients: [{ n: "토마토", a: "2개" }, { n: "달걀", a: "2개" }, { n: "대파", a: "1/4대" }, { n: "식용유", a: "1큰술" }, { n: "소금", a: "약간" }],
    steps: [
      { act: "cut", items: ["토마토", "대파"], text: "토마토는 웨지 모양으로, 대파는 송송 썰어요.", sec: 60 },
      { act: "mix", items: ["달걀"], text: "달걀을 소금 한 꼬집과 함께 풀어요.", sec: 30 },
      { act: "fry", items: ["달걀"], text: "기름 두른 팬에 달걀을 반쯤 익혀 덜어내요.", sec: 60 },
      { act: "fry", items: ["대파", "토마토"], text: "대파를 볶다가 토마토를 넣고 2분간 볶아요.", sec: 120 },
      { act: "stir", items: ["달걀"], text: "달걀을 다시 넣고 가볍게 섞어 완성!", sec: 30 }
    ]
  },
  {
    id: "pumpkin-soup", name: "단호박 두유 수프", emoji: "🎃", time: 20, kcal: 240, protein: 9, carbs: 38, fat: 7, sodium: 260, sugar: 14,
    tags: ["lowcal", "lowsalt"], meal: ["아침", "저녁"],
    ingredients: [{ n: "단호박", a: "1/4통" }, { n: "양파", a: "1/4개" }, { n: "두유", a: "200ml" }, { n: "견과류", a: "약간", opt: true }],
    steps: [
      { act: "microwave", items: ["단호박"], text: "단호박을 전자레인지에 3분 돌려 부드럽게 해요.", sec: 180 },
      { act: "cut", items: ["단호박", "양파"], text: "껍질을 벗기고 양파와 함께 작게 썰어요.", sec: 90 },
      { act: "boil", items: ["단호박", "양파", "물"], text: "물 100ml를 넣고 7분간 푹 끓여요.", sec: 420 },
      { act: "mix", items: ["두유"], text: "두유를 넣고 블렌더로 곱게 갈아요.", sec: 60 },
      { act: "plate", items: ["견과류"], text: "소금 약간으로 간하고 견과류를 뿌려 완성!", sec: 20 }
    ]
  },
  {
    id: "beef-steak-potato", name: "소고기 스테이크 & 감자", emoji: "🥩", time: 25, kcal: 780, protein: 52, carbs: 46, fat: 42, sodium: 640, sugar: 5,
    tags: ["protein"], meal: ["저녁"],
    ingredients: [{ n: "소고기", a: "200g" }, { n: "감자", a: "1개" }, { n: "버섯", a: "한 줌" }, { n: "마늘", a: "4쪽" }, { n: "올리브유", a: "1큰술" }, { n: "소금", a: "약간" }, { n: "후추", a: "약간" }],
    steps: [
      { act: "season", items: ["소고기", "소금", "후추"], text: "소고기에 소금·후추를 뿌려 10분간 실온에 둬요.", sec: 600 },
      { act: "microwave", items: ["감자"], text: "감자를 웨지로 썰어 전자레인지에 4분 돌려요.", sec: 240 },
      { act: "fry", items: ["소고기", "마늘"], text: "센불로 달군 팬에서 고기를 앞뒤 2분씩 구워요.", sec: 240 },
      { act: "fry", items: ["감자", "버섯"], text: "고기를 레스팅하는 동안 감자와 버섯을 노릇하게 구워요.", sec: 240 },
      { act: "plate", items: ["소고기", "감자"], text: "고기를 썰어 가니쉬와 함께 담아 완성!", sec: 30 }
    ]
  },
  {
    id: "spinach-namul", name: "시금치 두부 무침", emoji: "🥬", time: 10, kcal: 170, protein: 12, carbs: 8, fat: 10, sodium: 330, sugar: 2,
    tags: ["lowcal", "lowgi", "lowsalt", "protein"], meal: ["점심", "저녁"],
    ingredients: [{ n: "시금치", a: "1단(200g)" }, { n: "두부", a: "1/3모" }, { n: "다진마늘", a: "1/2작은술" }, { n: "참기름", a: "1작은술" }, { n: "참깨", a: "약간" }],
    steps: [
      { act: "boil", items: ["시금치"], text: "끓는 물에 시금치를 30초 데쳐 찬물에 헹궈요.", sec: 60 },
      { act: "mix", items: ["두부"], text: "두부를 으깨 면포로 물기를 꼭 짜요.", sec: 60 },
      { act: "mix", items: ["시금치", "두부", "다진마늘", "참기름"], text: "시금치·두부·마늘·참기름·소금 약간을 넣고 조물조물 무쳐요.", sec: 60 },
      { act: "plate", items: ["참깨"], text: "참깨를 뿌려 완성!", sec: 10 }
    ]
  },
  {
    id: "chicken-thigh-teriyaki", name: "닭다리살 데리야끼 덮밥", emoji: "🍗", time: 20, kcal: 690, protein: 40, carbs: 76, fat: 22, sodium: 950, sugar: 18,
    tags: ["protein"], meal: ["점심", "저녁"],
    ingredients: [{ n: "닭다리살", a: "200g" }, { n: "양파", a: "1/2개" }, { n: "밥", a: "1공기" }, { n: "대파", a: "약간" }, { n: "간장", a: "2큰술" }, { n: "설탕", a: "1큰술" }],
    steps: [
      { act: "fry", items: ["닭다리살"], text: "닭다리살을 껍질부터 중불로 6분, 뒤집어 4분 구워요.", sec: 600 },
      { act: "cut", items: ["양파", "대파"], text: "양파는 채 썰고 대파는 송송 썰어요.", sec: 60 },
      { act: "stir", items: ["간장", "설탕", "양파"], text: "양파와 간장·설탕·물 3큰술을 넣고 졸여요.", sec: 180 },
      { act: "plate", items: ["밥", "닭다리살", "대파"], text: "닭을 썰어 밥 위에 올리고 소스·대파를 뿌려 완성!", sec: 30 }
    ]
  },
  {
    id: "cabbage-egg-pancake", name: "양배추 달걀전 (오코노미 스타일)", emoji: "🥞", time: 15, kcal: 330, protein: 17, carbs: 22, fat: 19, sodium: 420, sugar: 7,
    tags: ["lowcal", "lowgi"], meal: ["아침", "점심"],
    ingredients: [{ n: "양배추", a: "1/6통" }, { n: "달걀", a: "2개" }, { n: "당근", a: "1/4개", opt: true }, { n: "참치캔", a: "1/3캔", opt: true }, { n: "식용유", a: "1큰술" }],
    steps: [
      { act: "cut", items: ["양배추", "당근"], text: "양배추와 당근을 가늘게 채 썰어요.", sec: 90 },
      { act: "mix", items: ["양배추", "달걀", "참치캔"], text: "달걀·참치·소금 약간과 함께 고루 섞어요.", sec: 60 },
      { act: "fry", items: ["양배추"], text: "팬에 동그랗게 펴서 중약불로 앞뒤 4분씩 부쳐요.", sec: 480 },
      { act: "plate", items: ["양배추"], text: "먹기 좋게 잘라 담아 완성!", sec: 20 }
    ]
  },
  {
    id: "seaweed-soup", name: "소고기 미역국", emoji: "🍜", time: 30, kcal: 230, protein: 17, carbs: 6, fat: 15, sodium: 720, sugar: 1,
    tags: ["lowcal", "lowgi"], meal: ["아침", "저녁"],
    ingredients: [{ n: "미역", a: "10g(마른 것)" }, { n: "소고기", a: "80g" }, { n: "다진마늘", a: "1작은술" }, { n: "참기름", a: "1큰술" }, { n: "간장", a: "1큰술" }],
    steps: [
      { act: "soak", items: ["미역"], text: "마른 미역을 물에 15분 불려 먹기 좋게 잘라요.", sec: 900 },
      { act: "fry", items: ["소고기", "참기름"], text: "참기름에 소고기를 볶다가 미역을 넣고 2분 더 볶아요.", sec: 240 },
      { act: "boil", items: ["물", "미역"], text: "물 600ml를 붓고 15분간 끓여요.", sec: 900 },
      { act: "plate", items: ["간장", "다진마늘"], text: "간장·마늘로 간을 맞춰 완성!", sec: 30 }
    ]
  }
];
