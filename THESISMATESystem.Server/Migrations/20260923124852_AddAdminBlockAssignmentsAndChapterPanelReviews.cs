using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminBlockAssignmentsAndChapterPanelReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChapterPanelReviews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ChapterSubmissionId = table.Column<int>(type: "int", nullable: false),
                    PanelistId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Approved = table.Column<bool>(type: "bit", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DecidedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChapterPanelReviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChapterPanelReviews_AspNetUsers_PanelistId",
                        column: x => x.PanelistId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChapterPanelReviews_ChapterSubmissions_ChapterSubmissionId",
                        column: x => x.ChapterSubmissionId,
                        principalTable: "ChapterSubmissions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SectionAdminAssignments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    AdminId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SectionAdminAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SectionAdminAssignments_AspNetUsers_AdminId",
                        column: x => x.AdminId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SectionAdminAssignments_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChapterPanelReviews_ChapterSubmissionId_PanelistId",
                table: "ChapterPanelReviews",
                columns: new[] { "ChapterSubmissionId", "PanelistId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChapterPanelReviews_PanelistId",
                table: "ChapterPanelReviews",
                column: "PanelistId");

            migrationBuilder.CreateIndex(
                name: "IX_SectionAdminAssignments_AdminId",
                table: "SectionAdminAssignments",
                column: "AdminId");

            migrationBuilder.CreateIndex(
                name: "IX_SectionAdminAssignments_SectionId_AdminId",
                table: "SectionAdminAssignments",
                columns: new[] { "SectionId", "AdminId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChapterPanelReviews");

            migrationBuilder.DropTable(
                name: "SectionAdminAssignments");
        }
    }
}
