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

export const EVAL_LEVELS = ['Giỏi', 'Khá', 'Đạt', 'Chưa Đạt'];
