using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddManuscriptSections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ManuscriptSections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CapstoneGroupId = table.Column<int>(type: "int", nullable: false),
                    SectionKey = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    WordCount = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedById = table.Column<string>(type: "nvarchar(450)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManuscriptSections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManuscriptSections_AspNetUsers_UpdatedById",
                        column: x => x.UpdatedById,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ManuscriptSections_CapstoneGroups_CapstoneGroupId",
                        column: x => x.CapstoneGroupId,
                        principalTable: "CapstoneGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptSections_CapstoneGroupId_SectionKey",
                table: "ManuscriptSections",
                columns: new[] { "CapstoneGroupId", "SectionKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptSections_UpdatedById",
                table: "ManuscriptSections",
                column: "UpdatedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManuscriptSections");
        }
    }
}
