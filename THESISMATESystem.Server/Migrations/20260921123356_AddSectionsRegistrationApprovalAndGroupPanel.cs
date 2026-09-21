using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddSectionsRegistrationApprovalAndGroupPanel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SectionId",
                table: "Classrooms",
                type: "int",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "StudentId",
                table: "AspNetUsers",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RegistrationExpiresAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RegistrationStatus",
                table: "AspNetUsers",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReviewedAt",
                table: "AspNetUsers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedById",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SectionId",
                table: "AspNetUsers",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GroupPanelMembers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CapstoneGroupId = table.Column<int>(type: "int", nullable: false),
                    PanelistId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    IsChair = table.Column<bool>(type: "bit", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GroupPanelMembers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GroupPanelMembers_AspNetUsers_PanelistId",
                        column: x => x.PanelistId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_GroupPanelMembers_CapstoneGroups_CapstoneGroupId",
                        column: x => x.CapstoneGroupId,
                        principalTable: "CapstoneGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Sections",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AcademicYear = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sections", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "SectionRosterEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SectionId = table.Column<int>(type: "int", nullable: false),
                    StudentNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SectionRosterEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SectionRosterEntries_Sections_SectionId",
                        column: x => x.SectionId,
                        principalTable: "Sections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Classrooms_SectionId",
                table: "Classrooms",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_SectionId",
                table: "AspNetUsers",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_StudentId",
                table: "AspNetUsers",
                column: "StudentId",
                unique: true,
                filter: "[StudentId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_GroupPanelMembers_CapstoneGroupId_PanelistId",
                table: "GroupPanelMembers",
                columns: new[] { "CapstoneGroupId", "PanelistId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GroupPanelMembers_PanelistId",
                table: "GroupPanelMembers",
                column: "PanelistId");

            migrationBuilder.CreateIndex(
                name: "IX_SectionRosterEntries_SectionId",
                table: "SectionRosterEntries",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_SectionRosterEntries_StudentNumber",
                table: "SectionRosterEntries",
                column: "StudentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sections_Name_AcademicYear",
                table: "Sections",
                columns: new[] { "Name", "AcademicYear" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AspNetUsers_Sections_SectionId",
                table: "AspNetUsers",
                column: "SectionId",
                principalTable: "Sections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Classrooms_Sections_SectionId",
                table: "Classrooms",
                column: "SectionId",
                principalTable: "Sections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AspNetUsers_Sections_SectionId",
                table: "AspNetUsers");

            migrationBuilder.DropForeignKey(
                name: "FK_Classrooms_Sections_SectionId",
                table: "Classrooms");

            migrationBuilder.DropTable(
                name: "GroupPanelMembers");

            migrationBuilder.DropTable(
                name: "SectionRosterEntries");

            migrationBuilder.DropTable(
                name: "Sections");

            migrationBuilder.DropIndex(
                name: "IX_Classrooms_SectionId",
                table: "Classrooms");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_SectionId",
                table: "AspNetUsers");

            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_StudentId",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "Classrooms");

            migrationBuilder.DropColumn(
                name: "RegistrationExpiresAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "RegistrationStatus",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "ReviewedById",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "AspNetUsers");

            migrationBuilder.AlterColumn<string>(
                name: "StudentId",
                table: "AspNetUsers",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);
        }
    }
}
