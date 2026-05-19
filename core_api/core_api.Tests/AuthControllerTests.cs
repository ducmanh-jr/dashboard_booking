using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Moq;
using Nowayhome.CoreApi.Controllers;
using Nowayhome.CoreApi.Models.DTOs;
using Nowayhome.CoreApi.Models.Entities;
using Nowayhome.CoreApi.Services.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;

namespace Nowayhome.CoreApi.Tests;

public class AuthControllerTests
{
    [Fact]
    public async Task Register_ShouldReturnCreatedAtAction()
    {
        // Arrange
        var mockUserService = new Mock<IUserService>();
        var mockConfig = new Mock<IConfiguration>();

        var userDto = new RegisterRequestDto
        {
            Username = "newuser",
            Email = "newuser@example.com",
            Password = "SecurePassword",
            Role = "Customer"
        };

        var createdUser = new User
        {
            Id = 42,
            Username = userDto.Username,
            Email = userDto.Email,
            PasswordHash = "somehashedvalue",
            Role = userDto.Role
        };

        mockUserService.Setup(s => s.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(createdUser);

        var controller = new AuthController(mockUserService.Object, mockConfig.Object);

        // Act
        var result = await controller.Register(userDto);

        // Assert
        var createdResult = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal("Register", createdResult.ActionName);
        Assert.NotNull(createdResult.Value);
    }
}
