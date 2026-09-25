// ===================================================
// FILE CẤU HÌNH THÔNG TIN CHÚC MỪNG SINH NHẬT (NG ĐẸP)
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

    // Lời nhắn thay thế cho tường kỷ niệm khi chưa có ảnh
    emptyPhotoMessage: "Vì toi không có ảnh nào của ng đẹp nên để ở đây tượng trưng, sau này có thì sẽ bổ sung sau ✨",

    // Danh sách ảnh kỷ niệm (Hiện tại để trống)
    photos: [],

    // Nhạc nền (Audio chúc mừng sinh nhật)
    musicUrl: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=happy-birthday-155461.mp3",
    
    // Cấu hình mic thổi nến
    micThreshold: 35 // Âm lượng ngưỡng phát hiện tiếng thổi vào mic (0-100)
};
