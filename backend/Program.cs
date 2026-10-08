using System;
using System.IO;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using ProductionDashboard.Api.Data;
using ProductionDashboard.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Database
builder.Services.AddDbContext<AppDbContext>(options =>
{
    string dbPath = Path.Combine(AppContext.BaseDirectory, "production_dashboard.db");
    options.UseSqlite($"Data Source={dbPath}");
});

// 2. Services
builder.Services.AddScoped<ExcelParserService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddSingleton<AuthService>();

// 3. Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// 4. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// 5. Seed Database on startup
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var parser = scope.ServiceProvider.GetRequiredService<ExcelParserService>();
    string workspaceRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, ".."));
    try
    {
        DataSeeder.Initialize(context, parser, workspaceRoot);
        Console.WriteLine("[INFO] Database initialized and seeded successfully.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[ERROR] Data seeding exception: {ex.Message}");
    }
}

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.MapGet("/", () => Results.Content(
    @"<!DOCTYPE html>
    <html lang='vi'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Backend MES & Production BI API</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #080c14; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
            .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 2.2rem; max-width: 520px; width: 100%; text-align: center; box-shadow: 0 10px 35px rgba(0,0,0,0.6); }
            .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.35); padding: 5px 14px; border-radius: 999px; font-size: 0.82rem; font-weight: 700; margin-bottom: 1.2rem; }
            .dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; }
            h1 { margin: 0 0 0.6rem 0; font-size: 1.45rem; color: #38bdf8; font-weight: 800; }
            p { color: #94a3b8; font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.6rem; }
            .btn { display: inline-block; background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff; text-decoration: none; padding: 0.75rem 1.6rem; border-radius: 8px; font-weight: 700; font-size: 0.95rem; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.35); }
            .btn:hover { opacity: 0.92; }
            .note { margin-top: 1.4rem; font-size: 0.78rem; color: #64748b; }
        </style>
    </head>
    <body>
        <div class='card'>
            <div class='badge'><span class='dot'></span> BACKEND .NET 10 ĐANG HOẠT ĐỘNG TỐT (CỔNG 5251)</div>
            <h1>Hệ thống MES & BI Quản Lý Sản Xuất</h1>
            <p>Máy chủ API Backend ASP.NET Core đang chạy ổn định và sẵn sàng phục vụ dữ liệu.<br>Để sử dụng toàn bộ giao diện Dashboard trực quan, vui lòng truy cập:</p>
            <a class='btn' href='http://localhost:5173/'>Mở Giao Diện Dashboard (Port 5173)</a>
            <div class='note'>API Endpoint: <code>/api/dashboard/summary</code> | Database: SQLite EF Core</div>
        </div>
    </body>
    </html>", "text/html"));

app.Run();
