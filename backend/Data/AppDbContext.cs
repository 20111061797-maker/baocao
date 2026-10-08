using Microsoft.EntityFrameworkCore;
using ProductionDashboard.Api.Models;

namespace ProductionDashboard.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<ProductionRecord> ProductionRecords { get; set; } = null!;
        public DbSet<ManpowerRecord> ManpowerRecords { get; set; } = null!;
        public DbSet<QualityRecord> QualityRecords { get; set; } = null!;
        public DbSet<DowntimeRecord> DowntimeRecords { get; set; } = null!;
        public DbSet<InventoryAuditRecord> InventoryAuditRecords { get; set; } = null!;
        public DbSet<EightDReport> EightDReports { get; set; } = null!;
        public DbSet<UserLayoutConfig> UserLayoutConfigs { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ProductionRecord>()
                .HasIndex(p => new { p.Date, p.ProductCode });

            modelBuilder.Entity<QualityRecord>()
                .HasIndex(q => new { q.Date, q.ProductCode });

            modelBuilder.Entity<ManpowerRecord>()
                .HasIndex(m => new { m.Date, m.ProductCode });

            modelBuilder.Entity<DowntimeRecord>()
                .HasIndex(d => new { d.Date, d.ProductCode });
        }
    }
}
