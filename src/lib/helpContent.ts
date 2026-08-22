// Nội dung hướng dẫn sử dụng app — soạn sẵn (deterministic), không cần AI.
// Tách 2 bộ: HỌC SINH và GIÁO VIÊN (cpanel). Trợ lý HelpAssistant đọc từ đây.

export interface HelpTopic {
  id: string;
  title: string;
  icon: string;
  steps: string[]; // các bước theo thứ tự
  tips?: string[]; // mẹo / lưu ý
}

export interface HelpGuide {
  audience: "student" | "teacher";
  title: string;
  intro: string;
  topics: HelpTopic[];
}

// ------------------------- HỌC SINH -------------------------
export const STUDENT_GUIDE: HelpGuide = {
  audience: "student",
  title: "Hướng dẫn cho học viên",
  intro: "Chọn mục bạn cần. Mỗi mục là các bước làm theo thứ tự.",
  topics: [
    {
      id: "login",
      title: "Đăng nhập bằng mã học viên",
      icon: "🔑",
      steps: [
        "Ở trang chủ, nhập Mã học viên vào ô đăng nhập rồi bấm xác nhận.",
        "Hệ thống hiện tên và lớp của bạn — kiểm tra đúng thông tin.",
        "Nếu hồ sơ chưa có email, nhập email để làm bài (dùng để lưu kết quả).",
      ],
      tips: [
        "Chế độ khách chỉ làm được bài xếp lớp. Muốn luyện Đọc/Nghe/Viết/Nói phải đăng nhập bằng mã.",
        "Không có mã? Liên hệ giáo viên để được cấp.",
      ],
    },
    {
      id: "reading-listening",
      title: "Làm bài Đọc / Nghe",
      icon: "📖",
      steps: [
        "Trang chủ → khu 'Luyện Đọc/Nghe' → chọn chủ đề rồi chọn đề.",
        "Bấm 'Bắt đầu làm bài' — bài chạy toàn màn hình.",
        "Đọc đoạn văn hoặc nghe audio, chọn/điền đáp án cho từng câu.",
        "Bấm 'Nộp bài' khi xong. Bài trắc nghiệm chấm điểm tự động.",
      ],
      tips: ["Bài Nghe: bấm nút play trên thanh audio để nghe. Có thể nghe lại nếu đề cho phép."],
    },
    {
      id: "writing",
      title: "Làm bài Viết",
      icon: "✍️",
      steps: [
        "Trang chủ → khu 'Chủ đề luyện viết' → chọn chủ đề (hệ thống bốc đề ngẫu nhiên).",
        "Đọc đề bài, viết bài vào ô soạn thảo. Theo dõi số từ ở dưới.",
        "Bấm 'Nộp bài'. Giáo viên sẽ chấm tay theo 4 tiêu chí IELTS và phản hồi sau.",
        "Xem điểm và nhận xét ở mục 'Xem tiến bộ'.",
      ],
      tips: ["Viết đủ số từ tối thiểu để không bị trừ điểm Task Response."],
    },
    {
      id: "speaking",
      title: "Làm bài Nói (ghi âm)",
      icon: "🎙",
      steps: [
        "Trang chủ → khu 'Speaking · Chủ đề luyện nói' → chọn chủ đề.",
        "Bấm 'Bắt đầu làm bài'. Màn thi hiện câu hỏi ở giữa.",
        "Bấm nút loa 🔊 bên cạnh câu hỏi để nghe đề (nếu đề có audio).",
        "Bấm 'Bắt đầu ghi âm' → cho phép trình duyệt dùng micro → nói câu trả lời.",
        "Bấm 'Dừng ghi âm' khi xong. Nghe lại bản thu; muốn thu lại thì bấm 'Thu lại'.",
        "Bấm 'Nộp bài nói'. Hệ thống AI sẽ chấm tự động và ghi vào lịch sử.",
      ],
      tips: [
        "Lần đầu, trình duyệt sẽ hỏi quyền micro — chọn 'Cho phép'.",
        "Nói ở nơi yên tĩnh, gần micro để AI nghe rõ.",
        "Trạng thái 'Chờ AI chấm' nghĩa là bài đã nộp, đang đợi chấm — xem điểm sau ở 'Xem tiến bộ'.",
      ],
    },
    {
      id: "placement",
      title: "Bài xếp lớp (đầu vào)",
      icon: "🎯",
      steps: [
        "Trang chủ → khu xếp lớp → chọn bộ đề theo chủ đề.",
        "Làm lần lượt các phần (Đọc/Nghe/Use of English tự chấm; Viết/Nói do giáo viên/AI chấm).",
        "Sau mỗi phần, hệ thống hiện trình độ ước lượng (CEFR).",
      ],
      tips: ["Nên làm đủ các phần trong bộ để giáo viên có bảng tổng hợp trước khi xếp lớp."],
    },
    {
      id: "exam-room",
      title: "Vào phòng thi bằng mã",
      icon: "🏫",
      steps: [
        "Trang chủ → 'Vào phòng thi' → nhập mã thi giáo viên cấp.",
        "Kiểm tra tên buổi thi, bấm 'Bắt đầu thi'.",
        "Làm bài theo quy định buổi thi rồi nộp.",
      ],
      tips: ["Buổi thi thường siết chống gian lận: tự dừng khi vượt số lần vi phạm cho phép."],
    },
    {
      id: "progress",
      title: "Xem tiến bộ & điểm",
      icon: "📈",
      steps: [
        "Trang chủ → 'Xem tiến bộ'.",
        "Nhập mã/tên/email để tra lịch sử bài làm và điểm.",
        "Bấm vào một bài để xem chi tiết: điểm từng tiêu chí, nhận xét, transcript (bài Nói).",
        "Có thể In / Tải PDF bảng kết quả.",
      ],
    },
    {
      id: "anti-cheat",
      title: "Lưu ý chống gian lận",
      icon: "⚠️",
      steps: [
        "Bài thi chạy ở chế độ toàn màn hình.",
        "Rời tab, thoát toàn màn hình, copy/paste đều bị ghi nhận là vi phạm.",
        "Vượt ngưỡng vi phạm, hệ thống tự dừng và nộp bài.",
      ],
      tips: ["Tắt thông báo, đóng các tab khác trước khi bắt đầu để tránh vô tình vi phạm."],
    },
  ],
};

