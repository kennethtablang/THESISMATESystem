using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class MultipleScreenshots_AutoComments_DeleteComment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StudentScreenshotPath",
                table: "SystemFeatures");

            migrationBuilder.AddColumn<bool>(
                name: "IsSystemComment",
                table: "SystemFeatureComments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "SystemFeatureScreenshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SystemFeatureId = table.Column<int>(type: "int", nullable: false),
                    Path = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SystemFeatureScreenshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SystemFeatureScreenshots_SystemFeatures_SystemFeatureId",
                        column: x => x.SystemFeatureId,
                        principalTable: "SystemFeatures",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SystemFeatureScreenshots_SystemFeatureId",
                table: "SystemFeatureScreenshots",
                column: "SystemFeatureId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SystemFeatureScreenshots");

            migrationBuilder.DropColumn(
                name: "IsSystemComment",
                table: "SystemFeatureComments");

            migrationBuilder.AddColumn<string>(
                name: "StudentScreenshotPath",
                table: "SystemFeatures",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
