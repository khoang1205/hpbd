// ===================================================
// FILE CẤU HÌNH THÔNG TIN CHÚC MỪNG SINH NHẬT (NGƯỜI ĐẸP)
// Bạn có thể dễ dàng thay đổi thông tin, lời chúc, bài hát ở đây!
// ===================================================

const CONFIG = {
    // Thông tin người nhận
    recipientName: "ng đẹp ✨",
    birthdayDate: "09/10", // Định dạng ngày sinh (09/10)
    
    // Mật mã mở khóa phần 1
    secretQuiz: {
        question: "Đố ng đẹp biết hôm nay là ngày gì đặc biệt nhất?",
        correctAnswer: "sinh nhật",
        hint: "Gợi ý: Ngày ng đẹp rạng rỡ cất tiếng khóc chào đời ✨"
    },

    // Lời chúc trong thiệp cào
    secretLetter: `Mừng sinh nhật ng đẹp nha! 🎉✨

Chúc ng đẹp luôn mỉm cười thật tươi, luôn tràn đầy năng lượng tích cực và hạnh phúc mỗi ngày. Tuổi mới chúc ng đẹp đạt được mọi ước mơ, thành công trong học tập & công việc, luôn giữ được nét hồn nhiên, xinh đẹp này nha!

Một lần nữa, chúc ng đẹp luôn luôn vui cười, thích cái gì sẽ được cái đó. hạp pi pớt đayyyy 🌸🎂🎈`,

    // Lời nhắn cho tường kỷ niệm khi chưa có ảnh
    emptyPhotoMessage: "Tạm để đây 'giữ chỗ' vì chưa có ảnh của người đẹp với tui, hứa có ảnh chung sẽ up bù liền ✨",

    // Danh sách ảnh kỷ niệm (Để trống để hiện khung tượng trưng như ban đầu)
    photos: [],

    // Nhạc nền (Audio chúc mừng sinh nhật)
    musicUrl: "YTSave_YouTube_Media_7A__FGKx1FE_CESFERKHOI-HÔM-NAY-SINH-NHẬT-AI-THẾ-OFFICIAL-MUSIC-VIDEO_009_128k.mp3",

    musicStartTime: 26.3, // Bắt đầu bài hát từ 0:26.3
    
    // Cấu hình mic thổi nến
    micThreshold: 65 // Âm lượng ngưỡng phát hiện tiếng thổi vào mic (0-100)
};