// ------------------------- GIÁO VIÊN (CPANEL) -------------------------
export const TEACHER_GUIDE: HelpGuide = {
  audience: "teacher",
  title: "Hướng dẫn cho giáo viên",
  intro: "Trợ lý cho trang quản trị. Chọn mục để xem các bước.",
  topics: [
    {
      id: "roles",
      title: "Đăng nhập & phân quyền",
      icon: "👥",
      steps: [
        "Đăng nhập tại /admin/login bằng tài khoản giáo viên.",
        "Vai trò: owner/admin (toàn quyền), teacher (lớp + chấm), grader (chỉ chấm), content_editor (chỉ soạn đề).",
        "Admin tạo/khóa tài khoản và gán vai trò ở mục 'Giáo viên'.",
      ],
      tips: ["Menu bên trái chỉ hiện mục mà vai trò của bạn được phép."],
    },
    {
      id: "author-basics",
      title: "Soạn chủ đề & đề (chung)",
      icon: "🗂",
      steps: [
        "Vào tab kỹ năng tương ứng (Đề Viết/Đọc/Nghe/Nói) trong 'Soạn đề'.",
        "Tạo Chủ đề (nhóm chứa các đề A/B/C).",
        "Trong chủ đề, tạo Đề rồi bấm vào để mở Trình soạn đề.",
        "Bật 'Mở cho học sinh (active)' khi đề đã sẵn sàng.",
      ],
      tips: ["Xem 'Checklist trước khi mở' trong trình soạn đề để biết còn thiếu gì."],
    },
    {
      id: "author-reading-listening",
      title: "Soạn đề Đọc / Nghe (trắc nghiệm)",
      icon: "📚",
      steps: [
        "Thêm Tư liệu: đoạn đọc (dán nội dung) hoặc Audio (tải MP3 / dán link).",
        "Thêm Câu hỏi: chọn loại (1 đáp án / nhiều đáp án / True-False-NG / điền từ).",
        "Nhập nội dung, các lựa chọn và đánh dấu đáp án đúng; gắn câu hỏi với tư liệu nếu cần.",
        "Lưu. Đề Đọc/Nghe tự chấm khi học sinh nộp.",
      ],
    },
    {
      id: "author-writing",
      title: "Soạn đề Viết",
      icon: "✍️",
      steps: [
        "Trong trình soạn đề, nhập ô 'Đề bài (prompt)' — học sinh sẽ thấy.",
        "Đặt số từ tối thiểu và thời gian.",
        "Không cần câu hỏi trắc nghiệm. Bài Viết chấm tay.",
      ],
    },
    {
      id: "author-speaking",
      title: "Soạn đề Nói (Speaking)",
      icon: "🎙",
      steps: [
        "Vào tab 'Đề Nói', tạo chủ đề và đề như bình thường.",
        "Trong trình soạn đề, nhập ô 'Câu hỏi Speaking' — đây là câu học sinh sẽ trả lời.",
        "(Tùy chọn) Ở mục 'Audio câu hỏi', thêm 1 Audio (tải MP3/dán link) để học sinh bấm loa nghe đề.",
        "Bật active. Học sinh vào mục Speaking ở trang chủ để ghi âm trả lời.",
      ],
      tips: [
        "Đề Nói không cần câu hỏi trắc nghiệm.",
        "ĐỪNG giao Speaking qua 'Buổi thi/Mã thi' — luồng buổi thi chưa hỗ trợ ghi âm; hãy để học sinh vào qua mục Speaking ở trang chủ.",
      ],
    },
    {
      id: "speaking-ai",
      title: "Kết quả Speaking (AI chấm)",
      icon: "🤖",
      steps: [
        "Học sinh nộp bài Nói → trạng thái 'Chờ AI chấm' (pending_ai).",
        "Bot chấm tự động: transcribe + 4 tiêu chí IELTS (FC/LR/GRA/Pronunciation).",
        "Vào 'Hàng đợi chấm', mở bài Speaking để nghe lại audio, xem transcript, điểm và nhận xét.",
      ],
      tips: ["Nếu bài kẹt ở 'Chờ AI chấm' lâu, kiểm tra bot hạ tầng đã bật chấm chưa."],
    },
    {
      id: "import",
      title: "Nhập đề từ Excel",
      icon: "📥",
      steps: [
        "Vào 'Nhập từ Excel'.",
        "Tải mẫu, điền nội dung theo cột hướng dẫn.",
        "Tải file lên để tạo hàng loạt câu hỏi/đề.",
      ],
    },
    {
      id: "sessions",
      title: "Tạo buổi thi & mã thi",
      icon: "🏫",
      steps: [
        "Vào 'Buổi thi & Mã thi' (chỉ admin).",
        "Tạo buổi thi: chọn đề, đặt mã thi, thời gian mở/đóng, giới hạn vi phạm, lớp áp dụng.",
        "Gửi mã cho học sinh. Học sinh vào 'Vào phòng thi' nhập mã để làm.",
      ],
      tips: ["Buổi thi hiện hỗ trợ Đọc/Nghe/Viết. Speaking giao qua mục Speaking ở trang chủ."],
    },
    {
      id: "grade-writing",
      title: "Chấm bài Viết",
      icon: "📝",
      steps: [
        "Vào 'Hàng đợi chấm', lọc theo trạng thái nếu cần.",
        "Mở một bài: đọc đề + bài viết của học sinh.",
        "Bôi chọn câu sai để thêm 'sửa câu chi tiết' (hiện ở trang tiến bộ của học sinh).",
        "Nhập điểm 4 tiêu chí (TR/CC/LR/GRA) — hệ thống tự tính band + CEFR.",
        "Viết nhận xét rồi bấm 'Lưu điểm & chấm xong'.",
      ],
    },
    {
      id: "placement-results",
      title: "Kết quả xếp lớp",
      icon: "🎯",
      steps: [
        "Vào 'Kết quả xếp lớp'.",
        "Xem bảng tổng hợp đa kỹ năng của từng học sinh (CEFR từng phần).",
        "Dựa vào đó quyết định lớp phù hợp.",
      ],
    },
    {
      id: "roster",
      title: "Lớp & Học viên",
      icon: "🧑‍🎓",
      steps: [
        "Vào 'Lớp & Học viên' (admin).",
        "Tạo lớp, thêm học viên (cấp mã), gán giáo viên phụ trách lớp.",
        "Mã học viên là thứ học sinh dùng để đăng nhập.",
      ],
    },
    {
      id: "diagnostics",
      title: "Chẩn đoán hệ thống",
      icon: "🩺",
      steps: [
        "Vào 'Chẩn đoán' để kiểm tra kết nối, dữ liệu và cấu hình.",
        "Dùng khi nghi ngờ lỗi hiển thị/kết nối trước khi báo kỹ thuật.",
      ],
    },
  ],
};
