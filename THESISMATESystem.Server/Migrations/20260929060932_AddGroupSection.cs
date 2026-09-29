using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace THESISMATESystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupSection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SectionId",
                table: "CapstoneGroups",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_CapstoneGroups_SectionId",
                table: "CapstoneGroups",
                column: "SectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_CapstoneGroups_Sections_SectionId",
                table: "CapstoneGroups",
                column: "SectionId",
                principalTable: "Sections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Existing groups take the block their members belong to (members share one block).
            migrationBuilder.Sql("""
                UPDATE g SET g.SectionId = m.SectionId
                FROM CapstoneGroups g
                CROSS APPLY (
                    SELECT TOP 1 u.SectionId
                    FROM GroupMembers gm JOIN AspNetUsers u ON u.Id = gm.UserId
                    WHERE gm.CapstoneGroupId = g.Id AND u.SectionId IS NOT NULL
                ) m
                WHERE g.SectionId IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CapstoneGroups_Sections_SectionId",
                table: "CapstoneGroups");

            migrationBuilder.DropIndex(
                name: "IX_CapstoneGroups_SectionId",
                table: "CapstoneGroups");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "CapstoneGroups");
        }
    }
}
