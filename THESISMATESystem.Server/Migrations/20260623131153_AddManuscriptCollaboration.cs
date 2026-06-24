using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddManuscriptCollaboration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "YjsState",
                table: "ManuscriptSections",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ManuscriptLocked",
                table: "CapstoneGroups",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ManuscriptRevision",
                table: "CapstoneGroups",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "ManuscriptFinalizationVotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CapstoneGroupId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false),
                    VotedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManuscriptFinalizationVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManuscriptFinalizationVotes_AspNetUsers_UserId",
                        column: x => x.UserId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ManuscriptFinalizationVotes_CapstoneGroups_CapstoneGroupId",
                        column: x => x.CapstoneGroupId,
                        principalTable: "CapstoneGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ManuscriptSectionComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CapstoneGroupId = table.Column<int>(type: "int", nullable: false),
                    SectionKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false),
                    AuthorId = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManuscriptSectionComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManuscriptSectionComments_AspNetUsers_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ManuscriptSectionComments_CapstoneGroups_CapstoneGroupId",
                        column: x => x.CapstoneGroupId,
                        principalTable: "CapstoneGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ManuscriptSnapshots",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CapstoneGroupId = table.Column<int>(type: "int", nullable: false),
                    Revision = table.Column<int>(type: "int", nullable: false),
                    SnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SnapshotAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ManuscriptSnapshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ManuscriptSnapshots_CapstoneGroups_CapstoneGroupId",
                        column: x => x.CapstoneGroupId,
                        principalTable: "CapstoneGroups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptFinalizationVotes_CapstoneGroupId_UserId_Revision",
                table: "ManuscriptFinalizationVotes",
                columns: new[] { "CapstoneGroupId", "UserId", "Revision" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptFinalizationVotes_UserId",
                table: "ManuscriptFinalizationVotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptSectionComments_AuthorId",
                table: "ManuscriptSectionComments",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptSectionComments_CapstoneGroupId",
                table: "ManuscriptSectionComments",
                column: "CapstoneGroupId");

            migrationBuilder.CreateIndex(
                name: "IX_ManuscriptSnapshots_CapstoneGroupId",
                table: "ManuscriptSnapshots",
                column: "CapstoneGroupId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ManuscriptFinalizationVotes");

            migrationBuilder.DropTable(
                name: "ManuscriptSectionComments");

            migrationBuilder.DropTable(
                name: "ManuscriptSnapshots");

            migrationBuilder.DropColumn(
                name: "YjsState",
                table: "ManuscriptSections");

            migrationBuilder.DropColumn(
                name: "ManuscriptLocked",
                table: "CapstoneGroups");

            migrationBuilder.DropColumn(
                name: "ManuscriptRevision",
                table: "CapstoneGroups");
        }
    }
}
