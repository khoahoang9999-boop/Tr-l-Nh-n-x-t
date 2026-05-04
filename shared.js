export const GRADE_LEVELS = {
    'TH': ['1', '2', '3', '4', '5'],
    'THCS': ['6', '7', '8', '9'],
    'THPT': ['10', '11', '12']
};

export const SUBJECTS_MAP = {
    'TH': {
        '1': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Hoạt động trải nghiệm'],
        '2': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Hoạt động trải nghiệm'],
        '3': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Tự nhiên và Xã hội', 'Ngoại ngữ', 'Tin học', 'Công nghệ', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Hoạt động trải nghiệm'],
        '4': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Khoa học', 'Lịch sử và Địa lí', 'Ngoại ngữ', 'Tin học', 'Công nghệ', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Hoạt động trải nghiệm'],
        '5': ['Tiếng Việt', 'Toán', 'Đạo đức', 'Khoa học', 'Lịch sử và Địa lí', 'Ngoại ngữ', 'Tin học', 'Công nghệ', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Hoạt động trải nghiệm'],
    },
    'THCS': [
        'Ngữ văn', 'Toán', 'Ngoại ngữ', 'Giáo dục công dân', 'Lịch sử và Địa lí', 'Khoa học tự nhiên', 'Công nghệ', 'Tin học', 'Giáo dục thể chất', 'Âm nhạc', 'Mĩ thuật', 'Hoạt động trải nghiệm, hướng nghiệp', 'Nội dung giáo dục địa phương'
    ],
    'THPT': [
        'Ngữ văn', 'Toán', 'Ngoại ngữ', 'Lịch sử', 'Giáo dục thể chất', 'Giáo dục QPAN', 'Hoạt động trải nghiệm, hướng nghiệp', 'Nội dung giáo dục địa phương', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Vật lí', 'Hóa học', 'Sinh học', 'Công nghệ', 'Tin học', 'Âm nhạc', 'Mĩ thuật'
    ]
};

export function getSubjects(capHoc, khoiLop) {
    if (capHoc === 'TH') {
        return SUBJECTS_MAP.TH[khoiLop] || [];
    }
    return SUBJECTS_MAP[capHoc] || [];
}

export const EVAL_LEVELS = ['Tốt', 'Khá', 'Đạt', 'Chưa Đạt'];

export const getEmptySubject = (mon) => {
  const m = mon ? mon : "học";
  return {
    "Tốt": {
      min: 8, max: 10, code: "T",
      comments: [
        `Em hiểu bài nhanh, vận dụng kiến thức nhạy bén trong môn ${m}.`,
        `Có tư duy tốt, luôn hoàn thành xuất sắc các bài tập môn ${m}.`,
        `Học tập tự giác, đạt kết quả cao trong các bài kiểm tra ${m}.`,
        `Tích cực phát biểu xây dựng bài, có năng khiếu học tốt môn ${m}.`,
        `Nắm vững kiến thức trọng tâm, kỹ năng làm bài môn ${m} rất tốt.`,
      ]
    },
    "Khá": {
      min: 6.5, max: 7.9, code: "K",
      comments: [
        `Có tiến bộ trong môn ${m}, hiểu bài khá tốt.`,
        `Chăm chỉ học tập, hoàn thành đầy đủ bài tập môn ${m} được giao.`,
        `Nắm được kiến thức cơ bản môn ${m}, cần rèn luyện thêm kỹ năng vận dụng.`,
        `Có cố gắng trong học tập môn ${m}, kết quả đạt loại Khá.`,
        `Chú ý nghe giảng, ý thức học tập môn ${m} tốt, tiếp tục phát huy.`,
      ]
    },
    "Đạt": {
      min: 5, max: 6.4, code: "Đ",
      comments: [
        `Nắm bắt kiến thức môn ${m} ở mức độ cơ bản.`,
        `Cần chú ý nghe giảng và hoàn thành bài tập môn ${m} đầy đủ hơn.`,
        `Học lực đạt yêu cầu, tuy nhiên cần chủ động hơn trong học tập môn ${m}.`,
        `Có cố gắng nhưng kết quả môn ${m} chưa thực sự nổi bật.`,
        `Cần dành nhiều thời gian ôn bài ở nhà để củng cố kiến thức môn ${m}.`,
      ]
    },
    "Chưa Đạt": {
      min: 0, max: 4.9, code: "CĐ",
      comments: [
        `Thường xuyên thiếu tập trung trong giờ học môn ${m}, cần cố gắng nhiều hơn.`,
        `Chưa nắm được kiến thức cơ bản môn ${m}, cần tăng cường phụ đạo.`,
        `Kết quả học tập môn ${m} chưa đạt yêu cầu, cần chấn chỉnh lại thái độ học tập.`,
        `Lười làm bài tập về nhà môn ${m}, phụ huynh cần nhắc nhở thêm.`,
        `Ý thức học tập môn ${m} chưa tốt, tiếp thu bài còn chậm.`,
      ]
    },
  };
};

export const generateAllSampleData = () => {
  const currentData = { TH: {}, THCS: {}, THPT: {} };
  for (const capHoc of Object.keys(GRADE_LEVELS)) {
    for (const khoi of GRADE_LEVELS[capHoc]) {
      const h = khoi;
      currentData[capHoc][h] = { GVBM: {}, HOC_BA: [] };

      // Add HOC_BA samples
      currentData[capHoc][h].HOC_BA = [
        "Năng lực chung: Tự chủ, tự học tốt. Năng lực đặc thù: Vận dụng kiến thức tốt. Phẩm chất: Chăm chỉ, trách nhiệm.",
        "Năng lực chung: Giao tiếp, hợp tác khá. Năng lực đặc thù: Xử lý tình huống linh hoạt. Phẩm chất: Yêu nước, nhân ái.",
        "Năng lực chung: Giải quyết vấn đề tốt. Năng lực đặc thù: Tư duy phân tích tốt. Phẩm chất: Trách nhiệm, trung thực.",
        "Năng lực chung: Tự chủ, giao tiếp khá. Năng lực đặc thù: Thực hành tốt. Phẩm chất: Chăm ngoan, nhân ái.",
        "Năng lực chung: Tự học khá. Năng lực đặc thù: Cần rèn thêm kỹ năng. Phẩm chất: Có ý thức kỷ luật.",
      ];

      // Add GVBM samples for all subjects
      const subjects = getSubjects(capHoc, h);
      for (const mon of subjects) {
        currentData[capHoc][h].GVBM[mon] = getEmptySubject(mon);
      }
    }
  }
  return currentData;
};
