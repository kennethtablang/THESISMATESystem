using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddSystemFeatureStudentTest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "StudentScreenshotPath",
                table: "SystemFeatures",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StudentTestNote",
                table: "SystemFeatures",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StudentTestStatus",
                table: "SystemFeatures",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "StudentTestedAt",
                table: "SystemFeatures",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StudentScreenshotPath",
                table: "SystemFeatures");

            migrationBuilder.DropColumn(
                name: "StudentTestNote",
                table: "SystemFeatures");

            migrationBuilder.DropColumn(
                name: "StudentTestStatus",
                table: "SystemFeatures");

            migrationBuilder.DropColumn(
                name: "StudentTestedAt",
                table: "SystemFeatures");
        }
    }
}
