import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTableIfNotExists('email_verifications', table => {
    table.bigIncrements('id');
    table.integer('user_id').notNullable();
    table.string('token', 255).unique().notNullable();
    table.timestamp('expires_at').notNullable();
    table.boolean('used').defaultTo(false);
    table.timestamp('used_at');
    table.string('ip_address', 45);
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    table.index(['token']);
    table.index(['user_id']);
  });
}


export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('verificacoes_email');
}
