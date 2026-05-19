using Microsoft.EntityFrameworkCore;
using Nowayhome.CoreApi.Data;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services;
using System.Threading.Tasks;
using Xunit;

namespace Nowayhome.CoreApi.Tests;

public class UserServiceTests
{
    private AppDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: System.Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_ShouldHashPasswordAndSaveUser()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var service = new UserService(context);
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "PlainPassword123",
            Role = "Customer"
        };

        // Act
        var result = await service.CreateAsync(user);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Id > 0);
        Assert.NotEqual("PlainPassword123", result.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("PlainPassword123", result.PasswordHash));
        
        var savedUser = await context.Users.FindAsync(result.Id);
        Assert.NotNull(savedUser);
        Assert.Equal("testuser", savedUser.Username);
    }

    [Fact]
    public async Task GetByIdAsync_ShouldReturnCorrectUser()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var user = new User { Username = "alice", Email = "alice@example.com", PasswordHash = "hash" };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = new UserService(context);

        // Act
        var result = await service.GetByIdAsync(user.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("alice", result.Username);
    }

    [Fact]
    public async Task DeleteAsync_ShouldRemoveUser()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        var user = new User { Username = "bob", Email = "bob@example.com", PasswordHash = "hash" };
        context.Users.Add(user);
        await context.SaveChangesAsync();

        var service = new UserService(context);

        // Act
        var isDeleted = await service.DeleteAsync(user.Id);

        // Assert
        Assert.True(isDeleted);
        var result = await context.Users.FindAsync(user.Id);
        Assert.Null(result);
    }
}
