import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('login_attempts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().nullable(); // Null se usuário não existe
    table.string('email', 255).notNullable();
    table.string('ip_address', 45).notNullable();
    table.string('user_agent', 500).nullable();
    table.boolean('success').notNullable();
    table.string('failure_reason', 255).nullable();
    table.timestamp('attempted_at').notNullable().defaultTo(knex.fn.now());

    // Foreign key (nullable)
    table
      .foreign('user_id')
      .references('id')
      .inTable('users')
      .onDelete('SET NULL');

    // Indexes
    table.index(['user_id']);
    table.index(['email']);
    table.index(['ip_address']);
    table.index(['attempted_at']);
    table.index(['success']);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTableIfExists('login_attempts');
}
