# TÀI LIỆU HỆ THỐNG DASHBOARD QUẢN LÝ SẢN XUẤT (BI / MES)
**Dự án:** Production BI & MES Management Dashboard - Nhà máy Thiết bị D6  
**Công nghệ:** ASP.NET Core Web API (.NET 10) + EF Core + React 18 + TypeScript + Vite + Chart.js  
**Ngày cập nhật:** 08/10/2026  

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG (ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Separation of Concerns (SoC)** chuẩn công nghiệp:
- **Database Layer**: SQLite / EF Core lưu trữ dữ liệu sản xuất thực tế, chuẩn hóa từ các tệp Excel `Bao_Cao_Tong_Hop_San_Luong_Nhan_Luc_NG (1).xlsx` và `KIỂM KÊ D6(1111).xlsx`.
- **Backend API Layer (ASP.NET Core Web API - Port 5251)**:
  - `ExcelParserService`: Đọc tệp `.xlsx` bằng ClosedXML, nhận diện công thức, chuẩn hóa dữ liệu thành các nhóm thực thể (`ProductionRecord`, `ManpowerRecord`, `QualityRecord`, `DowntimeRecord`, `InventoryAuditRecord`).
  - `DashboardService`: Xử lý bộ lọc, tính toán KPI, tỷ lệ hoàn thành, UPH, hiệu suất, tổng hợp Pareto lỗi chất lượng, ma trận bản đồ nhiệt (Defect Heatmap), phân tích dừng máy, trích xuất bằng chứng (Evidence) cho 4D/8D.
  - `AuthService`: Quản lý xác thực JWT và phân quyền (RBAC).
- **Frontend Layer (React 18 + TypeScript + Vite - Port 5173)**:
  - Giao diện chuẩn **Modern Industrial Manufacturing BI / MES Dashboard**.
  - Hỗ trợ Dark Mode / Light Mode bằng CSS Design Tokens.
  - Đa ngôn ngữ (Tiếng Việt, Tiếng Trung 中文, Tiếng Anh English).
  - Tích hợp Chart Type Switcher, Drill-down đa tầng, bộ lọc đồng bộ toàn diện, module 4D/8D Problem Solving và xuất báo cáo đa định dạng (PDF, Excel, CSV, In trực tiếp).

---

## 2. ÁNH XẠ DỮ LIỆU & API MAPPING

### Danh sách API Endpoints

| STT | Phương thức | Đường dẫn API | Mô tả |
|---|---|---|---|
| 1 | `POST` | `/api/dashboard/summary` | Lấy dữ liệu tổng hợp toàn diện (KPI, xu hướng, phân tích sản phẩm, Pareto lỗi, Heatmap, Dừng máy, UPH, Ma trận). |
| 2 | `GET` | `/api/dashboard/drilldown` | Lấy dữ liệu chuyên sâu khi drill-down theo Sản phẩm (`product`), Loại lỗi (`defect`), hoặc Ngày (`date`). |
| 3 | `GET` | `/api/dashboard/inventory-audit` | Lấy dữ liệu đối soát tồn kho nguyên vật liệu từ tệp `KIỂM KÊ D6` theo 4 công đoạn (SPK/MIC, Đai đầu, Lắp ráp, Đóng gói). |
| 4 | `POST` | `/api/production/upload-excel` | Nhập tệp Excel sản xuất hoặc kiểm kê mới qua giao diện kéo thả, tự động phân tích và lưu trữ. |
| 5 | `GET` | `/api/production/export-excel` | Xuất file Excel (`.xlsx`) chứa dữ liệu sản xuất đã lọc theo bộ lọc hiện tại. |
| 6 | `GET` | `/api/production/export-csv` | Xuất dữ liệu sản xuất ra file CSV tương thích UTF-8. |
| 7 | `GET` | `/api/problem-solving/reports` | Danh sách các báo cáo giải quyết sự cố 4D/8D. |
| 8 | `GET` | `/api/problem-solving/reports/{id}` | Lấy chi tiết báo cáo 4D/8D theo mã ID. |
| 9 | `POST` | `/api/problem-solving/reports` | Lưu (Tạo mới hoặc Cập nhật) báo cáo 4D/8D. |
| 10 | `DELETE` | `/api/problem-solving/reports/{id}` | Xóa báo cáo sự cố 4D/8D. |
| 11 | `GET` | `/api/problem-solving/generate-evidence`| Trích xuất số liệu thực tế từ Dashboard làm bằng chứng (Evidence) cho báo cáo 4D/8D. |
| 12 | `GET` | `/api/customization/layout` | Lấy cấu hình bố cục widget, theme, ngôn ngữ, ngưỡng thiếu nhân lực. |
| 13 | `POST` | `/api/customization/layout` | Lưu cấu hình bố cục widget của người dùng. |
| 14 | `POST` | `/api/auth/login` | Xác thực đăng nhập và cấp mã JWT token. |

---

## 3. CÔNG THỨC TÍNH TOÁN CÁC CHỈ SỐ KPI (KPI FORMULAS)

Các công thức được giữ nguyên bản và nhận diện tự động từ tệp gốc:

1. **Thiếu nhân lực (Missing Manpower)**:
   $$\text{Thiếu} = \max(0, \text{Nhân lực (Kế hoạch)} - \text{Đi làm (Thực tế)})$$
   $$\text{Tỷ lệ thiếu (\%)} = \frac{\text{Thiếu}}{\text{Nhân lực (Kế hoạch)}} \times 100\%$$

2. **Tỷ lệ hoàn thành kế hoạch (\% Đạt / Achievement Rate)**:
   $$\% \text{Đạt} = \begin{cases} 0 & \text{nếu Kế hoạch} = 0 \\ \frac{\text{Thực tế}}{\text{Kế hoạch}} \times 100\% & \text{nếu Kế hoạch} > 0 \end{cases}$$

3. **Chênh lệch sản lượng (Production Gap)**:
   $$\text{Gap} = \text{Thực tế} - \text{Kế hoạch}$$

4. **Hiệu suất sản xuất (HIỆU XUẤT / Efficiency)**:
   $$\text{Hiệu suất (\%)} = \frac{\text{Thực tế} \times \text{TCGC (Chu kỳ chuẩn tính bằng giây)}}{3600 \times \text{Giờ Công}} \times 100\%$$

5. **Năng suất theo giờ (UPH - Units Per Hour)**:
   $$\text{UPH} = \begin{cases} 0 & \text{nếu Giờ Công} = 0 \\ \frac{\text{Thực tế}}{\text{Giờ Công}} & \text{nếu Giờ Công} > 0 \end{cases}$$

6. **Tổng phế phẩm (NG Tổng)**:
   $$\text{NG Tổng} = \sum_{i=1}^{11} \text{Defect}_i$$
   *(Gồm 11 loại lỗi: Công năng, Âm thanh, Xước, Mẻ, Dây, PCBA, THD, Lỏm loa, Hở nắp, Nomali, Đứt dây)*

7. **Tỷ lệ phế phẩm (Tỷ lệ NG / NG Rate)**:
   $$\text{Tỷ lệ NG (\%)} = \begin{cases} 0 & \text{nếu Thực tế} = 0 \\ \frac{\text{NG Tổng}}{\text{Thực tế}} \times 100\% & \text{nếu Thực tế} > 0 \end{cases}$$

---

## 4. BẢN ĐỒ BIỂU ĐỒ & CHỨC NĂNG CHUYỂN ĐỔI (CHART MAPPING & SWITCHER)

| Tên Widget | Biểu đồ mặc định | Tùy chọn chuyển đổi (Switcher) | Chức năng tương tác |
|---|---|---|---|
| **Plan vs Actual** | Combo Bar + Line | • Combo Bar + Line<br>• Cột nhóm (Grouped Bar)<br>• Cột chồng (Stacked Bar) | Chuyển đổi Daily / Weekly; Tooltip hiển thị Kế hoạch, Thực tế, Gap, % Đạt; Nhấn vào cột để drill-down theo ngày. |
| **Production by Product** | Horizontal Bar | • Cột ngang (Horizontal Bar)<br>• Cột đứng (Column)<br>• Đường (Line)<br>• Cột chồng (Stacked Bar) | Hiển thị sản lượng theo 6 sản phẩm (喇叭, 麦克风, 控制盒, 头戴, 组装, 包装); Nhấn vào sản phẩm để mở Drill-down. |
| **Performance Trend** | Area Chart | • Vùng (Area)<br>• Đường (Line)<br>• Cột (Bar) | Cho phép chọn Metric: Hiệu suất (%), UPH, hoặc Giờ công (Hours). |
| **Manpower Analysis** | Stacked Bar | • Cột chồng (Stacked)<br>• Cột nhóm (Grouped) | Cảnh báo vi phạm ngưỡng (Threshold Warning Banner) khi tỷ lệ thiếu vượt mức cài đặt. |
| **Quality Pareto** | True Pareto (Bar + Cumulative Line) | • Top 5 lỗi chính<br>• Top 10 lỗi<br>• Tất cả 11 loại lỗi | Trục trái: Số lượng NG; Trục phải: Tỷ lệ tích lũy (0-100%); Nhấn vào thanh lỗi để drill-down. |
| **Defect Heatmap** | 2D Matrix Grid (Product x Defect) | Màu sắc theo cường độ lỗi (Threshold intensity) | Nhấp chuột vào bất kỳ ô nào (vd: `喇叭 x XƯỚC`) để xem chi tiết và tạo báo cáo 8D ngay lập tức. |
| **Downtime Analysis** | Horizontal Pareto by Reason | • Theo Nguyên nhân (Pareto)<br>• Theo Ngày (Daily Trend) | Thống kê Tổng thời gian dừng, Thời gian dừng trung bình, Vụ dừng dài nhất, Nguyên nhân chính. |
| **UPH Dashboard** | Bar Chart (Actual vs Target) | • Theo Sản phẩm<br>• Xu hướng theo ngày (Trend) | Hiển thị UPH trung bình, UPH cao nhất, UPH thấp nhất. |
| **Performance Matrix** | Data Grid | Phân trang, Tìm kiếm, Sắp xếp cột | Conditional formatting: Cảnh báo đỏ khi NG Rate > 2.5%, Cảnh báo vàng khi % Đạt < 95%, Nút xuất Excel/CSV riêng. |

---

## 5. MA TRẬN PHÂN QUYỀN (PERMISSIONS & SECURITY)

Hệ thống hỗ trợ phân quyền người dùng (Role-Based Access Control):

| Role | Tên vai trò | Quyền hạn (Permissions) |
|---|---|---|
| `Admin` | Quản trị hệ thống | Toàn quyền: `dashboard.view`, `dashboard.production`, `dashboard.quality`, `dashboard.downtime`, `dashboard.reports`, `problem-solving.view`, `problem-solving.create`, `problem-solving.edit`, `problem-solving.export` |
| `ProductionManager` | Quản đốc sản xuất | `dashboard.view`, `dashboard.production`, `dashboard.quality`, `dashboard.downtime`, `dashboard.reports`, `problem-solving.view`, `problem-solving.create`, `problem-solving.edit`, `problem-solving.export` |
| `QAEngineer` | Kỹ sư chất lượng | `dashboard.view`, `dashboard.quality`, `problem-solving.view`, `problem-solving.create`, `problem-solving.edit`, `problem-solving.export` |
| `Operator` | Trưởng chuyền / Công nhân | `dashboard.view`, `dashboard.production` |

---

## 6. QUY TRÌNH XỬ LÝ SỰ CỐ 4D & 8D (PROBLEM SOLVING WORKFLOW)

### Chế độ 4D (Quick-Response)
- **D1/D2 - Problem Statement**: Tự động nạp dữ liệu thực tế từ Dashboard (Sản lượng, Số lỗi, Tỷ lệ lỗi %, Chủng loại lỗi chính, Thời gian dừng máy liên quan).
- **D3 - Containment Action**: Ghi nhận hành động cô lập hàng lỗi tức thời, phân công người chịu trách nhiệm và thời hạn hoàn thành.
- **D4 - Root Cause & Corrective Action**: Xác định nguyên nhân gốc rễ và hành động khắc phục phòng ngừa.

### Chế độ 8D (Standard Discipline)
- **D1 - Team Assignment**: Thiết lập nhóm chuyên trách (Champion, Leader, Members).
- **D2 - Problem Description**: Mô tả sự cố kèm bằng chứng định lượng tự động từ Dashboard.
- **D3 - Containment Action (ICA)**: Hành động ngăn chặn tạm thời.
- **D4 - Root Cause Analysis (5 Whys)**: Phân tích 5 Tại sao và xác định nguyên nhân cốt lõi.
- **D5 - Permanent Corrective Action (PCA)**: Biện pháp khắc phục vĩnh viễn.
- **D6 - Implementation & Validation**: Thử nghiệm và thẩm định hiệu quả (dữ liệu Cpk, tỷ lệ lỗi sau cải tiến).
- **D7 - Prevent Recurrence**: Chuẩn hóa tài liệu SOP, đào tạo nhân sự, kiểm soát quá trình.
- **D8 - Closure & Team Recognition**: Đóng báo cáo, phê duyệt của ban giám đốc và khen thưởng đội ngũ.

*Hỗ trợ:* Tạo mới, Lưu trữ, Xóa, In báo cáo trực tiếp, Xuất báo cáo ra định dạng Excel `.xlsx` chuyên nghiệp.

---

## 7. QUẢN LÝ XUẤT BÁO CÁO (EXPORT)

- **Xuất Excel (.xlsx)**: Sử dụng ClosedXML tại backend để xuất tệp Excel với đầy đủ định dạng tiêu đề, màu sắc nhận diện công nghiệp, số liệu đã tính toán theo bộ lọc ngày/sản phẩm/ca làm việc.
- **Xuất CSV**: Tạo tệp CSV chuẩn UTF-8 kèm BOM để tương thích tốt với mọi phiên bản Excel mà không bị lỗi font tiếng Việt hoặc tiếng Trung.
- **In / Xuất PDF**: CSS print layout tối ưu tự động ẩn các thanh công cụ điều hướng, giữ nguyên tính trực quan của thẻ chỉ số và bảng dữ liệu.

---

## 8. TỐI ƯU HÓA TRÊN MOBILE & TABLET (RESPONSIVE OPTIMIZATION)

Hệ thống đã được tối ưu hóa toàn diện để tương thích mượt mà trên mọi thiết bị:
- **Mobile (< 768px)**:
  - **KPI Cards**: Tự động chuyển thành dạng lưới 2 cột (trên màn hình nhỏ hơn 480px thành 1 cột thẻ gọn), giảm font size vừa vặn với màn hình điện thoại.
  - **Biểu đồ**: Các khối biểu đồ chuyển thành độ rộng 100% (full-width), chiều cao tự co giãn về mức 300px - 320px để xem trọn vẹn không cần zoom.
  - **Thanh Header & Bộ lọc**:
    - Dải nút bấm bộ lọc ngày (Hôm nay, 7 ngày, Tuần này, Tháng này...) hỗ trợ vuốt ngang cảm ứng mượt mà (`-webkit-overflow-scrolling: touch;`).
    - Các menu tác vụ và nút chức năng tự động sắp xếp gọn gàng.
  - **Bảng dữ liệu & Defect Heatmap**: Tích hợp cuộn ngang mượt mà (`.mes-table-wrapper`), giữ nguyên định dạng số và nhãn mà không bị vỡ cột.
  - **Cửa sổ 4D / 8D Problem Solving**: Trên mobile tự động xếp chồng theo chiều dọc (Sidebar chọn báo cáo nằm trên, form biên tập D1-D8 chiếm trọn 100% chiều rộng bên dưới), kích thước nút bấm tối thiểu 44px đạt chuẩn thân thiện với ngón tay cảm ứng (Touch-friendly).

---

## 9. HƯỚNG DẪN KHỞI CHẠY (QUICK START GUIDE)

### Khởi chạy Backend (.NET 10 Web API):
```bash
cd /Users/chaudamvan/baocao/backend
dotnet run
# API lắng nghe tại: http://localhost:5251
```

### Khởi chạy Frontend (React + Vite):
```bash
cd /Users/chaudamvan/baocao/frontend
npm run dev
# Dashboard mở tại: http://localhost:5173
```
