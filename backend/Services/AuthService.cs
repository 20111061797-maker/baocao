using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ProductionDashboard.Api.Models;

namespace ProductionDashboard.Api.Services
{
    public class AuthService
    {
        public static readonly string JwtSecret = "EnterpriseManufacturingProductionDashboardSecretKey2026!";

        private static readonly List<UserAccount> Users = new()
        {
            new UserAccount
            {
                Username = "admin",
                Password = "123",
                FullName = "System Administrator",
                Role = "Admin",
                Permissions = new List<string>
                {
                    "dashboard.view", "dashboard.production", "dashboard.quality",
                    "dashboard.downtime", "dashboard.reports",
                    "problem-solving.view", "problem-solving.create",
                    "problem-solving.edit", "problem-solving.export"
                }
            },
            new UserAccount
            {
                Username = "manager",
                Password = "123",
                FullName = "Quản đốc Sản xuất / Production Manager",
                Role = "ProductionManager",
                Permissions = new List<string>
                {
                    "dashboard.view", "dashboard.production", "dashboard.quality",
                    "dashboard.downtime", "dashboard.reports",
                    "problem-solving.view", "problem-solving.create", "problem-solving.edit", "problem-solving.export"
                }
            },
            new UserAccount
            {
                Username = "qa",
                Password = "123",
                FullName = "Kỹ sư Chất lượng / QA Engineer",
                Role = "QAEngineer",
                Permissions = new List<string>
                {
                    "dashboard.view", "dashboard.quality",
                    "problem-solving.view", "problem-solving.create", "problem-solving.edit", "problem-solving.export"
                }
            },
            new UserAccount
            {
                Username = "operator",
                Password = "123",
                FullName = "Trưởng chuyền / Line Leader",
                Role = "Operator",
                Permissions = new List<string>
                {
                    "dashboard.view", "dashboard.production"
                }
            }
        };

        public LoginResponse? Authenticate(string username, string password)
        {
            var user = Users.Find(u => u.Username.Equals(username, StringComparison.OrdinalIgnoreCase) && u.Password == password);
            if (user == null) return null;

            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(JwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, user.Username),
                    new Claim(ClaimTypes.Role, user.Role),
                    new Claim("FullName", user.FullName)
                }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return new LoginResponse
            {
                Token = tokenHandler.WriteToken(token),
                Username = user.Username,
                FullName = user.FullName,
                Role = user.Role,
                Permissions = user.Permissions
            };
        }
    }
}
