import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable("organizations", (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("slug").notNullable();
    table.text("description").nullable();
    table.string("avatar_url").nullable();
    table.integer("owner_id").notNullable().references("users.id");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("organization_members", (table) => {
    table.increments("id").primary();
    table.integer("organization_id").notNullable().references("organizations.id");
    table.integer("user_id").notNullable().references("users.id");
    table.timestamps(true, true);
  });
}


export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists("organization_members");
  await knex.schema.dropTableIfExists("organizations");
}

