// Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using Nowayhome.CoreApi.Models.Entities;
using System;

namespace Nowayhome.CoreApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Partner> Partners => Set<Partner>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<Booking> Bookings => Set<Booking>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Map User entity to 'users' table
        modelBuilder.Entity<User>(u =>
        {
            u.ToTable("users");
            u.Property(x => x.Id).HasColumnName("id");
            u.Property(x => x.Uuid).HasColumnName("uuid");
            u.Property(x => x.Username).HasColumnName("full_name");
            u.Property(x => x.Email).HasColumnName("email");
            u.Property(x => x.PasswordHash).HasColumnName("password_hash");
            
            // Map user_type enum to Role string, with safe defaults
            u.Property(x => x.Role).HasColumnName("user_type")
             .HasConversion(
                 v => string.IsNullOrWhiteSpace(v) ? "customer" : (v.ToLower() == "admin" ? "staff" : v.ToLower()),
                 v => string.IsNullOrWhiteSpace(v) ? "Customer" : (v == "staff" ? "Admin" : (v == "partner" ? "Partner" : "Customer"))
             );
        });

        // Map Partner entity to 'partner_profiles' table
        modelBuilder.Entity<Partner>(p =>
        {
            p.ToTable("partner_profiles");
            p.Property(x => x.Id).HasColumnName("id");
            p.Property(x => x.Name).HasColumnName("business_name");
        });

        // Map Room entity to 'properties' table
        modelBuilder.Entity<Room>(r =>
        {
            r.ToTable("properties");
            r.Property(x => x.Id).HasColumnName("id");
            r.Property(x => x.Name).HasColumnName("name");
            r.Property(x => x.PartnerId).HasColumnName("partner_id");
            r.Ignore(x => x.Capacity);
        });

        // Map Booking entity to 'bookings' table
        modelBuilder.Entity<Booking>(b =>
        {
            b.ToTable("bookings");
            b.Property(x => x.Id).HasColumnName("id");
            b.Property(x => x.UserId).HasColumnName("customer_id");
            b.Property(x => x.RoomId).HasColumnName("property_id");
            b.Property(x => x.StartDate).HasColumnName("check_in_date");
            b.Property(x => x.EndDate).HasColumnName("check_out_date");
            
            // Keep API-facing status names stable while PostgreSQL stores enum text.
            b.Property(x => x.Status).HasColumnName("status")
             .HasConversion(
                 v => string.IsNullOrWhiteSpace(v) ? "pending" : v.ToLower(),
                 v => string.IsNullOrWhiteSpace(v) ? "Pending" : char.ToUpper(v[0]) + v.Substring(1)
             );
        });

        // Configure relationships using the mapped foreign keys
        modelBuilder.Entity<Booking>(b =>
        {
            b.HasOne(bk => bk.User)
              .WithMany(u => u.Bookings)
              .HasForeignKey(bk => bk.UserId);
            b.HasOne(bk => bk.Room)
              .WithMany(r => r.Bookings)
              .HasForeignKey(bk => bk.RoomId);
        });

        modelBuilder.Entity<Room>(r =>
        {
            r.HasOne(rm => rm.Partner)
              .WithMany(p => p.Rooms)
              .HasForeignKey(rm => rm.PartnerId);
        });
    }
}
