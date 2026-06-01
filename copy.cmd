@echo off
title Git Sync Automation (Safe .git)
chcp 65001 > nul
cls

echo [1/3] ▷ ĐANG XÓA VÀ ĐỒNG BỘ FILE TỪ NGUỒN SANG ĐÍCH...
echo ──────────────────────────────────────────────────────────
:: /MIR: Phản chiếu nguồn sang đích
:: /XD .git bin obj node_modules: Chặn robocopy đụng vào các thư mục này (giữ nguyên .git ở đích)
:: /XF copy.cmd copy.bat: Chặn robocopy xóa file script ở đích
for /f "tokens=*" %%i in ('robocopy "C:\Users\Admin\ducmanhjr\github\NoWayHomee\NoWayHomee" "C:\Users\Admin\ducmanhjr\github\ducmanh-jrdashboard_booking" /MIR /XD .git bin obj node_modules /XF copy.cmd copy.bat /NDL /NFL /NJH /NJS') do (
    echo     [+] %%i
)

echo.
echo [2/3] ▷ KIỂM TRA CÁC FILE ĐÃ THAY ĐỔI TRONG GIT...
echo ──────────────────────────────────────────────────────────
:: Di chuyển vào thư mục đích để làm việc với Git của đích
cd /d "C:\Users\Admin\ducmanhjr\github\ducmanh-jrdashboard_booking"

:: Hiển thị danh sách file thay đổi một cách ngắn gọn
git status -s

echo.
echo [3/3] ▷ ĐANG TIẾN HÀNH COMMIT VÀ PUSH LÊN NHÁNH MAIN...
echo ──────────────────────────────────────────────────────────
:: Kiểm tra xem thư mục hiện tại có thực sự là một Git repo không trước khi push
if exist .git (
    git add .
    git commit -m "Auto sync from NoWayHomee at %DATE% %TIME:~0,8%"
    git push origin main
) else (
    echo [XỬ LỖI] Không tìm thấy thư mục .git hợp lệ ở thư mục đích!
)

echo.
echo ──────────────────────────────────────────────────────────
echo [✓] TẤT CẢ TIẾN TRÌNH ĐÃ HOÀN TẤT LÚC %TIME:~0,8%!
timeout /t 5